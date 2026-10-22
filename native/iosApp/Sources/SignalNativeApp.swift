import SwiftUI
import SignalShared

@main
struct SignalNativeApp: App {
  private let accountRepository: SignalAccountRepository
  private let onDeviceInferenceBridge: OnDeviceInferenceBridge?

  init() {
    let supabaseURL = Bundle.main.object(forInfoDictionaryKey: "SIGNALSupabaseURL") as? String ?? ""
    let publishableKey = Bundle.main.object(forInfoDictionaryKey: "SIGNALSupabasePublishableKey") as? String ?? ""
    let apiBaseURL = Bundle.main.object(forInfoDictionaryKey: "SIGNALApiBaseURL") as? String ?? ""
    accountRepository = MainViewControllerKt.createIosSignalAccountRepository(
      supabaseUrl: supabaseURL,
      publishableKey: publishableKey,
      apiBaseUrl: apiBaseURL
    )
    if ProcessInfo.processInfo.environment["SIGNAL_ON_DEVICE_AI"] == "1" {
      onDeviceInferenceBridge = IosLiteRtTextInference()
    } else {
      onDeviceInferenceBridge = nil
    }
  }

  var body: some Scene {
    WindowGroup {
      SignalComposeView(
        accountRepository: accountRepository,
        onDeviceInferenceBridge: onDeviceInferenceBridge
      )
        .ignoresSafeArea()
        .onOpenURL { url in
          accountRepository.receiveDeepLink(url: url.absoluteString)
        }
    }
  }
}

private struct SignalComposeView: UIViewControllerRepresentable {
  let accountRepository: SignalAccountRepository
  let onDeviceInferenceBridge: OnDeviceInferenceBridge?

  func makeUIViewController(context: Context) -> UIViewController {
    let apiBaseURL = Bundle.main.object(forInfoDictionaryKey: "SIGNALApiBaseURL") as? String
    return MainViewControllerKt.MainViewController(
      apiBaseUrl: apiBaseURL,
      accountRepository: accountRepository,
      onDeviceInferenceBridge: onDeviceInferenceBridge
    )
  }

  func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
