const Groq = require('groq-sdk');
const { toFile } = require('groq-sdk/uploads');
const { getSetting } = require('./database');
const { getAllWords } = require('./dictionary');

let groqClient = null;

function getClient() {
  const apiKey = getSetting('groq_api_key') || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key not configured. Please set it in Settings.');
  }
  if (!groqClient || groqClient.apiKey !== apiKey) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

async function transcribe(wavBuffer) {
  const client = getClient();

  // Get dictionary words for context hints
  const dictionaryWords = getAllWords().map((w) => w.word);
  const prompt = dictionaryWords.length > 0 ? dictionaryWords.join(', ') : undefined;

  const file = await toFile(wavBuffer, 'recording.wav', { type: 'audio/wav' });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3-turbo',
    language: getSetting('language') || 'en',
    prompt,
    response_format: 'text',
  });

  const text = typeof transcription === 'string' ? transcription : transcription.text;
  console.log(`[AbhiFlow] Transcription: "${text}"`);
  return text;
}

function resetClient() {
  groqClient = null;
}

module.exports = { transcribe, resetClient };
