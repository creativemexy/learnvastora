import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { transcript } = await req.json();

  // 1. Summarize with OpenAI
  const summaryPrompt = `Summarize the following conversation in 2-3 sentences:\n\n${transcript}`;
  const grammarPrompt = `Check the following text for grammar mistakes and suggest corrections:\n\n${transcript}`;

  // OpenAI API call for summary
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful English teacher.' },
        { role: 'user', content: summaryPrompt }
      ],
      max_tokens: 150
    })
  });
  const openaiData = await openaiRes.json();
  const summary = openaiData.choices?.[0]?.message?.content || '';

  // OpenAI API call for grammar
  const grammarRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful English teacher.' },
        { role: 'user', content: grammarPrompt }
      ],
      max_tokens: 150
    })
  });
  const grammarData = await grammarRes.json();
  const grammar = grammarData.choices?.[0]?.message?.content || '';

  // Pronunciation feedback placeholder
  const pronunciation = 'For detailed pronunciation feedback, please integrate with a speech-to-text API that provides word-level confidence.';

  return NextResponse.json({
    summary,
    pronunciation,
    grammar
  });
} 