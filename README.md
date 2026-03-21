# AbhiFlow

**System-wide voice dictation for macOS.** Hold the Fn key from any app, speak, and clean text gets pasted at your cursor.

Built by Abhishek Soni.

---

## Prerequisites

You need a Mac with Apple Silicon (M1/M2/M3/M4) running **macOS 13 (Ventura) or later**.

Install these first:

```bash
# Homebrew (if you don't have it)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js 18+
brew install node

# SoX — audio recording engine used by AbhiFlow
brew install sox

# Xcode Command Line Tools — needed to compile the Swift Fn key helper
xcode-select --install
```

---

## Step 1 — Clone & Install

```bash
git clone https://github.com/asoniflux/AbhiFlow.git
cd AbhiFlow
npm install
```

> `npm install` automatically runs `electron-rebuild` to compile native modules (`better-sqlite3`, `@jitsi/robotjs`) for Electron's Node version. This may take a minute.

---

## Step 2 — Get a Free API Key

AbhiFlow uses **Groq** (free tier, no credit card required) which runs fully **open-source AI models**:

| Model | Task | License |
|-------|------|---------|
| Whisper Large v3 Turbo (by OpenAI) | Speech-to-text | MIT |
| Llama 3.3 70B (by Meta) | Text cleanup & commands | Llama 3.3 Community |

**To get your key:**

1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign up for free (Google/GitHub login works)
3. Click **"Create API Key"**
4. Copy the key (starts with `gsk_`)

Then set it up — pick one:

```bash
# Option A: Create a .env file
cp .env.example .env
# Edit .env and paste your key:
#   GROQ_API_KEY=gsk_your_actual_key_here
```

**Or** skip this — the app will ask for your key on first launch via the onboarding wizard.

---

## Step 3 — Build the Fn Key Helper

```bash
bash scripts/build-fn-monitor.sh
```

This compiles a tiny Swift binary (`helpers/fn-monitor`) that monitors the **Fn (Globe 🌐) key** press/release via macOS native APIs. It's what enables the "hold to dictate" experience.

> If you skip this step, the app falls back to **Cmd+Shift+Space** toggle mode (press once to start, press again to stop).

---

## Step 4 — Run in Development Mode

Open **two terminal tabs**:

**Tab 1 — Start the React UI dev server:**
```bash
npx vite --config vite.config.js
```
> This starts Vite on `http://localhost:5173`

**Tab 2 — Start Electron:**
```bash
npm run dev
```

The app appears as a **menu bar icon** in the top-right of your screen. There is no Dock icon — AbhiFlow is a menu bar app.

---

## Step 5 — Grant macOS Permissions

On first launch, macOS will ask for two permissions:

### 1. Microphone Access
A system dialog will appear automatically. Click **"Allow"**.

### 2. Accessibility Access (manual)
This lets AbhiFlow simulate `Cmd+V` to paste text into other apps.

1. Open **System Settings → Privacy & Security → Accessibility**
2. Click the **lock icon** at the bottom and authenticate
3. Click the **+** button
4. Navigate to and add the **Electron** (in dev) or **AbhiFlow** (if built) app
5. Make sure the toggle is **on**

> Without Accessibility access, dictation will work but text won't paste automatically.

---

## How to Use

### Hold-to-Dictate (Fn Key — Default)

1. Place your cursor where you want text (any app — VS Code, Slack, Chrome, Notes, etc.)
2. **Hold** the **Fn** (Globe 🌐) key on your keyboard
3. Speak naturally — a floating overlay appears showing a waveform
4. **Release** the Fn key
5. AbhiFlow transcribes your speech, cleans it up, and pastes it at your cursor

### Toggle Mode (Cmd+Shift+Space — Fallback)

If you prefer toggle mode, or the Fn helper isn't compiled:

1. Press **Cmd+Shift+Space** → recording starts
2. Speak
3. Press **Cmd+Shift+Space** again → recording stops, text is processed and pasted

You can switch between modes in **Settings → Dictation Trigger**.

### Command Mode

Use AbhiFlow to transform existing text with AI:

1. **Select** some text in any app
2. Hold **Fn** and say: *"command: make this more professional"*
   - Or: *"command: translate to Spanish"*
   - Or: *"hey abhiflow, summarize this"*
3. Release — the selected text is **replaced** with the AI-modified version

### Snippets

Create text shortcuts that expand when dictated:

1. Open Settings → **Snippets** tab
2. Add a snippet: trigger = `"my email"`, expansion = `"abhishek@example.com"`
3. Now dictate *"my email"* → `abhishek@example.com` gets pasted

---

## Context-Aware Formatting

AbhiFlow automatically detects which app you're in and adjusts the text style:

| App | Style |
|-----|-------|
| Slack, Discord, Messages, WhatsApp, Telegram | Casual, conversational |
| Mail, Outlook, Spark | Professional email |
| VS Code, Terminal, iTerm, Cursor, Warp | Technical, preserves code terms |
| ChatGPT, Claude | Well-structured prompt |
| Everything else | Clean, general-purpose |

---

## Settings

