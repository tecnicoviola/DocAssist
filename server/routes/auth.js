/**
 * Auth Routes
 * POST /api/auth/signup  — Register a new user with default workspaces
 * POST /api/auth/login   — Authenticate and receive JWT
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/db');

const router = express.Router();

// ─── POST /signup ─────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Input validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash the password with bcrypt (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user record
    const userId = uuidv4();
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        created_at: new Date().toISOString(),
      })
      .select('id, email, name, created_at')
      .single();

    if (userError) {
      console.error('User creation error:', userError);
      return res.status(500).json({ error: 'Failed to create user account.' });
    }

    // Create 2 default workspaces: 'Research' and 'Projects'
    const defaultWorkspaces = ['Research', 'Projects'];
    for (const wsName of defaultWorkspaces) {
      const workspaceId = uuidv4();

      // Insert the workspace
      const { error: wsError } = await supabase.from('workspaces').insert({
        id: workspaceId,
        name: wsName,
        created_by: userId,
        created_at: new Date().toISOString(),
      });

      if (wsError) {
        console.error(`Failed to create '${wsName}' workspace:`, wsError);
        continue; // Don't fail the entire signup for a workspace issue
      }

      // Add user as owner in workspace_members
      const { error: memberError } = await supabase.from('workspace_members').insert({
        id: uuidv4(),
        workspace_id: workspaceId,
        user_id: userId,
        role: 'owner',
        joined_at: new Date().toISOString(),
      });

      if (memberError) {
        console.error(`Failed to add member to '${wsName}':`, memberError);
      }
    }

    // Generate JWT token (expires in 7 days)
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error during signup.' });
  }
});

// ─── POST /login ──────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user by email
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email, name, password')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (findError || !user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compare provided password with stored hash
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT token (expires in 7 days)
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

module.exports = router;
