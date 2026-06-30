import { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock, Wrench } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import * as api from '../services/api';

function StatusBadge({ status }) {
  switch (status) {
    case 'success':
    case 'completed':
      return <span className="badge badge-success"><CheckCircle size={10} /> Success</span>;
    case 'error':
    case 'failed':
      return <span className="badge badge-error"><XCircle size={10} /> Error</span>;
    case 'pending':
    case 'running':
      return <span className="badge badge-warning"><Clock size={10} /> Pending</span>;
    default:
      return <span className="badge badge-info">{status || 'Unknown'}</span>;
  }
}

function JsonBlock({ data, label }) {
  const [expanded, setExpanded] = useState(false);

  if (!data) return <span className="text-muted text-sm">—</span>;

  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const isLong = jsonStr.length > 120;

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <span className="text-xs text-muted font-medium">{label}</span>
        {isLong && (
          <button className="tool-call-toggle" onClick={() => setExpanded(!expanded)}>
            {expanded ? (
              <><ChevronDown size={10} /> Collapse</>
            ) : (
              <><ChevronRight size={10} /> Expand</>
            )}
          </button>
        )}
      </div>
      <div className="tool-call-json" style={!expanded && isLong ? { maxHeight: 60, overflow: 'hidden' } : {}}>
        {jsonStr}
      </div>
    </div>
  );
}

export default function ToolCallLog() {
  const { activeWorkspace } = useWorkspace();
  const [toolCalls, setToolCalls] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchToolCalls();
    } else {
      setToolCalls([]);
    }
  }, [activeWorkspace?.id]);

  const fetchToolCalls = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getToolCalls(activeWorkspace.id);
      const calls = Array.isArray(data) ? data : (data.toolCalls || data.tool_calls || []);
      setToolCalls(calls);
    } catch (err) {
      console.error('Failed to fetch tool calls:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="tool-log-container">
      <div className="flex items-center justify-between mb-lg">
        <h2 className="flex items-center gap-sm">
          <Activity size={22} style={{ color: 'var(--accent-primary)' }} />
          Tool Call Logs
        </h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchToolCalls}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex-col gap-sm">
          {[1, 2, 3].map((i) => (
            <div key={i} className="tool-call-item" style={{ opacity: 0.5 }}>
              <div className="tool-call-header">
                <div className="skeleton" style={{ width: 150, height: 18 }} />
                <div className="skeleton" style={{ width: 70, height: 22 }} />
              </div>
            </div>
          ))}
        </div>
      ) : toolCalls.length === 0 ? (
        <div className="empty-state">
          <Wrench size={40} className="empty-icon" />
          <h3>No tool calls yet</h3>
          <p>When the AI uses tools to process your queries, the calls will appear here with full details.</p>
        </div>
      ) : (
        <div>
          {toolCalls.map((tc, i) => (
            <div key={tc.id || i} className="tool-call-item">
              <div className="tool-call-header">
                <div className="tool-call-name">
                  <Wrench size={14} style={{ color: 'var(--accent-primary)' }} />
                  {tc.tool_name || 'Unknown Tool'}
                </div>
                <div className="tool-call-meta">
                  <StatusBadge status={tc.status} />
                  {tc.created_at && (
                    <span className="text-xs text-muted">{formatTime(tc.created_at)}</span>
                  )}
                </div>
              </div>
              <div className="tool-call-body">
                <JsonBlock data={tc.arguments} label="Arguments" />
                <JsonBlock data={tc.result} label="Result" />
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
