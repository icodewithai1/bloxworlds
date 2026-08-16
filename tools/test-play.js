const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium').default;

(async () => {
  const exePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    executablePath: exePath,
    args: [...chromium.args, '--enable-unsafe-swiftshader'],
    headless: 'shell',
    env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib' }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto('http://localhost:8080/obby.html', { waitUntil: 'networkidle2', timeout: 60000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 3000));

  // walk forward + jump for 4 seconds
  await page.keyboard.down('w');
  for (let i = 0; i < 4; i++) {
    await page.keyboard.down(' ');
    await new Promise(r => setTimeout(r, 300));
    await page.keyboard.up(' ');
    await new Promise(r => setTimeout(r, 700));
  }
  await page.keyboard.up('w');

  // read HUD to confirm the player actually moved / state updates
  const hud = await page.evaluate(() => document.getElementById('hud').innerText);
  console.log('HUD:', JSON.stringify(hud));

  // test chat
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 300));
  await page.keyboard.type('hello from the test!');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 500));
  const chat = await page.evaluate(() => document.getElementById('chatlog').innerText);
  console.log('CHAT:', JSON.stringify(chat));

  await page.screenshot({ path: '/home/user/bloxworlds/tools/shot-play.png' });
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
