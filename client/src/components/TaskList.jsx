import { useState, useEffect, useCallback } from 'react';
import { CheckSquare, RefreshCw, Calendar, Flag, Circle, CheckCircle2, ArrowUpCircle, Clock } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import * as api from '../services/api';

function PriorityBadge({ priority }) {
  switch (priority?.toLowerCase()) {
    case 'high':
    case 'urgent':
      return (
        <span className="badge badge-error">
          <ArrowUpCircle size={10} /> High
        </span>
      );
    case 'medium':
    case 'normal':
      return (
        <span className="badge badge-warning">
          <Flag size={10} /> Medium
        </span>
      );
    case 'low':
      return (
        <span className="badge badge-success">
          <Circle size={10} /> Low
        </span>
      );
    default:
      return (
        <span className="badge badge-info">
          <Flag size={10} /> {priority || 'Normal'}
        </span>
      );
  }
}

function StatusBadge({ status }) {
  switch (status?.toLowerCase()) {
    case 'done':
    case 'completed':
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={10} /> Done
        </span>
      );
    case 'in_progress':
    case 'in progress':
    case 'active':
      return (
        <span className="badge badge-warning">
          <Clock size={10} /> In Progress
        </span>
      );
    case 'todo':
    case 'pending':
      return (
        <span className="badge badge-info">
          <Circle size={10} /> To Do
        </span>
      );
    default:
      return (
        <span className="badge badge-info">
          <Circle size={10} /> {status || 'Todo'}
        </span>
      );
  }
}

export default function TaskList() {
  const { activeWorkspace } = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchTasks();
    } else {
      setTasks([]);
    }
  }, [activeWorkspace?.id]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getTasks(activeWorkspace.id);
      const taskList = Array.isArray(data) ? data : data.tasks || [];
      setTasks(taskList);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="tasks-container">
      <div className="flex items-center justify-between mb-lg">
        <h2 className="flex items-center gap-sm">
          <CheckSquare size={22} style={{ color: 'var(--accent-primary)' }} />
          Tasks
        </h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchTasks}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="task-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="task-item" style={{ opacity: 0.5 }}>
              <div className="task-header">
                <div className="skeleton" style={{ width: '50%', height: 18 }} />
                <div className="skeleton" style={{ width: 100, height: 22 }} />
              </div>
              <div className="skeleton" style={{ width: '80%', height: 14, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <CheckSquare size={40} className="empty-icon" />
          <h3>No tasks yet</h3>
          <p>Ask the assistant to create tasks from your documents. Try something like: &ldquo;Create a task list from the key action items in my documents.&rdquo;</p>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task, i) => (
            <div
              key={task.id || i}
              className="task-item"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="task-header">
                <span className="task-title">{task.title}</span>
                <div className="task-badges">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              </div>
              {task.description && (
                <p className="task-description">{task.description}</p>
              )}
              <div className="task-footer">
                <Calendar size={12} />
                <span>{formatDate(task.created_at) || 'Recently created'}</span>
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
