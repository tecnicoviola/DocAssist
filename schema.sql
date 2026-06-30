-- ============================================
-- Multi-Workspace Document Assistant
-- Database Schema for Supabase (PostgreSQL + pgvector)
-- ============================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Step 1: Enable the vector extension for embedding storage & search
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 3: Workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 4: Workspace members (links users to workspaces they can access)
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Step 5: Documents table (metadata about uploaded files)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mimetype TEXT,
  file_hash TEXT NOT NULL,
  file_size INTEGER,
  chunk_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'processing',
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Prevent duplicate uploads in the same workspace
  UNIQUE(workspace_id, file_hash)
);

-- ⭐ Step 6: THE SHARED VECTOR STORE
-- This is the SINGLE table holding ALL workspaces' chunks.
-- workspace_id is the isolation key — queries MUST filter by it.
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(768),  -- Gemini text-embedding-004 outputs 768 dimensions
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast workspace-scoped queries
CREATE INDEX IF NOT EXISTS idx_chunks_workspace ON chunks(workspace_id);

-- Index for fast vector similarity search (HNSW is faster than IVFFlat for small-medium datasets)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks
  USING hnsw (embedding vector_cosine_ops);

-- Step 7: Chat messages (stores conversation history per workspace)
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role TEXT NOT NULL,          -- 'user' or 'assistant'
  content TEXT NOT NULL,
  citations JSONB,             -- [{doc_name, chunk_content, similarity}]
  tool_calls JSONB,            -- [{name, args, result}]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 8: Tool call log (records every tool call the AI makes)
CREATE TABLE IF NOT EXISTS tool_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  chat_message_id UUID,
  tool_name TEXT NOT NULL,
  arguments JSONB NOT NULL,
  result JSONB,
  status TEXT DEFAULT 'pending',  -- pending | success | error
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Step 9: Tasks table (created by the save_task tool)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'todo',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ⭐ Step 10: RPC function for vector similarity search WITH workspace isolation
-- This is called from the backend: supabase.rpc('match_chunks', { ... })
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding vector(768),
  p_workspace_id UUID,
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    chunks.id,
    chunks.workspace_id,
    chunks.document_id,
    chunks.content,
    chunks.chunk_index,
    1 - (chunks.embedding <=> query_embedding) AS similarity
  FROM chunks
  WHERE chunks.workspace_id = p_workspace_id
    AND 1 - (chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ⭐ Step 11: Row Level Security 
-- We use permissive policies so our backend (using anon key) has full access.
-- Our backend handles authorization via JWT middleware.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policies that allow the anon key full access (our backend validates auth)
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON workspaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON workspace_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON chunks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON tool_call_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON tasks FOR ALL USING (true) WITH CHECK (true);
