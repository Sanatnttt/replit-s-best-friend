# Local Playwright Server

This folder contains the local browser automation server that runs on your computer.

## Prerequisites

1. **Node.js 18+** - Download from https://nodejs.org/
2. **Git** (optional) - For cloning the repo

## Quick Setup

1. **Open a terminal** in this folder (`local-server/`)

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright browsers:**
   ```bash
   npx playwright install chromium
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

   The server will run on `http://localhost:3001`

## What This Does

- Runs a local Express server that receives automation commands
- Uses Playwright with **stealth mode** (anti-bot detection)
- Takes screenshots and returns them to the web UI
- Pauses for you to solve captchas manually

## Features

- ✅ **Stealth Mode** - Uses puppeteer-extra-stealth techniques to avoid bot detection
- ✅ **Screenshots** - Returns base64 screenshots after each action
- ✅ **Captcha Pause** - When it detects a captcha, it pauses and waits for you to solve it
- ✅ **Error Handling** - Returns detailed error messages

## API Endpoints

### POST /execute
Execute a browser automation step.

```json
{
  "step": {
    "action": "navigate",
    "target": null,
    "value": "https://github.com"
  },
  "sessionId": "optional-session-id"
}
```

### POST /screenshot
Take a screenshot of the current page.

### POST /close
Close the browser session.

## Captcha Handling

When the automation encounters a captcha:
1. The server pauses execution
2. A browser window stays open
3. **You solve the captcha manually**
4. Press Enter in the terminal to continue
5. Automation resumes

## Troubleshooting

### "Browser not found"
Run: `npx playwright install chromium`

### "Permission denied"
On Mac/Linux: `chmod +x node_modules/.bin/*`

### Bot detected
Some sites are very strict. Try:
- Using a residential IP (your home internet)
- Adding more random delays
- Not running too many automations quickly
