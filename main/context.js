const { execSync } = require('child_process');

const APP_CONTEXT_MAP = {
  Slack: 'casual',
  Discord: 'casual',
  Messages: 'casual',
  WhatsApp: 'casual',
  Telegram: 'casual',
  Mail: 'email',
  Outlook: 'email',
  Spark: 'email',
  Code: 'code',
  'Visual Studio Code': 'code',
  Terminal: 'code',
  iTerm2: 'code',
  Cursor: 'code',
  Warp: 'code',
  Claude: 'ai-prompt',
  ChatGPT: 'ai-prompt',
};

function getActiveApp() {
  try {
    const app = execSync(
      `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`,
      { timeout: 2000 }
    )
      .toString()
      .trim();
    return app;
  } catch {
    return 'Unknown';
  }
}

function getContext() {
  const app = getActiveApp();

  // Check direct match
  if (APP_CONTEXT_MAP[app]) {
    return { app, context: APP_CONTEXT_MAP[app] };
  }

  // Check partial match (e.g., "Google Chrome" contains "Chrome")
  for (const [name, context] of Object.entries(APP_CONTEXT_MAP)) {
    if (app.toLowerCase().includes(name.toLowerCase())) {
      return { app, context };
    }
  }

  return { app, context: 'default' };
}

module.exports = { getActiveApp, getContext };
