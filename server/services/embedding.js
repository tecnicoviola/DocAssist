/**
 * Embedding Service
 * Uses HuggingFace Inference API if HF_TOKEN is set.
 * Falls back to deterministic TF-IDF-style hash embeddings (no API key needed).
 * Hash embeddings allow the app to run fully offline — search works but is keyword-based.
 */

const { HfInference } = require('@huggingface/inference');

const MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const DIMS = 384;
const HF_TIMEOUT_MS = 8000; // 8 second timeout

/**
 * Embed a single text string into a 384-dimensional float vector.
 */
async function embedText(text) {
  if (process.env.HF_TOKEN) {
    try {
      const embedding = await withTimeout(hfEmbed(text), HF_TIMEOUT_MS);
      return embedding;
    } catch (error) {
      console.warn('[Embedding] HuggingFace API failed, using hash fallback:', error.message);
    }
  }
  return hashEmbedding(text, DIMS);
}

/**
 * Embed multiple texts.
 */
async function embedTexts(texts) {
  const embeddings = [];
  for (const text of texts) {
    const emb = await embedText(text);
    embeddings.push(emb);
  }
  return embeddings;
}

/**
 * Call HuggingFace API.
 */
async function hfEmbed(text) {
  const hf = new HfInference(process.env.HF_TOKEN);
  const result = await hf.featureExtraction({ model: MODEL, inputs: text });
  const vector = Array.isArray(result[0]) ? result[0] : result;
  return vector;
}

/**
 * Wrap a promise with a timeout.
 */
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

/**
 * Deterministic hash-based embedding (works with NO API key).
 * Produces consistent vectors so the same text always gets the same embedding.
 * Search quality is keyword-based rather than semantic.
 */
function hashEmbedding(text, dims) {
  const normalized = text.toLowerCase().trim();
  const vec = new Float64Array(dims).fill(0);

  // Word-level hashing for better keyword matching
  const words = normalized.split(/\s+/);
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    for (let c = 0; c < word.length; c++) {
      const code = word.charCodeAt(c);
      const idx1 = (code * 31 + w * 17 + c * 7) % dims;
      const idx2 = (code * 13 + w * 29) % dims;
      const idx3 = (code + w * 53 + c * 11) % dims;
      vec[idx1] += Math.sin(code * 0.1) * 0.3;
      vec[idx2] += Math.cos(w * 0.5 + code * 0.05) * 0.2;
      vec[idx3] += Math.sin(c * 0.3 + code * 0.07) * 0.1;
    }
  }

  // Character n-gram hashing for substring matching
  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.slice(i, i + 3);
    let hash = 5381;
    for (let j = 0; j < trigram.length; j++) {
      hash = ((hash << 5) + hash) + trigram.charCodeAt(j);
      hash = hash & hash; // Convert to 32bit integer
    }
    vec[Math.abs(hash) % dims] += 0.15;
  }

  // L2 normalize the vector
  const magnitude = Math.sqrt(Array.from(vec).reduce((s, v) => s + v * v, 0)) || 1;
  return Array.from(vec).map((v) => v / magnitude);
}

module.exports = { embedText, embedTexts };
