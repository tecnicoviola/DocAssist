/**
 * Tool Call Log Routes
 * GET /api/tool-calls — Retrieve tool call logs for a workspace
 */

const express = require('express');
const supabase = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// ─── GET / — List tool call logs for a workspace ─────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { workspace_id } = req.query;

    if (!workspace_id) {
      return res.status(400).json({ error: 'workspace_id query parameter is required.' });
    }

    // Verify workspace membership
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('workspace_id', workspace_id)
      .single();

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this workspace.' });
    }

    // Fetch tool call logs for the workspace, most recent first
    const { data: logs, error } = await supabase
      .from('tool_call_logs')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tool call logs:', error);
      return res.status(500).json({ error: 'Failed to fetch tool call logs.' });
    }

    return res.status(200).json({ toolCalls: logs || [] });
  } catch (error) {
    console.error('Tool call logs error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
