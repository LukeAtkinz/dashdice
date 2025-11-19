import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  // Initialize OpenAI client with API key (only when route is called)
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || ''
  });
  try {
    // Get audio file from form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string | null;
    const matchId = formData.get('matchId') as string;
    const playerId = formData.get('playerId') as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    if (!matchId || !playerId) {
      return NextResponse.json(
        { error: 'Missing matchId or playerId' },
        { status: 400 }
      );
    }

    console.log(`🎙️ Transcribing audio for match ${matchId}, player ${playerId}`);
    console.log(`📊 Audio file size: ${audioFile.size} bytes`);

    const startTime = Date.now();

    // Transcribe audio using Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: language || undefined, // Optional language hint (ISO 639-1 format, e.g., 'en')
      response_format: 'verbose_json' // Get detailed info including detected language
    });

    const duration = (Date.now() - startTime) / 1000;

    console.log(`✅ Transcription complete in ${duration.toFixed(2)}s`);
    console.log(`📝 Transcribed text: "${transcription.text}"`);
    console.log(`🌐 Detected language: ${transcription.language || 'unknown'}`);

    return NextResponse.json({
      text: transcription.text,
      detectedLanguage: transcription.language || language || 'en',
      duration: transcription.duration || 0,
      processingTime: duration
    });

  } catch (error: any) {
    console.error('❌ Transcription error:', error);
    
    // Handle specific OpenAI errors
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'Invalid OpenAI API key' },
        { status: 500 }
      );
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
}

// Configure API route
export const config = {
  api: {
    bodyParser: false // Disable body parser for file uploads
  }
};
