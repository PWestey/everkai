// Measures where the character art sits inside each portrait still and idle clip.
// Run through scripts/measure-art-bounds.mjs, which lists the assets and writes lib/art-bounds-data.json.
//
// Every render is a 2:3 frame. Some fill it with scenery; others draw the art inside a flat viewer
// surround (a single colour), often small or off-centre. For a flat surround the art bounds are exact:
// every pixel that differs from the surround colour. A clip's bounds are the union over 24 frames, so an
// idle motion is never cropped. A frame whose four corners disagree has no surround; its art fills it.
//
// Also reports, per clip, the fraction of pixels that change across those 24 frames. A clip whose value is
// 0 is a frozen render: every frame is the same picture.
//
// Usage: measure-art-bounds <assets dir> <relative path>...   (one JSON line per path on stdout)
import AVFoundation
import CoreGraphics
import Foundation
import ImageIO

let W=160, H=240, FRAMES=24, CORNER_TOLERANCE=12, ART_THRESHOLD=18, MOTION_THRESHOLD=40
let space=CGColorSpaceCreateDeviceRGB()

func draw(_ image: CGImage) -> [UInt8] {
  var buf=[UInt8](repeating:0,count:W*H*4)
  buf.withUnsafeMutableBytes { p in
    let ctx=CGContext(data:p.baseAddress,width:W,height:H,bitsPerComponent:8,bytesPerRow:W*4,space:space,bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.interpolationQuality = .medium
    ctx.draw(image,in:CGRect(x:0,y:0,width:W,height:H))
  }
  return buf
}
func corner(_ b:[UInt8], _ x0:Int, _ y0:Int) -> [Int] {
  var s=[0,0,0]
  for y in y0..<y0+3 { for x in x0..<x0+3 { for c in 0..<3 { s[c]+=Int(b[(y*W+x)*4+c]) } } }
  return s.map { $0/9 }
}

let root=CommandLine.arguments[1]
for rel in CommandLine.arguments.dropFirst(2) {
  let url=URL(fileURLWithPath: root+"/"+rel)
  var frames:[[UInt8]]=[]
  let isClip=rel.hasSuffix(".mp4")
  if isClip {
    let asset=AVURLAsset(url:url), gen=AVAssetImageGenerator(asset:asset)
    gen.appliesPreferredTrackTransform=true
    gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
    let duration=CMTimeGetSeconds(asset.duration)
    for i in 0..<FRAMES {
      if let image=try? gen.copyCGImage(at:CMTime(seconds:duration*Double(i)/Double(FRAMES),preferredTimescale:600),actualTime:nil) { frames.append(draw(image)) }
    }
  } else if let source=CGImageSourceCreateWithURL(url as CFURL,nil), let image=CGImageSourceCreateImageAtIndex(source,0,nil) {
    frames.append(draw(image))
  }
  guard let first=frames.first else { print("{\"path\":\"\(rel)\",\"error\":\"unreadable\"}"); continue }
  let corners=[corner(first,1,1),corner(first,W-4,1),corner(first,1,H-4),corner(first,W-4,H-4)]
  let flat=corners.allSatisfy { c in (0..<3).allSatisfy { abs(c[$0]-corners[0][$0])<=CORNER_TOLERANCE } }
  var bounds="[0,0,1,1]", surround="null"
  if flat {
    let bg=(0..<3).map { c in corners.map { $0[c] }.reduce(0,+)/4 }
    var mask=[Bool](repeating:false,count:W*H)
    for f in frames { for o in 0..<(W*H) where !mask[o] { for c in 0..<3 where abs(Int(f[o*4+c])-bg[c])>ART_THRESHOLD { mask[o]=true; break } } }
    var x0=W,x1 = -1,y0=H,y1 = -1
    for y in 0..<H { var n=0; for x in 0..<W where mask[y*W+x] { n+=1 }; if n>=2 { y0=min(y0,y); y1=max(y1,y) } }
    for x in 0..<W { var n=0; for y in 0..<H where mask[y*W+x] { n+=1 }; if n>=2 { x0=min(x0,x); x1=max(x1,x) } }
    if x1>=x0 && y1>=y0 {
      let r={ (v:Double) in String(format:"%.4g",v) }
      bounds="[\(r(Double(x0)/Double(W))),\(r(Double(y0)/Double(H))),\(r(Double(x1+1)/Double(W))),\(r(Double(y1+1)/Double(H)))]"
      surround=String(format:"\"#%02x%02x%02x\"",bg[0],bg[1],bg[2])
    }
  }
  var motion="null"
  if isClip && frames.count>1 {
    var lo=[UInt8](repeating:255,count:W*H*3), hi=[UInt8](repeating:0,count:W*H*3)
    for f in frames { for o in 0..<(W*H) { for c in 0..<3 { let v=f[o*4+c]; lo[o*3+c]=min(lo[o*3+c],v); hi[o*3+c]=max(hi[o*3+c],v) } } }
    var moving=0
    for o in 0..<(W*H) { if (0..<3).contains(where: { Int(hi[o*3+$0])-Int(lo[o*3+$0])>MOTION_THRESHOLD }) { moving+=1 } }
    motion=String(format:"%.4f",Double(moving)/Double(W*H))
  }
  print("{\"path\":\"\(rel)\",\"bounds\":\(bounds),\"surround\":\(surround),\"motion\":\(motion),\"frames\":\(frames.count)}")
  fflush(stdout)
}
