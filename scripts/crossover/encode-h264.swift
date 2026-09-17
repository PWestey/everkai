// Encode numbered PNG frames (f0000.png ...) to an H.264 MP4 with AVFoundation.
// Usage: encode-h264 <framesDir> <out.mp4> <fps> [bitrate]
// No ffmpeg with H.264 exists on this Mac; this matches the existing idle clips (1024x1536, 12 fps).
import AVFoundation
import AppKit
import CoreVideo

let args = CommandLine.arguments
guard args.count >= 4 else { fputs("usage: encode-h264 frames out.mp4 fps [bitrate]\n", stderr); exit(2) }
let dir = URL(fileURLWithPath: args[1]), out = URL(fileURLWithPath: args[2])
let fps = Int32(args[3])!
let bitrate = args.count > 4 ? Int(args[4])! : 2_000_000
let files = try FileManager.default.contentsOfDirectory(atPath: dir.path).filter { $0.hasPrefix("f") && $0.hasSuffix(".png") }.sorted()
guard let firstImage = NSImage(contentsOf: dir.appendingPathComponent(files[0])),
      let firstCG = firstImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fputs("cannot read first frame\n", stderr); exit(1) }
let width = firstCG.width, height = firstCG.height
try? FileManager.default.removeItem(at: out)
let writer = try AVAssetWriter(outputURL: out, fileType: .mp4)
let settings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
                                    AVVideoMaxKeyFrameIntervalKey: Int(fps) * 2, AVVideoAllowFrameReorderingKey: false,
                                    AVVideoExpectedSourceFrameRateKey: Int(fps)],
  AVVideoColorPropertiesKey: [AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2, AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2, AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height])
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)
let space = CGColorSpace(name: CGColorSpace.sRGB)!
for (i, name) in files.enumerated() {
  guard let img = NSImage(contentsOf: dir.appendingPathComponent(name)), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fputs("bad frame \(name)\n", stderr); exit(1) }
  while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.005) }
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  let buffer = pb!
  CVPixelBufferLockBaseAddress(buffer, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: space, bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
  ctx.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
  CVPixelBufferUnlockBaseAddress(buffer, [])
  CVBufferSetAttachment(buffer, kCVImageBufferColorPrimariesKey, kCVImageBufferColorPrimaries_ITU_R_709_2, .shouldPropagate)
  adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps))
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.endSession(atSourceTime: CMTime(value: CMTimeValue(files.count), timescale: fps))
writer.finishWriting { done.signal() }
done.wait()
if writer.status != .completed { fputs("failed: \(String(describing: writer.error))\n", stderr); exit(1) }
let bytes = (try FileManager.default.attributesOfItem(atPath: out.path)[.size] as! NSNumber).intValue
print("{\"frames\":\(files.count),\"fps\":\(fps),\"width\":\(width),\"height\":\(height),\"bytes\":\(bytes)}")
