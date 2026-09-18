// Extract one frame from an MP4 as PNG and print the asset's duration: mp4-frame <in.mp4> <frameIndex> <fps> <out.png>
import AVFoundation
import AppKit
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let gen = AVAssetImageGenerator(asset: asset)
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
let t = CMTime(value: CMTimeValue(Int(a[2])!), timescale: CMTimeScale(Int(a[3])!))
let cg = try gen.copyCGImage(at: t, actualTime: nil)
let rep = NSBitmapImageRep(cgImage: cg)
try rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[4]))
print("{\"duration\":\(CMTimeGetSeconds(asset.duration)),\"w\":\(cg.width),\"h\":\(cg.height)}")
