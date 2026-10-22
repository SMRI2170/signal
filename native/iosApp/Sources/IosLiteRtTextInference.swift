import Foundation
import LiteRTLM
import SignalShared

private actor LiteRtModelSession {
  private var engine: Engine?

  func generate(_ prompt: String) async throws -> String {
    let modelURL = try Self.modelURL()
    let loadedEngine: Engine
    if let engine {
      loadedEngine = engine
    } else {
      let cacheURL = modelURL.deletingLastPathComponent().appendingPathComponent("cache", isDirectory: true)
      try FileManager.default.createDirectory(at: cacheURL, withIntermediateDirectories: true)
      let config = try EngineConfig(
        modelPath: modelURL.path,
        backend: .cpu(),
        maxNumTokens: 1_280,
        cacheDir: cacheURL.path
      )
      let newEngine = Engine(engineConfig: config)
      try await newEngine.initialize()
      engine = newEngine
      loadedEngine = newEngine
    }

    let sampler = try SamplerConfig(topK: 1, topP: 1, temperature: 0, seed: 0)
    let conversationConfig = ConversationConfig(
      samplerConfig: sampler,
      thinkingConfig: ThinkingConfig(enableThinking: false, thinkingTokenBudget: 0)
    )
    let conversation = try await loadedEngine.createConversation(with: conversationConfig)
    let response = try await conversation.sendMessage(Message(prompt), maxOutputTokens: 384)
    return response.toString
  }

  private static func modelURL() throws -> URL {
    let support = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let url = support.appendingPathComponent(
      "ondevice/qwen3_0.6b_nothink_q4_block32_ekv1280.litertlm"
    )
    var isDirectory: ObjCBool = false
    guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory), !isDirectory.boolValue,
          let attributes = try? FileManager.default.attributesOfItem(atPath: url.path),
          (attributes[.size] as? NSNumber)?.int64Value == 347_251_840
    else {
      throw OnDeviceModelUnavailable()
    }
    return url
  }
}

private struct OnDeviceModelUnavailable: LocalizedError {
  var errorDescription: String? { "ON_DEVICE_MODEL_NOT_READY" }
}

final class IosLiteRtTextInference: NSObject, OnDeviceInferenceBridge {
  private let session = LiteRtModelSession()

  func generate(prompt: String, completion: @escaping (String?, String?) -> Void) {
    Task.detached(priority: .userInitiated) { [session] in
      do {
        completion(try await session.generate(prompt), nil)
      } catch let error as OnDeviceModelUnavailable {
        completion(nil, error.localizedDescription)
      } catch {
        // Do not log the prompt, the error payload, or any generated content.
        completion(nil, "ON_DEVICE_INFERENCE_FAILED")
      }
    }
  }
}
