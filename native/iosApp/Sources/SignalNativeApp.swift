import SwiftUI
import SignalShared

@main
struct SignalNativeApp: App {
  var body: some Scene {
    WindowGroup {
      SignalComposeView()
        .ignoresSafeArea()
    }
  }
}

private struct SignalComposeView: UIViewControllerRepresentable {
  func makeUIViewController(context: Context) -> UIViewController {
    let apiBaseURL = Bundle.main.object(forInfoDictionaryKey: "SIGNALApiBaseURL") as? String
    return MainViewControllerKt.MainViewController(apiBaseUrl: apiBaseURL)
  }

  func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
