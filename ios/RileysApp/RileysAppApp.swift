import SwiftUI

/// Entry point for the native iOS wrapper around Riley's web app.
/// The whole UI is a full-screen WKWebView (see WebView.swift). The native
/// layer's job is to (a) bundle the web app for offline use and (b) provide
/// on-device, private speech recognition via SpeechBridge.swift.
@main
struct RileysAppApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
