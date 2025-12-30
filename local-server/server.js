import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import readline from 'readline';

// Add stealth plugin for anti-detection
chromium.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Store active browser sessions
const sessions = new Map();

// Human-like random delay
const humanDelay = (min = 100, max = 300) => 
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

// Human-like typing
async function humanType(page, selector, text) {
  const element = await page.$(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  
  await element.click();
  await humanDelay(100, 200);
  
  // Clear existing content
  await page.evaluate(el => el.value = '', element);
  
  // Type character by character with human-like delays
  for (const char of text) {
    await page.keyboard.type(char, { delay: 30 + Math.random() * 70 });
    // Occasionally pause like a human thinking
    if (Math.random() < 0.1) await humanDelay(100, 300);
  }
}

// Human-like click with mouse movement
async function humanClick(page, selector) {
  try {
    // Try direct selector first
    const element = await page.$(selector);
    if (element) {
      const box = await element.boundingBox();
      if (box) {
        // Add random offset for more human-like behavior
        const x = box.x + box.width / 2 + (Math.random() - 0.5) * 6;
        const y = box.y + box.height / 2 + (Math.random() - 0.5) * 6;
        
        // Move mouse with steps (human-like)
        await page.mouse.move(x, y, { steps: 5 + Math.floor(Math.random() * 5) });
        await humanDelay(50, 150);
        await page.mouse.click(x, y);
        return;
      }
    }
    
    // Fallback to regular click
    await page.click(selector, { timeout: 5000 });
  } catch (e) {
    // Try text-based selector
    if (!selector.startsWith('text=')) {
      await page.click(`text="${selector}"`, { timeout: 5000 });
    } else {
      throw e;
    }
  }
}

// Wait for user to solve captcha
function waitForCaptcha() {
  return new Promise((resolve) => {
    console.log('\n' + '='.repeat(50));
    console.log('🔐 CAPTCHA DETECTED!');
    console.log('👆 Solve the captcha in the browser window');
    console.log('⏳ Press ENTER here when done...');
    console.log('='.repeat(50) + '\n');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    rl.question('', () => {
      rl.close();
      console.log('✅ Continuing automation...\n');
      resolve();
    });
  });
}

// Get or create browser session
async function getSession(sessionId = 'default') {
  if (sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }
  
  console.log(`\n🚀 Launching new browser session: ${sessionId}`);
  
  const browser = await chromium.launch({
    headless: false, // VISIBLE browser - required for captcha solving
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1366,768',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    geolocation: { latitude: 40.7128, longitude: -74.0060 },
    permissions: ['geolocation'],
  });

  // Inject anti-detection scripts
  await context.addInitScript(() => {
    // Hide webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    
    // Fake plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ],
    });
    
    // Fake languages
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    
    // Fake hardware concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    
    // Fake device memory
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    
    // Override chrome runtime
    window.chrome = { runtime: {} };
    
    // Fix permissions query
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
    
    // Override getClientRects for consistent behavior
    const originalGetClientRects = Element.prototype.getClientRects;
    Element.prototype.getClientRects = function() {
      const rects = originalGetClientRects.call(this);
      return rects;
    };
  });

  const page = await context.newPage();
  
  // Set extra headers
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
  });
  
  sessions.set(sessionId, { browser, context, page });
  console.log('✅ Browser session ready\n');
  
  return sessions.get(sessionId);
}

// Take screenshot
async function takeScreenshot(page) {
  try {
    const buffer = await page.screenshot({ type: 'png', fullPage: false });
    return buffer.toString('base64');
  } catch (error) {
    console.error('Screenshot error:', error.message);
    return null;
  }
}

// Find element with multiple selector strategies
async function findElement(page, target) {
  const strategies = [
    target,
    `[placeholder*="${target}" i]`,
    `[name*="${target}" i]`,
    `[aria-label*="${target}" i]`,
    `[id*="${target}" i]`,
    `text="${target}"`,
    `button:has-text("${target}")`,
    `a:has-text("${target}")`,
    `input[type="${target}"]`,
  ];
  
  for (const selector of strategies) {
    try {
      const el = await page.$(selector);
      if (el) return selector;
    } catch {}
  }
  
  return target;
}

