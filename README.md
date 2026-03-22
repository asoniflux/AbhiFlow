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

# IMPORTANT: After installing Homebrew, add it to your PATH:
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"

# Node.js 18+ and SoX (audio recording engine)
brew install node sox

# Xcode Command Line Tools — needed to compile native modules + Swift helper
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

Then set it up — pick one option:

```bash
# Option A: Create a .env file
cp .env.example .env
nano .env
# Change the line to: GROQ_API_KEY=gsk_your_actual_key_here
# Save: Ctrl+O, Enter, Ctrl+X
```

**Or** skip this — the app will ask for your key on first launch via the onboarding wizard.

---

## Step 3 — Configure macOS for Fn Key

**This step is critical!** By default, macOS uses the Fn/Globe key to open the emoji picker or system dictation, which blocks AbhiFlow from seeing it.

### Disable the default Fn key action:

1. Open **System Settings**
2. Go to **Keyboard**
3. Find **"Press 🌐 key to"**
4. Change it to **"Do Nothing"**

> If you skip this, AbhiFlow will fall back to **Cmd+Shift+Space** toggle mode instead.

---

## Step 4 — Build the Fn Key Helper

```bash
bash scripts/build-fn-monitor.sh
```

This compiles a tiny Swift binary (`helpers/fn-monitor`) that monitors the Fn key press/release via macOS native APIs. It's what enables the "hold to dictate" experience.

---

## Step 5 — Run in Development Mode

Open **two terminal tabs** (both must be in the AbhiFlow directory):

**Tab 1 — Start the React UI dev server:**
```bash
cd ~/AbhiFlow
npx vite --config vite.config.js
```
> This starts Vite on `http://localhost:5173`

**Tab 2 — Start Electron:**
```bash
cd ~/AbhiFlow
npm run dev
```

The app appears as a **menu bar icon** in the top-right of your screen. There is no Dock icon — AbhiFlow is a menu bar app.

---

## Step 6 — Grant macOS Permissions

On first launch, macOS needs three permissions:

### 1. Microphone Access
A system dialog will appear automatically. Click **"Allow"**.

### 2. Accessibility Access (manual)
This lets AbhiFlow simulate `Cmd+V` to paste text into other apps.

