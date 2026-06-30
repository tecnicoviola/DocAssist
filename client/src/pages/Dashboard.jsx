import { useState } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import Chat from '../components/Chat';
import DocumentUpload from '../components/DocumentUpload';
import TaskList from '../components/TaskList';
import ToolCallLog from '../components/ToolCallLog';
import { Menu } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeWorkspace, loading } = useWorkspace();
  const { user } = useAuth();

  const renderContent = () => {
    if (loading) {
      return (
        <div className="page-loader" style={{ height: '100%' }}>
          <div className="spinner spinner-lg" />
          <span className="text-muted text-sm">Loading workspace...</span>
        </div>
      );
    }

    if (!activeWorkspace) {
      return (
        <div className="welcome-banner fade-in-up">
          <div className="welcome-content">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '12px' }}>Welcome to DocAssist</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
              Create or select a workspace from the sidebar to initialize your intelligent document environment.
            </p>
          </div>
          <div className="hero-bg-glow" style={{ top: '50%', opacity: 0.5 }}></div>
        </div>
      );
    }

    let TabContent;
    switch (activeTab) {
      case 'chat':
        TabContent = <Chat />;
        break;
      case 'documents':
        TabContent = <DocumentUpload />;
        break;
      case 'tasks':
        TabContent = <TaskList />;
        break;
      case 'tool-logs':
        TabContent = <ToolCallLog />;
        break;
      default:
        TabContent = <Chat />;
    }

    return (
      <div key={activeTab} className="fade-in-up" style={{ height: '100%', animationDuration: '0.4s' }}>
        {TabContent}
      </div>
    );
  };

  return (
    <div className="app-layout">
      {/* Mobile menu button */}
      <button
        className="btn-icon"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 300,
          display: 'none',
        }}
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>

      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content">
        <header className="main-header">
          <div className="flex items-center gap-md">
            <button
              className="btn-icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: 'none' }}
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {activeWorkspace?.name || 'DocAssist'}
              </h1>
              {activeWorkspace && (
                <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                  {activeTab === 'chat' && 'AI Chat'}
                  {activeTab === 'documents' && 'Documents'}
                  {activeTab === 'tasks' && 'Tasks'}
                  {activeTab === 'tool-logs' && 'Tool Call Logs'}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-sm">
            {user && (
              <div className="flex items-center gap-sm">
                <span className="text-sm text-muted" style={{ display: 'none' }}>
                  {user.email}
                </span>
                <div className="user-avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                  {(user.name || user.email || '?').charAt(0).toUpperCase()}
                </div>
              </div>
            )}
          </div>
        </header>
        <div className="main-body">
          {renderContent()}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .app-layout > button.btn-icon:first-child,
          .main-header button.btn-icon {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
