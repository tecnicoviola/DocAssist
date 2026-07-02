/**
 * Chat Routes
 * POST   /api/chat          — Send a message and get AI response with RAG
 * GET    /api/chat/history   — Get chat history for a workspace
 * DELETE /api/chat/history   — Clear chat history for a workspace
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/db');
const auth = require('../middleware/auth');
const { embedText } = require('../services/embedding');
const { searchChunks } = require('../services/vectorStore');
const { chat } = require('../services/gemini');

const router = express.Router();

// All chat routes require authentication
router.use(auth);

// ─── POST / — Send a message and get AI response ─────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message, workspace_id } = req.body;

    // Input validation
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id is required.' });
    }

    // Verify workspace membership
    const isMember = await checkMembership(req.user.id, workspace_id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this workspace.' });
    }

    // Get workspace name for context
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspace_id)
      .single();

    // Step 1: Embed the user's question for vector search
    const queryEmbedding = await embedText(message.trim());

    // Step 2: Search for relevant chunks in the workspace (workspace-isolated)
    // Passes message.trim() for keyword fallback if vector search fails
    const retrievedChunks = await searchChunks(queryEmbedding, workspace_id, 3, message.trim());


    // Step 3: Get recent chat history (last 4 messages) for conversational context
    const { data: historyRows } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('workspace_id', workspace_id)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(4);

    // Reverse so oldest is first (Gemini expects chronological order)
    const chatHistory = (historyRows || []).reverse();

    // Step 4: Call Gemini with the question, retrieved context, and history
    const result = await chat(
      message.trim(),
      {
        workspaceId: workspace_id,
        userId: req.user.id,
        workspaceName: workspace?.name || 'Workspace',
      },
      retrievedChunks,
      chatHistory
    );

    // Step 5: Save user message to chat_messages
    await supabase.from('chat_messages').insert({
      id: uuidv4(),
      workspace_id,
      user_id: req.user.id,
      role: 'user',
      content: message.trim(),
      created_at: new Date().toISOString(),
    });

    // Step 6: Save assistant reply to chat_messages
    await supabase.from('chat_messages').insert({
      id: uuidv4(),
      workspace_id,
      user_id: req.user.id,
      role: 'assistant',
      content: result.reply,
      citations: result.citations || [],
      tool_calls: result.toolCalls || [],
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({
      reply: result.reply,
      citations: result.citations,
      toolCalls: result.toolCalls,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Failed to process chat message.' });
  }
});

// ─── GET /history — Get chat history for a workspace ──────────────────────────
router.get('/history', async (req, res) => {
  try {
    const { workspace_id } = req.query;

    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id query parameter is required.' });
    }

    // Verify workspace membership
    const isMember = await checkMembership(req.user.id, workspace_id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this workspace.' });
    }

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Chat history error:', error);
      return res.status(500).json({ error: 'Failed to fetch chat history.' });
    }

    return res.status(200).json({ messages: messages || [] });
  } catch (error) {
    console.error('Chat history error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── DELETE /history — Clear chat history for a workspace ─────────────────────
router.delete('/history', async (req, res) => {
  try {
    const { workspace_id } = req.query;

    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id query parameter is required.' });
    }

    // Verify workspace membership
    const isMember = await checkMembership(req.user.id, workspace_id);
    if (!isMember) {
      return res.status(403).json({ error: 'You are not a member of this workspace.' });
    }

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('workspace_id', workspace_id)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Delete chat history error:', error);
      return res.status(500).json({ error: 'Failed to clear chat history.' });
    }

    return res.status(200).json({ message: 'Chat history cleared.' });
  } catch (error) {
    console.error('Delete chat history error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

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
