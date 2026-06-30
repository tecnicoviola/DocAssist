/**
 * Task Routes
 * GET /api/tasks — Retrieve tasks for a workspace
 */

const express = require('express');
const supabase = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(auth);

// ─── GET / — List tasks for a workspace ──────────────────────────────────────
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

    // Fetch tasks for the workspace, most recent first
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks.' });
    }

    return res.status(200).json({ tasks: tasks || [] });
  } catch (error) {
    console.error('Tasks error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