Click the **menu bar icon → Settings** to configure:

| Tab | What it does |
|-----|--------------|
| **General** | API key, dictation trigger (Fn/Cmd+Shift+Space), sound feedback, launch at login |
| **Dictionary** | Add custom words to improve transcription (names, jargon, acronyms) |
| **Snippets** | Text expansion shortcuts |
| **History** | Searchable log of all past dictations |
| **About** | App info and version |

---

## Build for Distribution

To create a distributable `.dmg` installer:

```bash
npm run build
```

This runs three steps automatically:
1. **`build:fn-monitor`** — compiles the Swift Fn key helper
2. **`build:renderer`** — builds the React UI with Vite
3. **`build:app`** — packages everything into a macOS `.dmg` via electron-builder

Output is in the **`dist/`** folder:
```
dist/
├── AbhiFlow-1.0.0-arm64.dmg          # Drag-to-Applications installer
└── AbhiFlow-1.0.0-arm64-mac.zip      # Zip for direct distribution
```

### Install the Built App

1. Open the `.dmg` file
2. Drag **AbhiFlow** into **Applications**
3. Open AbhiFlow from Applications / Spotlight / Launchpad
4. If macOS blocks it: **System Settings → Privacy & Security → "Open Anyway"**
5. Grant Microphone + Accessibility permissions (see Step 5)
6. Enter your Groq API key in the onboarding wizard
7. Start dictating!

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `sox` not found / recording fails | Run `brew install sox` |
| Fn key not working | Run `bash scripts/build-fn-monitor.sh` to compile the helper |
| Text not pasting into apps | Grant **Accessibility** permission in System Settings |
| "Invalid API key" error | Get a fresh key at [console.groq.com/keys](https://console.groq.com/keys) |
| No menu bar icon visible | Check Activity Monitor for "AbhiFlow" or "Electron" process |
| Recording ignored (too short) | Speak for at least 0.5 seconds |
| App blocked by Gatekeeper | System Settings → Privacy & Security → Open Anyway |
| `npm install` fails on native modules | Run `xcode-select --install`, then `npm install` again |
| Vite dev server port conflict | Kill other processes on port 5173 or change port in `vite.config.js` |

---

## Project Structure

```
AbhiFlow/
├── main/               # Electron main process
│   ├── index.js         #   App entry, recording pipeline
│   ├── hotkey.js        #   Fn key + globalShortcut handling
│   ├── recorder.js      #   Audio capture via SoX
│   ├── transcriber.js   #   Groq Whisper speech-to-text
│   ├── cleaner.js       #   Groq Llama text cleanup
│   ├── paster.js        #   Clipboard + Cmd+V paste
│   ├── commands.js      #   Voice command mode
│   ├── snippets.js      #   Text expansion
│   ├── context.js       #   Active app detection
│   ├── database.js      #   SQLite (better-sqlite3)
│   ├── tray.js          #   Menu bar icon
│   └── ipc-handlers.js  #   Renderer ↔ main IPC
├── renderer/            # React settings UI
│   ├── App.jsx          #   Tab-based settings app
│   ├── components/      #   Settings, Dictionary, Snippets, History, Onboarding
│   └── styles/          #   Tailwind globals
├── overlay/             # Floating recording indicator
│   └── index.html       #   Waveform + status display
├── helpers/             # Native macOS helpers
│   └── fn-monitor.swift #   Fn key press/release monitor
├── prompts/             # AI prompt templates
│   ├── cleanup-default.txt
│   ├── cleanup-email.txt
│   ├── cleanup-code.txt
│   ├── cleanup-slack.txt
│   ├── cleanup-ai-prompt.txt
│   └── command-mode.txt
├── db/migrations/       # SQLite schema
├── scripts/             # Build scripts
├── assets/              # App icons
├── package.json
├── vite.config.js
├── tailwind.config.js
├── electron-builder.yml
└── entitlements.mac.plist
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop framework | Electron |
| Settings UI | React + Vite + Tailwind CSS |
| Speech-to-text | Whisper Large v3 Turbo (via Groq API, free) |
| Text cleanup | Llama 3.3 70B (via Groq API, free) |
| Audio recording | SoX (via node-record-lpcm16) |
| Database | SQLite (via better-sqlite3) |
| Key automation | @jitsi/robotjs |
| Fn key detection | Swift + NSEvent (native macOS) |
| Packaging | electron-builder |

---

## Quick Start (TL;DR)

```bash
# 1. Install prerequisites
brew install node sox
xcode-select --install

# 2. Clone and install
git clone https://github.com/asoniflux/AbhiFlow.git
cd AbhiFlow
npm install

# 3. Get free API key from https://console.groq.com/keys
cp .env.example .env
# Edit .env → paste your gsk_... key

# 4. Build Fn key helper
bash scripts/build-fn-monitor.sh

# 5. Run
npx vite --config vite.config.js &   # Start UI dev server
npm run dev                           # Start Electron app

# 6. Grant Microphone + Accessibility permissions when prompted
# 7. Hold Fn → speak → release → text appears at cursor!
```

---

## License

MIT
