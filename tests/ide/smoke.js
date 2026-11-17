// Browser smoke test for the IDE (headless Chromium via Playwright).
//
// Usage, from the repository root:
//   python ide/build_site.py _site && (cd _site && python -m http.server 8765 &)
//   npm install --prefix /tmp/weft-deps codemirror@5.65.16 pyodide@0.26.4
//   node tests/ide/smoke.js /tmp/ide.png /tmp/weft-deps/node_modules
//
// CDN requests are served from the local npm copies, so the test also runs
// where cdnjs/jsDelivr are blocked. Writes a desktop and a phone screenshot.
// Local smoke test: CDN requests are served from npm copies (the sandbox blocks the CDNs).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const NM = process.argv[3];
const MAP = [
  [/^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/codemirror\/5\.65\.16\/codemirror\.min\.css$/, 'codemirror/lib/codemirror.css'],
  [/^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/codemirror\/5\.65\.16\/codemirror\.min\.js$/, 'codemirror/lib/codemirror.js'],
  [/^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/codemirror\/5\.65\.16\/addon\/mode\/simple\.min\.js$/, 'codemirror/addon/mode/simple.js'],
  [/^https:\/\/cdn\.jsdelivr\.net\/pyodide\/v0\.26\.4\/full\/(.+)$/, 'pyodide/$1'],
];
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.zip': 'application/zip' };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1400, height: 820 } });
  await ctx.route(/^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)\//, async (route) => {
    const url = route.request().url();
    for (const [re, rel] of MAP) {
      if (re.test(url)) {
        const file = path.join(NM, url.replace(re, rel));
        if (fs.existsSync(file)) {
          return route.fulfill({ status: 200, body: fs.readFileSync(file),
            headers: { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'access-control-allow-origin': '*' } });
        }
      }
    }
    console.log('unmapped CDN request:', url);
    return route.abort();
  });
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', m => logs.push(m.type() + ': ' + m.text()));
  p.on('pageerror', e => logs.push('pageerror: ' + e.message));
  await p.goto('http://localhost:8765/');
  try {
    await p.waitForFunction(() => /^(Ready|Could not)/.test(document.getElementById('status').textContent), null, { timeout: 180000 });
  } catch (e) { logs.push('timeout waiting for Ready'); }
  await p.waitForTimeout(1500);
  console.log('status:', await p.textContent('#status'), '|', await p.textContent('#phase'));
  console.log('file entries:', await p.$$eval('#file-list li', ls => ls.map(l => l.textContent).join(', ')));
  console.log('tokens pane:', (await p.textContent('#tab-tokens')).trim());
  // Edit -> edited marker; then open a nested file.
  await p.click('.CodeMirror'); await p.keyboard.press('Control+End'); await p.keyboard.type('\n# edited');
  await p.waitForTimeout(800);
  console.log('edited marker present:', await p.$$eval('#file-list li .edited', e => e.length));
  await p.click('#file-list li[title="08_imports/main.weft"]');
  await p.waitForTimeout(800);
  console.log('open file:', await p.textContent('#file-name'));
  await p.click('button[data-tab=problems]');
  console.log('problems:', (await p.textContent('#tab-problems')).trim().slice(0, 200));
  await p.click('#file-list li[title="03_card_hover.weft"]');
  await p.waitForTimeout(500);
  await p.click('button[data-tab=preview]');
  await p.screenshot({ path: process.argv[2] });
  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 }); await m.goto('http://localhost:8765/'); await m.waitForFunction(() => document.getElementById('status').textContent === 'Ready', null, { timeout: 120000 }); await m.waitForTimeout(800); await m.screenshot({ path: process.argv[2].replace('.png', '-phone.png') }); console.log('phone overflow:', await m.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  console.log(logs.filter(l => !/Download the React DevTools/.test(l)).join('\n'));
  await b.close();
})();
