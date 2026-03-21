const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const { getSetting } = require('./database');

let groqClient = null;

function getClient() {
  const apiKey = getSetting('groq_api_key') || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key not configured.');
  }
  if (!groqClient || groqClient.apiKey !== apiKey) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

function loadPrompt(context) {
  const promptMap = {
    casual: 'cleanup-slack.txt',
    email: 'cleanup-email.txt',
    code: 'cleanup-code.txt',
    'ai-prompt': 'cleanup-ai-prompt.txt',
    default: 'cleanup-default.txt',
  };

  const filename = promptMap[context] || promptMap.default;
  const promptPath = path.join(__dirname, '..', 'prompts', filename);

  try {
    return fs.readFileSync(promptPath, 'utf-8').trim();
  } catch {
    // Fallback inline prompt
    return `You are a text cleanup assistant for voice dictation. Take raw speech-to-text and produce clean text.
Rules:
1. Remove filler words: um, uh, like, you know, basically, actually, so yeah, right, okay so, I mean
2. Fix punctuation and capitalization
3. Course corrections: "no wait"/"I mean"/"actually let me rephrase" → keep ONLY the corrected version
4. Voice commands: "new line" → \\n, "new paragraph" → \\n\\n, "bullet point" → "• "
5. Punctuation: "period" → ., "comma" → ,, "question mark" → ?, "exclamation mark" → !
6. Do NOT add content, do NOT paraphrase. Keep user's exact words minus fillers.
7. Return ONLY the cleaned text. No quotes, no explanation, no wrapper.`;
  }
}

async function cleanupText(rawText, context = 'default') {
  if (!rawText || rawText.trim().length === 0) {
    return '';
  }

  const client = getClient();
  const systemPrompt = loadPrompt(context);

  const chat = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: rawText },
    ],
    temperature: 0.1,
    max_tokens: 2000,
  });

  const cleaned = chat.choices[0].message.content.trim();
  console.log(`[AbhiFlow] Cleaned text: "${cleaned}"`);
  return cleaned;
}

function resetClient() {
  groqClient = null;
}

module.exports = { cleanupText, resetClient };
