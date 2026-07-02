/**
 * Vector Store Service
 * Manages storage, search, and deletion of document chunks with embeddings.
 * Vector search uses a Supabase RPC function that filters by workspace_id.
 *
 * Strategy: Use vector search first. If 0 results (common with hash embeddings),
 * fall back to keyword search using PostgreSQL's ILIKE to guarantee we always
 * return relevant chunks.
 */

const supabase = require('../config/db');

/**
 * Store an array of chunks with their embeddings into the chunks table.
 */
async function storeChunks(chunks, documentId, workspaceId) {
  const rows = chunks.map((chunk) => ({
    document_id: documentId,
    workspace_id: workspaceId,
    content: chunk.content,
    embedding: JSON.stringify(chunk.embedding),
    chunk_index: chunk.chunkIndex,
  }));

  const BATCH_SIZE = 50;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('chunks').insert(batch);
    if (error) {
      throw new Error(`Failed to store chunks (batch ${i}): ${error.message}`);
    }
  }
}

/**
 * Search for chunks relevant to a query within a specific workspace.
 *
 * Step 1: Try vector similarity search with low threshold (0.05).
 * Step 2: If no results, fall back to keyword search using ILIKE.
 * Step 3: Always enrich results with filename from documents table.
 *
 * @param {number[]} queryEmbedding - The embedding of the user's query
 * @param {string} workspaceId - UUID of the workspace to search within
 * @param {number} topK - Maximum results to return
 * @param {string} queryText - Original query text for keyword fallback
 */
async function searchChunks(queryEmbedding, workspaceId, topK = 5, queryText = '') {
  let results = [];

  // ── Step 1: Try vector similarity search ──────────────────────────────────
  try {
    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      p_workspace_id: workspaceId,
      match_threshold: 0.4,
      match_count: topK,
    });

    if (!error && data && data.length > 0) {
      results = data;
      console.log(`[Search] Vector search found ${results.length} chunks`);
    } else {
      console.log('[Search] Vector search returned 0 results, trying keyword fallback...');
    }
  } catch (err) {
    console.warn('[Search] Vector search error:', err.message);
  }

  // ── Step 2: Keyword fallback if vector search found nothing ────────────────
  if (results.length === 0 && queryText) {
    console.log(`[Search] Keyword search for: "${queryText.substring(0, 60)}..."`);
    results = await keywordSearch(queryText, workspaceId, topK);
    console.log(`[Search] Keyword search found ${results.length} chunks`);
  }

  // ── Step 3: Last resort — return top chunks from workspace ─────────────────
  if (results.length === 0) {
    console.log('[Search] Last resort: fetching top workspace chunks...');
    const { data: fallback } = await supabase
      .from('chunks')
      .select('id, workspace_id, document_id, content, chunk_index')
      .eq('workspace_id', workspaceId)
      .limit(topK);

    results = (fallback || []).map((c) => ({ ...c, similarity: 0 }));
    console.log(`[Search] Last resort returned ${results.length} chunks`);
  }

  // ── Step 4: Enrich with filename ─────────────────────────────────────────
  return enrichWithFilenames(results);
}

/**
 * Keyword search using PostgreSQL ILIKE across all words in the query.
 * Ranks chunks by how many keywords they contain.
 */
async function keywordSearch(queryText, workspaceId, topK) {
  // Extract meaningful keywords (skip short stop words)
  const stopWords = new Set(['the', 'is', 'a', 'an', 'of', 'for', 'to', 'in', 'and', 'or', 'what', 'how', 'why', 'when', 'where', 'who', 'are', 'was', 'can', 'you', 'explain']);
  const keywords = queryText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (keywords.length === 0) return [];

  // Fetch all chunks for the workspace
  const { data: allChunks } = await supabase
    .from('chunks')
    .select('id, workspace_id, document_id, content, chunk_index')
    .eq('workspace_id', workspaceId);

  if (!allChunks) return [];

  // Score each chunk by how many keywords it contains
  const scoredChunks = allChunks.map((chunk) => {
    const chunkText = chunk.content.toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
      if (chunkText.includes(keyword)) {
        score += 1;
      }
    }
    return { ...chunk, score, similarity: 0.1 };
  });

  // Filter chunks with score > 0, sort by score descending, take topK
  const topChunks = scoredChunks
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return topChunks.map(({ score, ...rest }) => rest);
}

/**
 * Enrich chunk results with the source document filename.
 */
async function enrichWithFilenames(chunks) {
  if (chunks.length === 0) return [];

  const documentIds = [...new Set(chunks.map((c) => c.document_id))];
  const { data: docs } = await supabase
    .from('documents')
    .select('id, filename')
    .in('id', documentIds);

  const docMap = {};
  (docs || []).forEach((d) => { docMap[d.id] = d.filename; });

  return chunks.map((chunk) => ({
    ...chunk,
    filename: docMap[chunk.document_id] || 'Unknown Document',
  }));
}

/**
 * Delete all chunks belonging to a specific document.
 */
async function deleteChunksByDocument(documentId) {
  const { error } = await supabase
    .from('chunks')
    .delete()
    .eq('document_id', documentId);

  if (error) {
    throw new Error(`Failed to delete chunks: ${error.message}`);
  }
}

module.exports = { storeChunks, searchChunks, deleteChunksByDocument };
