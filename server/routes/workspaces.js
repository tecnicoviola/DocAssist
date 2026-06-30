/**
 * Workspace Routes
 * GET  /api/workspaces   — List workspaces the user belongs to
 * POST /api/workspaces   — Create a new workspace
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// All workspace routes require authentication
router.use(auth);

// ─── GET / — List user's workspaces ───────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // Join workspace_members to workspaces to get only workspaces the user belongs to
    const { data: memberships, error: memberError } = await supabase
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', req.user.id);

    if (memberError) {
      console.error('Error fetching memberships:', memberError);
      return res.status(500).json({ error: 'Failed to fetch workspaces.' });
    }

    if (!memberships || memberships.length === 0) {
      return res.status(200).json({ workspaces: [] });
    }

    // Fetch the workspace details for each membership
    const workspaceIds = memberships.map((m) => m.workspace_id);
    const { data: workspaces, error: wsError } = await supabase
      .from('workspaces')
      .select('*')
      .in('id', workspaceIds)
      .order('created_at', { ascending: true });

    if (wsError) {
      console.error('Error fetching workspaces:', wsError);
      return res.status(500).json({ error: 'Failed to fetch workspaces.' });
    }

    // Merge role information into workspace objects
    const roleMap = {};
    memberships.forEach((m) => {
      roleMap[m.workspace_id] = m.role;
    });

    const enrichedWorkspaces = (workspaces || []).map((ws) => ({
      ...ws,
      role: roleMap[ws.id] || 'member',
    }));

    return res.status(200).json({ workspaces: enrichedWorkspaces });
  } catch (error) {
    console.error('List workspaces error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─── POST / — Create a new workspace ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Workspace name is required.' });
    }

    const workspaceId = uuidv4();

    // Create the workspace record
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({
        id: workspaceId,
        name: name.trim(),
        created_by: req.user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (wsError) {
      console.error('Workspace creation error:', wsError);
      return res.status(500).json({ error: 'Failed to create workspace.' });
    }

    // Add the creating user as 'owner' in workspace_members
    const { error: memberError } = await supabase.from('workspace_members').insert({
      id: uuidv4(),
      workspace_id: workspaceId,
      user_id: req.user.id,
      role: 'owner',
      joined_at: new Date().toISOString(),
    });

    if (memberError) {
      console.error('Membership creation error:', memberError);
      // Workspace was created but membership failed — still return it
    }

    return res.status(201).json({
      workspace: { ...workspace, role: 'owner' },
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
