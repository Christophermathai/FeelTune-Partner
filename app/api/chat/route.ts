import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    console.log("Hello");
    const { message } = await request.json();
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are FeelTune, a music-focused AI assistant. The user message is: "${message}"
      Provide a helpful response about music, considering:
      - Music recommendations
      - Music theory explanations
      - Artist information
      - Genre discussions
      - Song meanings and interpretations
      Keep responses concise and engaging.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ response: text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}