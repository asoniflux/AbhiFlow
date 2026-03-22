const { execSync } = require('child_process');
const record = require('node-record-lpcm16');

let recording = null;
let audioChunks = [];
let startTime = null;

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BIT_DEPTH = 16;

// Fix PATH for packaged apps — Homebrew installs to /opt/homebrew/bin on Apple Silicon
// Electron packaged apps don't inherit the user's shell PATH
function fixPath() {
  const extraPaths = ['/opt/homebrew/bin', '/usr/local/bin', '/opt/local/bin'];
  const currentPath = process.env.PATH || '';
  for (const p of extraPaths) {
    if (!currentPath.includes(p)) {
      process.env.PATH = `${p}:${currentPath}`;
    }
  }
}
fixPath();

// Find sox binary path
function findSoxPath() {
  const candidates = ['/opt/homebrew/bin/sox', '/usr/local/bin/sox', '/usr/bin/sox'];
  const fs = require('fs');
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  // Try which
  try {
    return execSync('which sox', { timeout: 3000 }).toString().trim();
  } catch {
    return 'sox'; // fallback, let it fail with a clear error
  }
}

const SOX_PATH = findSoxPath();
console.log(`[AbhiFlow] Using sox at: ${SOX_PATH}`);

function startRecording() {
  audioChunks = [];
  startTime = Date.now();

  recording = record.record({
    sampleRate: SAMPLE_RATE,
    channels: CHANNELS,
    audioType: 'raw',
    recorder: 'sox',
    // Pass the full path to sox via the 'soxPath' option
    // node-record-lpcm16 doesn't support soxPath directly,
    // so we ensure PATH is set correctly above
  });

  const stream = recording.stream();

  stream.on('data', (chunk) => {
    audioChunks.push(chunk);
  });

  stream.on('error', (err) => {
    console.error('[AbhiFlow] Recording error:', err.message);
  });

  console.log('[AbhiFlow] Recording started');
  return stream;
}

function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!recording) {
      reject(new Error('No active recording'));
      return;
    }

    const duration = (Date.now() - startTime) / 1000;

    recording.stop();

    // Small delay to ensure all data is flushed
    setTimeout(() => {
      const pcmBuffer = Buffer.concat(audioChunks);
      const wavBuffer = addWavHeader(pcmBuffer);

      recording = null;
      audioChunks = [];
      startTime = null;

      console.log(`[AbhiFlow] Recording stopped. Duration: ${duration.toFixed(1)}s, Size: ${wavBuffer.length} bytes`);
      resolve({ wavBuffer, duration });
    }, 200);
  });
}

function addWavHeader(pcmBuffer) {
  const byteRate = SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8);
  const blockAlign = CHANNELS * (BIT_DEPTH / 8);
  const dataSize = pcmBuffer.length;
  const headerSize = 44;
  const fileSize = headerSize + dataSize;

  const header = Buffer.alloc(headerSize);

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize - 8, 4);
  header.write('WAVE', 8);

  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);          // chunk size
  header.writeUInt16LE(1, 20);           // PCM format
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BIT_DEPTH, 34);

  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function isRecording() {
  return recording !== null;
}

function getAudioLevel() {
  if (audioChunks.length === 0) return 0;
  const lastChunk = audioChunks[audioChunks.length - 1];
  if (!lastChunk || lastChunk.length < 2) return 0;

  let sum = 0;
  for (let i = 0; i < lastChunk.length - 1; i += 2) {
    const sample = lastChunk.readInt16LE(i);
    sum += Math.abs(sample);
  }
  const avg = sum / (lastChunk.length / 2);
  return Math.min(1, avg / 16384); // Normalize to 0-1
}

module.exports = { startRecording, stopRecording, isRecording, getAudioLevel };
