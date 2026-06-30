require('dotenv').config({ path: './.env' });

async function testFetch() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent`;
  
  console.log('Testing with x-goog-api-key header...');
  const res1 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ content: { parts: [{ text: "Hello" }] } })
  });
  console.log('Status 1:', res1.status, await res1.text());

  console.log('\nTesting with Authorization: Bearer header...');
  const res2 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ content: { parts: [{ text: "Hello" }] } })
  });
  console.log('Status 2:', res2.status, await res2.text());
}

testFetch();
