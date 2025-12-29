import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import readline from 'readline';

// Add stealth plugin to avoid bot detection
chromium.use(StealthPlugin());

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Store active browser sessions
const sessions = new Map();

// Helper to wait for user input (for captcha solving)
function waitForEnter(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

// Get or create a browser session
async function getSession(sessionId = 'default') {
  if (!sessions.has(sessionId)) {
    console.log(`🚀 Launching new browser session: ${sessionId}`);
    
    const browser = await chromium.launch({
      headless: false, // Show browser so you can see what's happening & solve captchas
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
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    // Add extra stealth measures
    await context.addInitScript(() => {
      // Override webdriver property
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      
      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });

    const page = await context.newPage();
    
    sessions.set(sessionId, { browser, context, page });
  }
  
  return sessions.get(sessionId);
}

// Take screenshot and return as base64
async function takeScreenshot(page) {
  try {
    const buffer = await page.screenshot({ type: 'png', fullPage: false });
    return buffer.toString('base64');
  } catch (error) {
    console.error('Screenshot error:', error.message);
    return null;
  }
}

// Execute a single step
async function executeStep(step, sessionId) {
  const { page } = await getSession(sessionId);
  const result = { success: true, message: '', screenshot: null };

  try {
    console.log(`⚡ Executing: ${step.action} - ${step.description || ''}`);

    switch (step.action) {
      case 'navigate':
        await page.goto(step.value, { waitUntil: 'domcontentloaded', timeout: 30000 });
        result.message = `Navigated to ${step.value}`;
        break;

      case 'click':
        await page.waitForSelector(step.target, { timeout: 10000 });
        await page.click(step.target);
        result.message = `Clicked on ${step.target}`;
        break;

      case 'type':
        await page.waitForSelector(step.target, { timeout: 10000 });
        await page.fill(step.target, step.value);
        result.message = `Typed "${step.value}" into ${step.target}`;
        break;

      case 'wait':
        await page.waitForTimeout(parseInt(step.value) || 1000);
        result.message = `Waited ${step.value}ms`;
        break;

      case 'scroll':
        await page.evaluate(() => window.scrollBy(0, 500));
        result.message = 'Scrolled down';
        break;

      case 'screenshot':
        result.message = `Screenshot: ${step.value || 'captured'}`;
        break;

      case 'press_key':
        await page.keyboard.press(step.value);
        result.message = `Pressed ${step.value} key`;
        break;

      case 'wait_for_captcha':
        console.log('\n🔐 CAPTCHA DETECTED!');
        console.log('👆 Please solve the captcha in the browser window.');
        console.log('⏳ Press ENTER here when done...\n');
        await waitForEnter('');
        result.message = 'Captcha solved by user';
        break;

      default:
        result.message = `Unknown action: ${step.action}`;
        result.success = false;
    }

    // Always take a screenshot after each action
    result.screenshot = await takeScreenshot(page);

  } catch (error) {
    result.success = false;
    result.message = error.message;
    result.screenshot = await takeScreenshot(page);
    console.error(`❌ Step failed: ${error.message}`);
  }

  return result;
}

// API Routes

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'BT4 AI Local Server is running',
    sessions: sessions.size 
  });
});

// Execute a step
app.post('/execute', async (req, res) => {
  try {
    const { step, sessionId = 'default' } = req.body;
    
    if (!step || !step.action) {
      return res.status(400).json({ success: false, message: 'Invalid step' });
    }

    const result = await executeStep(step, sessionId);
    res.json(result);
    
  } catch (error) {
    console.error('Execute error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Take screenshot
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

// Close all sessions
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
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🤖 BT4 AI Local Server                                  ║
║   ─────────────────────────────────────────────────────   ║
║   Running on: http://localhost:${PORT}                     ║
║                                                           ║
║   Features:                                               ║
║   ✅ Stealth mode (anti-bot detection)                    ║
║   ✅ Screenshots after each action                        ║
║   ✅ Manual captcha solving (pause & wait)                ║
║   ✅ Visible browser window                               ║
║                                                           ║
║   Endpoints:                                              ║
║   POST /execute    - Run automation step                  ║
║   POST /screenshot - Take screenshot                      ║
║   POST /close      - Close browser session                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
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
