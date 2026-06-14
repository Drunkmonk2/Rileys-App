import Foundation
import WebKit
import Speech
import AVFoundation

/// Bridges the web app's microphone needs to Apple's Speech framework using
/// **on-device** recognition (private, offline, nothing leaves the phone).
///
/// Web side (js/speech.js) posts `nativeSpeech.postMessage("listen")`; when we
/// have a result we call back into `window.__nativeSpeechResult(text)`.
final class SpeechBridge: NSObject, WKScriptMessageHandler {

    weak var webView: WKWebView?

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var finished = false

    // MARK: - WKScriptMessageHandler
    func userContentController(_ controller: WKUserContentController,
                              didReceive message: WKScriptMessage) {
        guard message.name == "nativeSpeech" else { return }
        requestPermissionsAndListen()
    }

    // MARK: - Permissions
    private func requestPermissionsAndListen() {
        SFSpeechRecognizer.requestAuthorization { auth in
            guard auth == .authorized else { self.finish("") ; return }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async {
                    granted ? self.startListening() : self.finish("")
                }
            }
        }
    }

    // MARK: - Listening
    private func startListening() {
        guard let recognizer = recognizer, recognizer.isAvailable else { finish(""); return }
        finished = false
        task?.cancel(); task = nil

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .measurement,
                                    options: [.duckOthers, .defaultToSpeaker])
            try session.setActive(true, options: .notifyOthersOnDeactivation)
        } catch { finish(""); return }

        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        if recognizer.supportsOnDeviceRecognition {
            req.requiresOnDeviceRecognition = true     // keep Riley's voice private
        }
        request = req

        let input = audioEngine.inputNode
        var best = ""
        task = recognizer.recognitionTask(with: req) { [weak self] result, error in
            if let result = result { best = result.bestTranscription.formattedString }
            if error != nil || (result?.isFinal ?? false) { self?.stop(returning: best) }
        }

        let format = input.outputFormat(forBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            req.append(buffer)
        }
        audioEngine.prepare()
        do { try audioEngine.start() } catch { finish(""); return }

        // Toddlers answer quickly — wrap up after 5 seconds.
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
            self?.stop(returning: best)
        }
    }

    private func stop(returning text: String) {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        request?.endAudio()
        task?.cancel()
        request = nil; task = nil
        finish(text)
    }

    // MARK: - Callback into the web app
    private func finish(_ text: String) {
        guard !finished else { return }
        finished = true
        let safe = text
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
            .lowercased()
        DispatchQueue.main.async {
            self.webView?.evaluateJavaScript(
                "window.__nativeSpeechResult && window.__nativeSpeechResult('\(safe)')",
                completionHandler: nil)
        }
    }
}