// Execute a single step - REAL EXECUTION, NO SIMULATION
async function executeStep(step, sessionId) {
  const { page } = await getSession(sessionId);
  const result = { success: true, message: '', screenshot: null };

  try {
    console.log(`⚡ ${step.action.toUpperCase()}: ${step.description || step.target || step.value || ''}`);

    switch (step.action) {
      case 'navigate':
        await page.goto(step.value, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await humanDelay(500, 1000);
        result.message = `Navigated to ${step.value}`;
        break;

      case 'click':
        const clickSelector = await findElement(page, step.target);
        await page.waitForSelector(clickSelector, { timeout: 10000 });
        await humanClick(page, clickSelector);
        await humanDelay(200, 500);
        result.message = `Clicked: ${step.target}`;
        break;

      case 'type':
        const typeSelector = await findElement(page, step.target);
        await page.waitForSelector(typeSelector, { timeout: 10000 });
        await humanType(page, typeSelector, step.value);
        await humanDelay(100, 300);
        result.message = `Typed "${step.value}" into ${step.target}`;
        break;

      case 'wait':
        const waitTime = parseInt(step.value) || 1000;
        await page.waitForTimeout(waitTime);
        result.message = `Waited ${waitTime}ms`;
        break;

      case 'scroll':
        if (step.value === 'down') {
          await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
        } else if (step.value === 'up') {
          await page.evaluate(() => window.scrollBy({ top: -400, behavior: 'smooth' }));
        } else {
          await page.evaluate((px) => window.scrollBy({ top: parseInt(px), behavior: 'smooth' }), step.value);
        }
        await humanDelay(300, 500);
        result.message = `Scrolled ${step.value}`;
        break;

      case 'screenshot':
        result.message = step.description || 'Screenshot captured';
        break;

      case 'press_key':
        await page.keyboard.press(step.value);
        await humanDelay(100, 200);
        result.message = `Pressed ${step.value}`;
        break;

      case 'select':
        await page.selectOption(step.target, step.value);
        await humanDelay(100, 200);
        result.message = `Selected "${step.value}"`;
        break;

      case 'wait_for_captcha':
        await waitForCaptcha();
        result.message = 'Captcha solved by user';
        break;

      default:
        result.success = false;
        result.message = `Unknown action: ${step.action}`;
    }

    // Always capture screenshot after action
    result.screenshot = await takeScreenshot(page);
    console.log(`   ✅ ${result.message}`);

  } catch (error) {
    result.success = false;
    result.message = error.message;
    result.screenshot = await takeScreenshot(page);
    console.error(`   ❌ Error: ${error.message}`);
  }

  return result;
}

// API Routes

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'BT4 AI Local Automation Server',
    sessions: sessions.size,
    capabilities: [
      'Real browser automation (Playwright)',
      'Stealth mode (anti-detection)',
      'Human-like interactions',
      'Manual captcha solving',
      'Screenshot feedback'
    ]
  });
});

// Execute step
app.post('/execute', async (req, res) => {
  try {
    const { step, sessionId = 'default' } = req.body;
    
    if (!step || !step.action) {
      return res.status(400).json({ success: false, message: 'Invalid step: missing action' });
    }

    const result = await executeStep(step, sessionId);
    res.json(result);
    
  } catch (error) {
    console.error('Execute error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Screenshot
app.post('/screenshot', async (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;
    const { page } = await getSession(sessionId);
    const screenshot = await takeScreenshot(page);
    res.json({ success: true, screenshot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get page state
app.post('/state', async (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;
    const { page } = await getSession(sessionId);
    
    const state = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      forms: Array.from(document.forms).map(f => ({
        inputs: Array.from(f.querySelectorAll('input, select, textarea')).map(i => ({
          tag: i.tagName.toLowerCase(),
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
        }))
      })),
    }));
    
    const screenshot = await takeScreenshot(page);
    res.json({ success: true, state, screenshot });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Close session
app.post('/close', async (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;
    
    if (sessions.has(sessionId)) {
      const { browser } = sessions.get(sessionId);
      await browser.close();
      sessions.delete(sessionId);
      console.log(`🔒 Closed session: ${sessionId}`);
    }
    
    res.json({ success: true, message: 'Session closed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Close all
app.post('/close-all', async (req, res) => {
  try {
    for (const [id, { browser }] of sessions) {
      await browser.close();
      console.log(`🔒 Closed session: ${id}`);
    }
    sessions.clear();
    res.json({ success: true, message: 'All sessions closed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🤖 BT4 AI - Local Automation Server                        ║
║   ──────────────────────────────────────────────────────     ║
║   URL: http://localhost:${PORT}                                 ║
║                                                              ║
║   ✅ REAL browser automation (no simulation)                 ║
║   ✅ Stealth mode enabled                                    ║
║   ✅ Human-like typing & clicking                            ║
║   ✅ Manual captcha solving (pause & wait)                   ║
║   ✅ Screenshot feedback after every action                  ║
║                                                              ║
║   Endpoints:                                                 ║
║   POST /execute    - Run automation step                     ║
║   POST /screenshot - Capture current page                    ║
║   POST /state      - Get page info and forms                 ║
║   POST /close      - Close browser session                   ║
║   POST /close-all  - Close all sessions                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  for (const [, { browser }] of sessions) {
    await browser.close();
  }
  process.exit(0);
});
