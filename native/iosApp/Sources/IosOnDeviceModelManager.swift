import CryptoKit
import Foundation
import SignalShared

enum OnDeviceModelFiles {
  static let name = "qwen3_0.6b_nothink_q4_block32_ekv1280.litertlm"
  static let size: Int64 = 347_251_840
  static let sha256 = "2df6821ec12702dafd33915e7a1a1adc7c4b053f3672fd9555dfaf3a114c4139"
  static let url = URL(
    string: "https://huggingface.co/litert-community/Qwen3-0.6B-int4/resolve/6aa2daf8aba4aa456797fb8040b36a3948bcfda7/\(name)"
  )!

  static func installedURL() throws -> URL {
    let support = try FileManager.default.url(
      for: .applicationSupportDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    return support.appendingPathComponent("ondevice/\(name)")
  }

  static func isValid(_ fileURL: URL) -> Bool {
    guard let values = try? fileURL.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey]),
          values.isRegularFile == true,
          values.fileSize.map(Int64.init) == size,
          let handle = try? FileHandle(forReadingFrom: fileURL)
    else { return false }
    defer { try? handle.close() }

    var hasher = SHA256()
    do {
      while let chunk = try handle.read(upToCount: 1024 * 1024), !chunk.isEmpty {
        hasher.update(data: chunk)
      }
    } catch {
      return false
    }
    return hasher.finalize().map { String(format: "%02x", $0) }.joined() == sha256
  }
}

private struct SendableModelStatusCompletion: @unchecked Sendable {
  let callback: (String?) -> Void
}

private final class ModelDownloadDelegate: NSObject, URLSessionDownloadDelegate, @unchecked Sendable {
  private let progress: (String?) -> Void
  private let completion: (String?) -> Void
  private var completed = false
  private var session: URLSession?

  init(progress: @escaping (String?) -> Void, completion: @escaping (String?) -> Void) {
    self.progress = progress
    self.completion = completion
    super.init()
  }

  func start() {
    do {
      let destination = try OnDeviceModelFiles.installedURL()
      let directory = destination.deletingLastPathComponent()
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      let capacity = try directory.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
      if let freeBytes = capacity.volumeAvailableCapacityForImportantUsage,
         freeBytes < OnDeviceModelFiles.size + 64 * 1024 * 1024 {
        completion("INSUFFICIENT_STORAGE")
        return
      }
    } catch {
      completion("MODEL_STORAGE_UNAVAILABLE")
      return
    }
    let configuration = URLSessionConfiguration.default
    configuration.waitsForConnectivity = true
    session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    session?.downloadTask(with: OnDeviceModelFiles.url).resume()
  }

  func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didWriteData bytesWritten: Int64,
    totalBytesWritten: Int64,
    totalBytesExpectedToWrite: Int64
  ) {
    let expected = totalBytesExpectedToWrite > 0 ? totalBytesExpectedToWrite : OnDeviceModelFiles.size
    progress(String(min(99, max(0, totalBytesWritten * 100 / expected))))
  }

  func urlSession(
    _ session: URLSession,
    downloadTask: URLSessionDownloadTask,
    didFinishDownloadingTo temporaryURL: URL
  ) {
    do {
      let destination = try OnDeviceModelFiles.installedURL()
      let directory = destination.deletingLastPathComponent()
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      let staged = directory.appendingPathComponent("\(OnDeviceModelFiles.name).partial")
      try? FileManager.default.removeItem(at: staged)
      try FileManager.default.moveItem(at: temporaryURL, to: staged)
      guard OnDeviceModelFiles.isValid(staged) else {
        try? FileManager.default.removeItem(at: staged)
        throw CocoaError(.fileReadCorruptFile)
      }
      try? FileManager.default.removeItem(at: destination)
      try FileManager.default.moveItem(at: staged, to: destination)
      finish(nil)
    } catch {
      finish("MODEL_INSTALL_FAILED")
    }
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    if error != nil { finish("MODEL_DOWNLOAD_FAILED") }
  }

  private func finish(_ error: String?) {
    guard !completed else { return }
    completed = true
    completion(error)
    session?.finishTasksAndInvalidate()
  }
}

final class IosOnDeviceModelManager: NSObject, OnDeviceModelManagerBridge {
  func inspect(completion: @escaping (String?) -> Void) {
    let callback = SendableModelStatusCompletion(callback: completion)
    DispatchQueue.global(qos: .utility).async {
      let ready = (try? OnDeviceModelFiles.installedURL()).map(OnDeviceModelFiles.isValid) ?? false
      callback.callback(ready ? "READY" : "MISSING")
    }
  }

  func download(progress: @escaping (String?) -> Void, completion: @escaping (String?) -> Void) {
    let delegate = ModelDownloadDelegate(progress: progress, completion: completion)
    delegate.start()
  }
}
