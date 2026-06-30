import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Trash2, Bot, User, ChevronDown, ChevronRight, BookOpen, Wrench, Sparkles, MessageSquare } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';

function Citations({ citations }) {
  const [expanded, setExpanded] = useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="chat-citations">
      <div className="chat-citations-header" onClick={() => setExpanded(!expanded)}>
        <BookOpen size={12} />
        <span>{citations.length} source{citations.length !== 1 ? 's' : ''}</span>
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </div>
      {expanded && (
        <div style={{ animation: 'fadeIn 200ms ease-out' }}>
          {citations.map((cite, i) => (
            <div key={i} className="chat-citation-item">
              {typeof cite === 'string' ? cite : cite.text || cite.content || JSON.stringify(cite)}
              {cite.filename && (
                <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  — {cite.filename}{cite.chunk_index !== undefined ? `, chunk ${cite.chunk_index}` : ''}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolIndicators({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
      {toolCalls.map((tc, i) => (
        <span key={i} className="chat-tool-indicator">
          <Wrench size={10} />
          {tc.tool_name || tc.name || 'tool'}
        </span>
      ))}
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
      <div className={`chat-avatar ${isUser ? 'chat-avatar-user' : 'chat-avatar-assistant'}`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div>
        <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
          {isUser ? (
            message.content
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>
        {!isUser && <ToolIndicators toolCalls={message.tool_calls} />}
        {!isUser && <Citations citations={message.citations} />}
        {message.created_at && (
          <div className={`chat-timestamp ${isUser ? 'text-right' : ''}`} style={{ textAlign: isUser ? 'right' : 'left' }}>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Summarize the uploaded documents',
  'What are the key findings?',
  'Create a task list from the documents',
  'Compare the main topics discussed',
];

export default function Chat() {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch chat history on workspace change
  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchHistory();
    } else {
      setMessages([]);
    }
  }, [activeWorkspace?.id]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getChatHistory(activeWorkspace.id);
      const history = Array.isArray(data) ? data : data.messages || data.history || [];
      setMessages(history);
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSend = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || sending || !activeWorkspace?.id) return;

    const userMessage = { role: 'user', content: messageText, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const data = await api.sendMessage(activeWorkspace.id, messageText);
      const assistantMessage = {
        role: 'assistant',
        content: data.reply || data.content || data.message || '',
        citations: data.citations || [],
        tool_calls: data.tool_calls || [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!activeWorkspace?.id) return;
    try {
      await api.clearChatHistory(activeWorkspace.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-grow textarea
  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  if (loadingHistory) {
    return (
      <div className="chat-container">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {messages.length === 0 ? (
        <div className="chat-welcome">
          <div style={{ marginBottom: 8 }}>
            <Sparkles size={40} style={{ color: 'var(--accent-secondary)' }} />
          </div>
          <h2 className="gradient-text">Welcome to DocAssist</h2>
          <p>
            Upload documents to your workspace, then ask me anything. I'll analyze your documents and provide intelligent answers with citations.
          </p>
          <div className="chat-suggestions">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                className="chat-suggestion"
                onClick={() => handleSend(s)}
                disabled={sending}
              >
                <MessageSquare size={13} style={{ marginRight: 4, opacity: 0.6 }} />
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {sending && (
            <div className="chat-message chat-message-assistant">
              <div className="chat-avatar chat-avatar-assistant">
                <Bot size={14} />
              </div>
              <div className="chat-bubble chat-bubble-assistant">
                <div className="loading-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          {messages.length > 0 && (
            <button
              className="btn-icon"
              onClick={handleClearHistory}
              title="Clear chat history"
              style={{ flexShrink: 0, marginBottom: 2 }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={activeWorkspace ? 'Ask about your documents...' : 'Select a workspace first'}
            disabled={!activeWorkspace || sending}
            rows={1}
          />
          <button
            className="chat-send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || sending || !activeWorkspace}
            title="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
