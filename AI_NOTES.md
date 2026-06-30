# AI Collaboration Notes

## Tools and Workflow
- **AI Assistant**: Google DeepMind AI Assistant (Antigravity).
- **Collaboration Split**: 
  - **AI**: Handled the bulk of the coding (React frontend, Express backend, Supabase DB integration, and Groq LLaMA integration). Wrote the tool-calling orchestration and RAG pipeline.
  - **Developer**: Drove the high-level architecture decisions, executed SQL queries in the Supabase Dashboard, provided required API keys, and continuously tested the live UI to provide visual feedback (via screenshots) to the AI when things failed.

## Key Architectural Decisions
1. **Supabase with `pgvector`**: Chose Supabase because it natively supports PostgreSQL with `pgvector`. This allowed us to keep the structured data (Workspaces, Tasks) and unstructured data (Document Chunks, Embeddings) in the exact same database.
2. **Strict Workspace Isolation**: To ensure isolation, we used a single `chunks` table. Instead of filtering after retrieval, we passed the `workspace_id` directly into the Supabase RPC function (`match_chunks`). The vector similarity search explicitly runs `WHERE workspace_id = p_workspace_id`.
3. **Resilient Embeddings Fallback**: During development, the free HuggingFace API timed out frequently. Instead of letting the ingestion pipeline crash, the AI built a deterministic hash-based embedding fallback. This allowed local development to continue entirely without an embedding API key, falling back to an intelligent keyword search algorithm for retrieval.

## The Hardest Bugs

### 1. The RLS (Row Level Security) Chunk Bug
**What happened:** We initially turned on Row Level Security for all tables in Supabase to secure the application. However, when we uploaded documents, the backend threw an error: `new row violates row-level security policy for table "chunks"`. The ingestion pipeline was chunking and embedding successfully, but silently dropping the chunks at the database insertion layer.
**How we fixed it:** The AI recognized the error from the backend logs and instructed the developer to execute a specific SQL query in the Supabase editor (`CREATE POLICY "Allow all for anon" ON chunks`) to patch the RLS permission for the chunks table, allowing the Node.js backend to insert the vectors.

### 2. The Keyword Fallback Blindspot
**What happened:** When the HuggingFace API failed, we relied on a PostgreSQL `ilike` keyword fallback. When the developer asked *"What are the Core Web Vitals I need to optimize for?"*, the fallback search split the query into words, took the first word ("core"), and grabbed the first 5 chunks containing "core" (which were about "Core React Concepts"). It completely missed the actual "Core Web Vitals" chunk. Because the LLM was strictly grounded, it responded with *"I don't have enough information"* despite retrieving 5 chunks!
**How we fixed it:** The AI noticed in the UI screenshot that 5 sources were retrieved but the answer was refused. The AI rewrote the keyword fallback algorithm to scan all chunks in the workspace and *score* them based on the total number of matched keywords, ensuring the chunk with "Core", "Web", and "Vitals" floated to the top.

## Future Improvements
- **Token Streaming**: Currently, the Groq API waits for the entire completion before sending it to the client. Implementing Server-Sent Events (SSE) would drastically improve perceived latency.
- **Multi-step Tool Execution**: Allowing the agent to see the result of a tool and immediately invoke another tool before returning the final response to the user.
