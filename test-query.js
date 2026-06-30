require('dotenv').config({ path: './.env' });

async function testFetch() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
  
  console.log('Testing with ?key= query parameter...');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text: "Hello" }] } })
  });
  console.log('Status:', res.status, await res.text());
}

testFetch();
