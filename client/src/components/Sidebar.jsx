import { MessageSquare, FileText, CheckSquare, Activity, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import WorkspaceSwitcher from './WorkspaceSwitcher';

const NAV_ITEMS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'tool-logs', label: 'Tool Logs', icon: Activity },
];

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose }) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 150,
            display: 'none',
          }}
          onClick={onClose}
          className="sidebar-overlay"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Zap size={18} />
            </div>
            <span className="gradient-text">DocAssist</span>
          </div>
        </div>

        {/* Workspace Switcher */}
        <WorkspaceSwitcher />

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <div className="sidebar-nav-section-title">Navigation</div>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Section */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">
              {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-email">{user?.email || ''}</div>
            </div>
            <button
              className="btn-icon"
              onClick={logout}
              title="Sign out"
              style={{ flexShrink: 0 }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-overlay {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
