exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_KEY) {
    // Return a signal that TTS is unavailable — client will skip voice gracefully
    return { statusCode: 503, body: JSON.stringify({ error: 'TTS not configured' }) };
  }

  try {
    const { text } = JSON.parse(event.body);
    if (!text) return { statusCode: 400, body: JSON.stringify({ error: 'No text provided' }) };

    // Truncate to 500 chars to keep latency low and costs reasonable
    const speakText = text.slice(0, 500);

    // Voice: "Adam" — deep, warm, energetic. Great for a trainer.
    // Voice ID: pNInz6obpgDQGcFmaJgB
    // Alternative: "Antoni" (ErXwobaYiN019PkySvjV) — smoother, more conversational
    const VOICE_ID = 'pNInz6obpgDQGcFmaJgB';

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: speakText,
        model_id: 'eleven_turbo_v2_5',   // Lowest latency, highest quality
        voice_settings: {
          stability: 0.4,          // Slightly varied — sounds natural, not robotic
          similarity_boost: 0.85,  // Stay true to the voice character
          style: 0.3,              // Moderate expressiveness
          use_speaker_boost: true  // Cleaner audio
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error:', response.status, err);
      return { statusCode: 502, body: JSON.stringify({ error: 'TTS unavailable' }) };
    }

    // Return audio as base64 so the client can play it directly
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: base64Audio, mimeType: 'audio/mpeg' })
    };

  } catch (err) {
    console.error('dotboy-tts error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
