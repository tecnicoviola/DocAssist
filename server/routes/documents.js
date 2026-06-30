/**
 * Document Routes
 * GET    /api/documents        — List documents for a workspace
 * POST   /api/documents/upload — Upload and ingest a document
 * DELETE /api/documents/:id    — Delete a document and its chunks
 */

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/db');
const auth = require('../middleware/auth');
const { extractText, chunkText } = require('../services/chunking');
const { embedTexts } = require('../services/embedding');
const { storeChunks, deleteChunksByDocument } = require('../services/vectorStore');

const router = express.Router();

// Multer configured with memory storage (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// All document routes require authentication
router.use(auth);

// ─── GET / — List documents for a workspace ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { workspace_id } = req.query;

    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id query parameter is required.' });
    }

    // Verify the user is a member of the workspace
    const isMember = await checkMembership(req.user.id, workspace_id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this workspace.' });
    }

    // Fetch documents for the workspace
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return res.status(500).json({ error: 'Failed to fetch documents.' });
    }

    return res.status(200).json({ documents: documents || [] });
  } catch (error) {
    console.error('List documents error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── POST /upload — Upload and ingest a document ─────────────────────────────
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum allowed size is 50MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { workspace_id } = req.body;
    const file = req.file;

    // Validate inputs
    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id is required.' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Verify workspace membership
    const isMember = await checkMembership(req.user.id, workspace_id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this workspace.' });
    }

    // Calculate SHA-256 hash of the file buffer for deduplication
    const fileHash = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // Check for duplicate: same hash + same workspace = reject
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id, filename')
      .eq('workspace_id', workspace_id)
      .eq('file_hash', fileHash)
      .single();

    if (existingDoc) {
      return res.status(409).json({
        error: `Duplicate file detected. This file already exists in the workspace as "${existingDoc.filename}".`,
        existingDocument: existingDoc,
      });
    }

    // Insert document record with status 'processing'
    const documentId = uuidv4();
    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        workspace_id,
        filename: file.originalname,
        mimetype: file.mimetype,
        file_size: file.size,
        file_hash: fileHash,
        status: 'processing',
        chunk_count: 0,
        uploaded_by: req.user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Document insert error:', insertError);
      return res.status(500).json({ error: 'Failed to save document record.' });
    }

    // Return immediately — ingestion happens asynchronously
    res.status(201).json({
      document,
      message: 'Document uploaded. Ingestion is processing in the background.',
    });

    // ── Async Ingestion Pipeline (runs after response is sent) ──────────────
    ingestDocument(documentId, workspace_id, file.buffer, file.mimetype, file.originalname)
      .catch((err) => {
        console.error(`Ingestion failed for document ${documentId}:`, err);
      });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Internal server error during upload.' });
  }
});

// ─── DELETE /:id — Delete a document (CASCADE handles chunk deletion) ────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the document to verify it exists and check ownership
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('id, workspace_id, filename')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Verify workspace membership
    const isMember = await checkMembership(req.user.id, document.workspace_id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this workspace.' });
    }

    // Delete chunks first (in case CASCADE is not configured)
    await deleteChunksByDocument(id);

    // Delete the document record
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Document delete error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete document.' });
    }

    return res.status(200).json({
      message: `Document "${document.filename}" and its chunks deleted successfully.`,
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── Async Ingestion Pipeline ────────────────────────────────────────────────

/**
 * Full ingestion pipeline: extract → chunk → embed → store → update status.
 * Runs after the HTTP response is already sent to the client.
 */
async function ingestDocument(documentId, workspaceId, buffer, mimetype, filename) {
  try {
    console.log(`[Ingestion] Starting for "${filename}" (${documentId})`);

    // Step 1: Extract text from the file
    const text = await extractText(buffer, mimetype);
    if (!text || text.trim().length === 0) {
      throw new Error('No text content could be extracted from the file.');
    }
    console.log(`[Ingestion] Extracted ${text.length} characters from "${filename}"`);

    // Step 2: Split text into overlapping chunks
    const textChunks = chunkText(text, 500, 100);
    if (textChunks.length === 0) {
      throw new Error('Text splitting produced no chunks.');
    }
    console.log(`[Ingestion] Created ${textChunks.length} chunks from "${filename}"`);

    // Step 3: Generate embeddings for all chunks
    const chunkContents = textChunks.map((c) => c.content);
    const embeddings = await embedTexts(chunkContents);
    console.log(`[Ingestion] Generated ${embeddings.length} embeddings for "${filename}"`);

    // Step 4: Combine chunks with their embeddings
    const chunksWithEmbeddings = textChunks.map((chunk, idx) => ({
      content: chunk.content,
      embedding: embeddings[idx],
      chunkIndex: chunk.chunkIndex,
    }));

    // Step 5: Store chunks in the vector store
    await storeChunks(chunksWithEmbeddings, documentId, workspaceId);
    console.log(`[Ingestion] Stored ${chunksWithEmbeddings.length} chunks for "${filename}"`);

    // Step 6: Update document status to 'ready' with chunk count
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'ready',
        chunk_count: chunksWithEmbeddings.length,
      })
      .eq('id', documentId);

    if (updateError) {
      console.error(`[Ingestion] Failed to update status for ${documentId}:`, updateError);
    }

    console.log(`[Ingestion] ✓ Completed for "${filename}" — ${chunksWithEmbeddings.length} chunks stored`);
  } catch (error) {
    console.error(`[Ingestion] ✗ Failed for document ${documentId}:`, error.message);

    // Update document status to 'error'
    await supabase
      .from('documents')
      .update({ status: 'error' })
      .eq('id', documentId);
  }
}

// ─── Helper: Check workspace membership ──────────────────────────────────────

async function checkMembership(userId, workspaceId) {
  const { data } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  return !!data;
}

module.exports = router;
