import SwiftUI

struct ContentView: View {
    var body: some View {
        WebView()
            .ignoresSafeArea()          // full-screen, like a real kids' app
            .statusBarHidden(true)
    }
}

#Preview {
    ContentView()
}