1. Open **System Settings → Privacy & Security → Accessibility**
2. Click the **+** button
3. Navigate to and add the **Electron** app (in dev mode it's at `node_modules/electron/dist/Electron.app`)
4. Make sure the toggle is **on**

### 3. Input Monitoring (manual — for Fn key)
This lets the Fn key monitor detect key presses system-wide.

1. Open **System Settings → Privacy & Security → Input Monitoring**
2. Click the **+** button
3. Add **Terminal** (for dev mode) or **AbhiFlow** (for the built app)
4. Make sure the toggle is **on**

> Without these permissions: Microphone = no audio capture, Accessibility = text won't paste, Input Monitoring = Fn key won't trigger dictation.

---

## How to Use

### Hold-to-Dictate (Fn Key — Default)

1. Place your cursor where you want text (any app — VS Code, Slack, Chrome, Notes, etc.)
2. **Hold** the **Fn** (Globe) key on your keyboard
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

## Build & Install as a macOS App

To create a proper `.app` with a DMG installer you can drag into Applications:

### Step 1 — Build everything

```bash
cd ~/AbhiFlow
npm run build
```

This runs four steps automatically:
1. **`build:icons`** — generates app icon (.icns) and tray icons
2. **`build:fn-monitor`** — compiles the Swift Fn key helper
3. **`build:renderer`** — builds the React UI with Vite
4. **`build:app`** — packages everything into a macOS `.dmg` via electron-builder

> No Apple Developer account is needed — the build is unsigned (fine for personal use).

### Step 2 — Find the output

Output is in the **`dist/`** folder:
```
dist/
├── AbhiFlow-1.0.0-arm64.dmg          # Drag-to-Applications installer
├── AbhiFlow-1.0.0-arm64-mac.zip      # Zip for sharing
└── mac-arm64/
    └── AbhiFlow.app                   # The app itself
```

### Step 3 — Install

1. Open **`dist/AbhiFlow-1.0.0-arm64.dmg`**
2. Drag **AbhiFlow** into **Applications**
3. Close the DMG window

### Step 4 — First launch (bypass Gatekeeper)

Since the app is unsigned, macOS will block it on first open:

1. Open **Applications** in Finder
2. **Right-click** (or Ctrl+click) on **AbhiFlow** → click **"Open"**
3. Click **"Open"** in the dialog that appears
4. Alternatively: **System Settings → Privacy & Security** → scroll down → click **"Open Anyway"**

> You only need to do this once. After that, the app opens normally.

### Step 5 — Grant permissions for the built app

Same as Step 6 above, but now add **AbhiFlow** (from Applications) instead of Electron/Terminal:

1. **System Settings → Privacy & Security → Microphone** → enable AbhiFlow
2. **System Settings → Privacy & Security → Accessibility** → add AbhiFlow
3. **System Settings → Privacy & Security → Input Monitoring** → add AbhiFlow
4. **System Settings → Keyboard → Press 🌐 key to** → "Do Nothing"

### Step 6 — Launch and configure

1. Open **AbhiFlow** from Applications / Spotlight / Launchpad
2. The onboarding wizard will ask for your **Groq API key**
3. Paste your key (from [console.groq.com/keys](https://console.groq.com/keys))
4. Grant permissions when prompted
5. **Hold Fn → speak → release → text appears at cursor!**

The app runs in the **menu bar** (top-right of screen). There's no Dock icon.
Right-click the menu bar icon to access Settings or Quit.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Fn key opens emoji picker | **System Settings → Keyboard → Press 🌐 key to → "Do Nothing"** |
| Fn key not triggering dictation | Grant **Input Monitoring** permission + compile helper: `bash scripts/build-fn-monitor.sh` |
| `sox` not found / recording fails | `brew install sox` |
| Text not pasting into apps | Grant **Accessibility** permission in System Settings |
| "Invalid API key" error | Get a fresh key at [console.groq.com/keys](https://console.groq.com/keys) |
| No menu bar icon visible | Check Activity Monitor for "AbhiFlow" or "Electron" process |
| Recording ignored (too short) | Speak for at least 0.5 seconds |
| App blocked by Gatekeeper | Right-click → Open, or System Settings → Privacy & Security → Open Anyway |
| `npm install` fails on native modules | `xcode-select --install`, then `npm install` again |
| `brew: command not found` | Run: `eval "$(/opt/homebrew/bin/brew shellenv)"` then retry |
| `npm run dev` says "no package.json" | Make sure you `cd AbhiFlow` first |
| Build fails "icon not found" | Run `bash scripts/generate-icons.sh` first |

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
├── db/migrations/       # SQLite schema
├── scripts/             # Build scripts
│   ├── build-fn-monitor.sh    # Compile Swift helper
│   └── generate-icons.sh      # Generate app + tray icons
├── assets/              # App icons (generated)
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
cd AbhiFlow && npm install

# 3. Get free API key from https://console.groq.com/keys
cp .env.example .env
nano .env   # paste your gsk_... key, save with Ctrl+O

# 4. IMPORTANT: Disable default Fn key behavior
#    System Settings → Keyboard → Press 🌐 key to → "Do Nothing"

# 5. Build Fn key helper
bash scripts/build-fn-monitor.sh

# 6. Run in dev mode
npx vite --config vite.config.js &   # Terminal tab 1 (UI server)
npm run dev                           # Terminal tab 2 (Electron)

# 7. Grant permissions: Microphone + Accessibility + Input Monitoring
# 8. Hold Fn → speak → release → text appears at cursor!

# --- OR build a proper app ---
npm run build                         # Creates dist/AbhiFlow-1.0.0-arm64.dmg
open dist/AbhiFlow-1.0.0-arm64.dmg   # Install by dragging to Applications
```

---

## License

MIT
