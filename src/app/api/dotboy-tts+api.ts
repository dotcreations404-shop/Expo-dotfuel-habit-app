/**
 * DotBoy TTS — text-to-speech via ElevenLabs.
 * Replaces: webapp/netlify/functions/dotboy-tts.js
 */
export function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(request: Request) {
  const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_KEY) {
    return Response.json({ error: 'TTS not configured' }, { status: 503 });
  }

  try {
    const { text } = await request.json();
    if (!text) return Response.json({ error: 'No text provided' }, { status: 400 });

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
      return Response.json({ error: 'TTS unavailable' }, { status: 502 });
    }

    const audioBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);
    // Convert to base64 via Web API
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Audio = btoa(binary);

    return Response.json({ audio: base64Audio, mimeType: 'audio/mpeg' });
  } catch (err: any) {
    console.error('dotboy-tts error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
