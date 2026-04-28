const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const categories = [
    { name: 'Dashboard', url: 'http://localhost:3000/' },
    { name: 'Devices', url: 'http://localhost:3000/devices' },
    { name: 'Employees', url: 'http://localhost:3000/employees' },
    { name: 'Logs', url: 'http://localhost:3000/logs' },
    { name: 'Setup', url: 'http://localhost:3000/setup' },
    { name: 'Simulate', url: 'http://localhost:3000/simulate' },
    { name: 'Speakers', url: 'http://localhost:3000/speakers' }
  ];

  const outputDir = 'C:\\Users\\nouma\\.gemini\\antigravity\\brain\\0a903cbe-3ed8-403b-ae4f-5d97701b1dd2\\artifacts';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const cat of categories) {
    console.log(`Navigating to ${cat.name}...`);
    try {
      await page.goto(cat.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await delay(1000);
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      });
      await delay(2000); // Give it extra time to render animations/data
      const filename = path.join(outputDir, `${cat.name.toLowerCase()}_light.png`);
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`Saved screenshot to ${filename}`);
    } catch (e) {
      console.error(`Failed to capture ${cat.name}:`, e.message);
    }
  }

  await browser.close();
})();
