# Multi-Workspace Document Assistant (RAG & Tool Calling)

A full-stack web application featuring an AI assistant that answers questions grounded strictly in documents you upload. The app features true workspace isolation, vector-based retrieval (RAG), and agentic tool-calling capabilities.

## Features

- **Strict Workspace Isolation**: Users can create multiple workspaces. A query in Workspace A cannot access, retrieve, or act on documents from Workspace B, enforced at the database level.
- **Shared Vector Store**: All document chunks live in a single shared Supabase PostgreSQL table (`chunks`), utilizing `pgvector` for similarity search, filtered by `workspace_id`.
- **Intelligent RAG pipeline**: 
  - Parses PDFs and text files.
  - Chunks text semantically.
  - Generates embeddings via HuggingFace (with an offline keyword/hash fallback).
  - Cites the specific sources used to answer questions.
- **Agentic Tool Calling**: The LLM (Groq LLaMA 3) can autonomously decide to use tools. It can create tasks (`save_task`) and view tasks (`list_tasks`) in the current workspace.
- **Dashboard & Auditing**: A clean React frontend that allows you to manage documents, view chat history, manage your task list, and inspect the raw JSON `Tool Logs` of the AI's actions.
- **Honest Refusals**: If the documents in the active workspace do not contain the answer, the AI explicitly states it does not have enough information, resisting hallucinations.

## Screenshots

<div align="center">
  <img src="docs/images/landing.png" alt="Landing Page" width="800"/>
  <p><em>Premium Landing Page with 3D floating visual</em></p>
  <br/>
  <img src="docs/images/chat.png" alt="Workspace Chat" width="800"/>
  <p><em>RAG Chat Interface with source citations</em></p>
  <br/>
  <img src="docs/images/documents.png" alt="Document Upload" width="800"/>
  <p><em>Workspace Document Management</em></p>
  <br/>
  <img src="docs/images/tasks.png" alt="Tasks Dashboard" width="800"/>
  <p><em>AI-Generated Task List</em></p>
  <br/>
  <img src="docs/images/logs.png" alt="Tool Logs" width="800"/>
  <p><em>Tool Call Logging and Auditing</em></p>
</div>

## Tech Stack

- **Frontend**: React, Vite, Lucide Icons, Vanilla CSS
- **Backend**: Node.js, Express.js, Multer (file uploads)
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI / LLM**: Groq (`llama-3.3-70b-versatile`)
- **Embeddings**: HuggingFace Inference API (`feature-extraction`)

---

## Running Locally

### 1. Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com/) account (free tier)
- A [Groq](https://console.groq.com/) API Key (free tier)
- A [HuggingFace](https://huggingface.co/) Access Token (free tier)

### 2. Database Setup (Supabase)
Create a new Supabase project and execute the SQL script in `database_schema.sql` (if provided, or manually create the tables) in the Supabase SQL Editor.
Ensure you have the following tables:
- `users`
- `workspaces`
- `workspace_members`
- `documents`
- `chunks` (with `pgvector` enabled)
- `tasks`
- `chat_messages`
- `tool_call_logs`

Also, ensure the RPC function `match_chunks` is created for vector similarity search.

### 3. Clone and Install
```bash
git clone <your-repo-url>
cd "Multi-Workspace Document Assistant"

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 4. Environment Variables
Create a `.env` file in the **root** of the project and copy the contents from `.env.example`:
```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key_here
GROQ_API_KEY=your_groq_api_key_here
HF_TOKEN=your_hf_token_here
CLIENT_URL=http://localhost:5173
```

### 5. Start the Application
From the root directory, run:
```bash
npm run dev
```
This will start both the Express backend on port `3001` and the Vite frontend on port `5173`.
Navigate to `http://localhost:5173` in your browser.

---

## Testing Workspace Isolation

To verify the tenancy boundaries:
1. Create a workspace named **"Research"** and upload a document with a specific fact (e.g., "The secret magic number is 42").
2. Ask the assistant: *"What is the magic number?"* -> It will answer 42.
3. Create a second workspace named **"Projects"** and upload a different document.
4. In the "Projects" workspace, ask: *"What is the magic number?"*
5. The assistant will refuse to answer, proving that the vector search query successfully blocked access to the chunks from the "Research" workspace.

---

## Deployment Strategy

- **Database**: Hosted on Supabase (already remote).
- **Backend (Node.js)**: Can be deployed to Render, Railway, or Heroku as a Web Service. Ensure you add the `.env` variables in the hosting provider's dashboard.
- **Frontend (React)**: Can be deployed to Vercel, Netlify, or Cloudflare Pages. Make sure to update the `VITE_API_URL` (if configured) or the Axios baseURL in `api.js` to point to the deployed backend URL instead of localhost.
