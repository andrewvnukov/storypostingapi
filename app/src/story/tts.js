import fs from 'node:fs/promises';

/**
 * Text to speech. Provider is chosen with TTS_PROVIDER; both options need the
 * matching API key in .env. Nothing is sent anywhere until the user presses Generate.
 */
export const VOICES = {
  openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  elevenlabs: ['Rachel', 'Adam', 'Antoni', 'Bella', 'Josh'],
};

export async function synthesize({ text, voice, speed = 1.0, outFile }) {
  const provider = process.env.TTS_PROVIDER || 'openai';
  const buffer = provider === 'elevenlabs'
    ? await elevenlabs(text, voice)
    : await openai(text, voice, speed);
  await fs.writeFile(outFile, buffer);
  return outFile;
}

async function openai(text, voice, speed) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set in .env');

  const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const res = await fetch(`${base}/audio/speech`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: voice || 'onyx',
      input: text,
      speed,
      response_format: 'mp3',
    }),
  });
  if (!res.ok) throw new Error(`Text-to-speech failed: ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function elevenlabs(text, voiceId) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set in .env');

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2' }),
  });
  if (!res.ok) throw new Error(`Text-to-speech failed: ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}
