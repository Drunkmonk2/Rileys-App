import SwiftUI
import WebKit

/// Hosts the bundled web app in a WKWebView and wires up the native speech
/// bridge. The web files live in the app bundle under "Web/" (a folder
/// reference), so everything works fully offline.
struct WebView: UIViewRepresentable {

    func makeCoordinator() -> SpeechBridge { SpeechBridge() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []   // let Flamingo talk

        // Expose `window.webkit.messageHandlers.nativeSpeech` to the web app.
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "nativeSpeech")
        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .clear
        context.coordinator.webView = webView

        if let url = Bundle.main.url(forResource: "index",
                                     withExtension: "html",
                                     subdirectory: "Web") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
