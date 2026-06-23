import type { VercelRequest, VercelResponse } from '@vercel/node';

const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_KEY) {
    return res.status(503).json({ error: 'TTS not configured' });
  }

  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ error: 'No text provided' });

    const speakText = text.slice(0, 500);
    const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam — deep, warm, energetic

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: speakText,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.85,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      console.error('ElevenLabs error:', response.status);
      return res.status(502).json({ error: 'TTS unavailable' });
    }

    const audioBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);
    
    // Convert to base64 via Buffer
    const base64Audio = Buffer.from(bytes).toString('base64');

    return res.status(200).json({ audio: base64Audio, mimeType: 'audio/mpeg' });
  } catch (err: any) {
    console.error('dotboy-tts error:', err);
    return res.status(500).json({ error: err.message });
  }
}
