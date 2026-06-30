require('dotenv').config({ path: './.env' });
const { GoogleGenAI } = require('@google/genai');

async function testGemini() {
  try {
    console.log('Testing with new @google/genai SDK...');
    console.log('Key prefix:', process.env.GEMINI_API_KEY?.substring(0, 6));

    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Test embeddings
    console.log('\n1. Testing embeddings...');
    const embResult = await genAI.models.embedContent({
      model: 'text-embedding-004',
      contents: 'Hello world test',
    });
    console.log('✅ Embedding SUCCESS! Vector length:', embResult.embeddings[0].values.length);

    // Test chat
    console.log('\n2. Testing chat...');
    const chatResult = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: 'Say "API is working!" and nothing else.' }] }],
    });
    console.log('✅ Chat SUCCESS!', chatResult.candidates[0].content.parts[0].text);

  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testGemini();
