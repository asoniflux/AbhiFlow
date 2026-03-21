const Groq = require('groq-sdk');
const { clipboard } = require('electron');
const { getSetting } = require('./database');
const fs = require('fs');
const path = require('path');

let robotjs = null;
try {
  robotjs = require('@jitsi/robotjs');
} catch {
  console.warn('[AbhiFlow] robotjs not available, command mode limited');
}

const COMMAND_TRIGGERS = ['command:', 'command ', 'hey abhiflow'];

let groqClient = null;

function getClient() {
  const apiKey = getSetting('groq_api_key') || process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('Groq API key not configured.');
  if (!groqClient || groqClient.apiKey !== apiKey) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

function isCommand(text) {
  const lower = text.trim().toLowerCase();
  return COMMAND_TRIGGERS.some((trigger) => lower.startsWith(trigger));
}

function extractCommand(text) {
  const lower = text.trim().toLowerCase();
  for (const trigger of COMMAND_TRIGGERS) {
    if (lower.startsWith(trigger)) {
      return text.trim().substring(trigger.length).trim();
    }
  }
  return text;
}

async function getSelectedText() {
  // Save current clipboard
  const originalClipboard = clipboard.readText();

  // Simulate Cmd+C to copy selection
  if (robotjs) {
    robotjs.keyTap('c', 'command');
  }

  // Wait for clipboard to update
  await new Promise((resolve) => setTimeout(resolve, 300));

  const selectedText = clipboard.readText();

  // Restore original clipboard
  clipboard.writeText(originalClipboard);

  // If clipboard didn't change, nothing was selected
  if (selectedText === originalClipboard) {
    return '';
  }

  return selectedText;
}

function loadCommandPrompt() {
  const promptPath = path.join(__dirname, '..', 'prompts', 'command-mode.txt');
  try {
    return fs.readFileSync(promptPath, 'utf-8').trim();
  } catch {
    return `You are a text editing assistant. The user has selected some text and given a voice command.
Apply the command to the selected text and return ONLY the modified text.
No explanation, no quotes, no wrapper.`;
  }
}

async function executeCommand(transcript) {
  const command = extractCommand(transcript);
  const selectedText = await getSelectedText();

  if (!selectedText) {
    console.log('[AbhiFlow] No text selected for command mode');
    return null;
  }

  const client = getClient();
  const systemPrompt = loadCommandPrompt();

  const userMessage = `Selected text:\n---\n${selectedText}\n---\n\nCommand: ${command}`;

  const chat = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 4000,
  });

  const result = chat.choices[0].message.content.trim();
  console.log(`[AbhiFlow] Command result: "${result.substring(0, 100)}..."`);
  return result;
}

module.exports = { isCommand, executeCommand };
