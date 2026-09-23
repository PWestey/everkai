// Render a GLB idle loop to transparent PNG frames with three.js in headless Chrome.
// node render.mjs --glb ../out/x.glb --out ../out/x-frames --style msf|swgoh [--fps 12] [--seconds 3] [--width 1024 --height 1536]
//   [--yaw 0] [--elevation 4] [--fov 18] [--height-fraction 0.74] [--vertical-offset 0] [--still-time 0]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => { if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]]); return acc; }, []));
const here = path.dirname(fileURLToPath(import.meta.url));
const glb = path.resolve(args.glb), out = path.resolve(args.out);
fs.mkdirSync(out, {recursive: true});
const types = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary'};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = url === '/model.glb' ? glb : path.join(here, url);
  fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': types[path.extname(file)] || 'application/octet-stream'}); res.end(data); });
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const port = server.address().port;
const width = +(args.width || 1024), height = +(args.height || 1536);
const browser = await puppeteer.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--use-angle=metal', '--enable-webgl', '--ignore-gpu-blocklist', `--window-size=${width},${height}`]});
try {
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.setViewport({width, height, deviceScaleFactor: 1});
  await page.goto(`http://127.0.0.1:${port}/page.html`);
  await page.waitForFunction('window.__ready === true');
  const info = await page.evaluate((o) => window.setup(o), {glb: '/model.glb', width, height, style: args.style || 'msf', yaw: +(args.yaw || 0),
    elevation: +(args.elevation ?? 4), fov: +(args.fov || 18), heightFraction: +(args['height-fraction'] || 0.74), verticalOffset: +(args['vertical-offset'] || 0), saberSign: +(args['saber-sign'] || 1), sabers: !args['no-sabers']});
  const fps = +(args.fps || 12);
  const loop = info.duration || 0;
  // Whole loops only, so the MP4 repeats seamlessly: frames = round(duration*fps), each at i*duration/frames.
  let frames = args['still-time'] !== undefined ? 1 : Math.max(1, Math.round(loop * fps));
  const times = args['still-time'] !== undefined ? [+args['still-time']] : Array.from({length: frames}, (_, i) => loop * i / frames);
  const started = Date.now();
  for (let i = 0; i < times.length; i++) {
    const url = await page.evaluate((t) => window.frame(t), times[i]);
    fs.writeFileSync(path.join(out, `f${String(i).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  }
  const meta = {...info, fps, frames: times.length, times, width, height, renderMs: Date.now() - started, style: args.style};
  fs.writeFileSync(path.join(out, 'render.json'), JSON.stringify(meta, null, 1));
  console.log(JSON.stringify({duration: info.duration, frames: times.length, clip: info.clip, tracks: info.tracks, bounds: info.bounds, renderMs: meta.renderMs}));
} finally {
  await browser.close();
  server.close();
}
