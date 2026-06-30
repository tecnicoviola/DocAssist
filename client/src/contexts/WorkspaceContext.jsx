import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch workspaces when user is authenticated
  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
    }
  }, [user]);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getWorkspaces();
      const list = Array.isArray(data) ? data : data.workspaces || [];
      setWorkspaces(list);

      // Restore active workspace from localStorage
      const storedId = localStorage.getItem('docassist_active_workspace');
      if (storedId) {
        const found = list.find((w) => String(w.id) === storedId);
        if (found) {
          setActiveWorkspaceState(found);
        } else if (list.length > 0) {
          setActiveWorkspaceState(list[0]);
          localStorage.setItem('docassist_active_workspace', String(list[0].id));
        }
      } else if (list.length > 0) {
        setActiveWorkspaceState(list[0]);
        localStorage.setItem('docassist_active_workspace', String(list[0].id));
      }
    } catch (err) {
      console.error('Failed to fetch workspaces:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveWorkspace = useCallback((workspace) => {
    setActiveWorkspaceState(workspace);
    if (workspace) {
      localStorage.setItem('docassist_active_workspace', String(workspace.id));
    }
  }, []);

  const createWorkspace = useCallback(async (name) => {
    const data = await api.createWorkspace(name);
    const newWorkspace = data.workspace || data;
    setWorkspaces((prev) => [...prev, newWorkspace]);
    setActiveWorkspace(newWorkspace);
    return newWorkspace;
  }, [setActiveWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        setActiveWorkspace,
        createWorkspace,
        loading,
        refreshWorkspaces: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export default WorkspaceContext;
