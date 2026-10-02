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
    MainViewControllerKt.MainViewController()
  }

  func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
