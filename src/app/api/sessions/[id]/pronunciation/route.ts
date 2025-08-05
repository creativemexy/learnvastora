import { NextRequest, NextResponse } from 'next/server';

interface Word {
  word: string;
  confidence?: number;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Read the audio file from the request
    const buffer = Buffer.from(await req.arrayBuffer());
    const audioBytes = buffer.toString('base64');

    // For now, return a mock response since Google Speech API is not set up
    // In a real implementation, you would use the Google Speech client here
    
    // Mock words for demonstration
    const words: Word[] = [
      { word: 'hello', confidence: 0.9 },
      { word: 'world', confidence: 0.8 },
      { word: 'test', confidence: 0.7 }
    ];
    
    const lowConfidenceWords = words.filter((w: Word) => (w.confidence || 1) < 0.85).map((w: Word) => w.word);

    return NextResponse.json({
      feedback: lowConfidenceWords.length
        ? `Check your pronunciation for: ${lowConfidenceWords.join(', ')}`
        : 'Great pronunciation!',
      words,
    });
  } catch (error) {
    console.error('Pronunciation analysis error:', error);
    return NextResponse.json({ error: 'Failed to analyze pronunciation' }, { status: 500 });
  }
}