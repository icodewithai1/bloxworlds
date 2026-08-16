const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium').default;

(async () => {
  const exePath = await chromium.executablePath();
  process.env.LD_LIBRARY_PATH = '/tmp/al2023/lib:' + (process.env.LD_LIBRARY_PATH || '');
  const browser = await puppeteer.launch({
    executablePath: exePath,
    args: [...chromium.args, '--enable-unsafe-swiftshader'],
    headless: 'shell',
    env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib' }
  });
  const url = process.argv[2] || 'http://localhost:8080/index.html';
  const page = await browser.newPage();
  const logs = [];
  page.on('console', m => logs.push(`[console.${m.type()}] ${m.text().slice(0, 300)}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${String(e.message).slice(0, 500)}`));
  page.on('requestfailed', r => logs.push(`[reqfail] ${r.url().slice(0,120)} -> ${r.failure()?.errorText}`));
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => logs.push('[goto] ' + e.message));
  await new Promise(r => setTimeout(r, parseInt(process.argv[3] || '6000')));
  const shot = process.argv[4] || '/home/user/bloxworlds/tools/shot.png';
  await page.screenshot({ path: shot });
  console.log(logs.join('\n') || '(no console output)');
  console.log('--- screenshot saved:', shot);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
