import { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ChevronDown, Plus, Folder, Check } from 'lucide-react';

export default function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, setActiveWorkspace, createWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsCreating(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus input when creating
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      await createWorkspace(newName.trim());
      setNewName('');
      setIsCreating(false);
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to create workspace:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') {
      setIsCreating(false);
      setNewName('');
    }
  };

  return (
    <div className="workspace-switcher" ref={containerRef}>
      <div className="workspace-current" onClick={() => setIsOpen(!isOpen)}>
        <div className="workspace-current-info">
          <div className="workspace-dot" />
          <span className="workspace-current-name">
            {activeWorkspace?.name || 'Select workspace'}
          </span>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--text-muted)',
            transition: 'transform 200ms ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        />
      </div>

      {isOpen && (
        <div className="workspace-dropdown">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              className={`workspace-dropdown-item ${activeWorkspace?.id === ws.id ? 'active' : ''}`}
              onClick={() => {
                setActiveWorkspace(ws);
                setIsOpen(false);
              }}
            >
              <Folder size={14} />
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ws.name}
              </span>
              {activeWorkspace?.id === ws.id && (
                <Check size={14} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
              )}
            </button>
          ))}

          {workspaces.length === 0 && (
            <div style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              No workspaces yet
            </div>
          )}

          <div className="workspace-create">
            {isCreating ? (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Workspace name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={creating}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  style={{ flexShrink: 0 }}
                >
                  {creating ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Check size={14} />}
                </button>
              </>
            ) : (
              <button
                className="btn btn-ghost btn-sm w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreating(true);
                }}
                style={{ justifyContent: 'center' }}
              >
                <Plus size={14} />
                New workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
