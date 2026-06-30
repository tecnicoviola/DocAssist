import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileText, File, Trash2, RefreshCw, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import * as api from '../services/api';

function getFileIcon(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
      return { className: 'pdf', label: 'PDF' };
    case 'txt':
      return { className: 'txt', label: 'TXT' };
    case 'docx':
    case 'doc':
      return { className: 'docx', label: 'DOC' };
    case 'md':
      return { className: 'md', label: 'MD' };
    default:
      return { className: 'default', label: ext.toUpperCase() || 'FILE' };
  }
}

function StatusBadge({ status }) {
  switch (status) {
    case 'ready':
    case 'completed':
    case 'processed':
      return <span className="badge badge-success"><CheckCircle size={10} /> Ready</span>;
    case 'processing':
    case 'pending':
      return <span className="badge badge-warning"><Clock size={10} /> Processing</span>;
    case 'error':
    case 'failed':
      return <span className="badge badge-error"><AlertCircle size={10} /> Error</span>;
    default:
      return <span className="badge badge-info">{status || 'Unknown'}</span>;
  }
}

export default function DocumentUpload() {
  const { activeWorkspace } = useWorkspace();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (activeWorkspace?.id) {
      fetchDocuments();
    } else {
      setDocuments([]);
    }
  }, [activeWorkspace?.id]);

  // Auto-poll every 3 seconds while any document is still processing
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === 'processing' || d.status === 'pending'
    );
    if (hasProcessing) {
      pollRef.current = setInterval(() => {
        if (activeWorkspace?.id) {
          api.getDocuments(activeWorkspace.id).then((data) => {
            const docs = Array.isArray(data) ? data : data.documents || [];
            setDocuments(docs);
          }).catch(() => {});
        }
      }, 3000);
    } else {
      clearInterval(pollRef.current);
    }
    return () => clearInterval(pollRef.current);
  }, [documents, activeWorkspace?.id]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDocuments(activeWorkspace.id);
      const docs = Array.isArray(data) ? data : data.documents || [];
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  const handleUpload = async (file) => {
    if (!file || !activeWorkspace?.id) return;

    const allowed = ['.pdf', '.txt', '.docx', '.doc', '.md'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setUploadStatus({ type: 'error', message: `Unsupported file type: ${ext}` });
      return;
    }

    setUploading(true);
    setUploadStatus({ type: 'info', message: `Uploading ${file.name}...` });

    try {
      await api.uploadDocument(activeWorkspace.id, file);
      setUploadStatus({ type: 'success', message: `${file.name} uploaded successfully!` });
      await fetchDocuments();
    } catch (err) {
      setUploadStatus({
        type: 'error',
        message: err.response?.data?.error || `Failed to upload ${file.name}`,
      });
    } finally {
      setUploading(false);
      // Clear status after delay
      setTimeout(() => setUploadStatus(null), 4000);
    }
  };

  const handleDelete = async (docId) => {
    setDeleting(docId);
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input
    e.target.value = '';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h2>Documents</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={fetchDocuments}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {/* Upload zone */}
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.docx,.doc,.md"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <Upload size={36} className="upload-zone-icon" />
        <h3>{uploading ? 'Uploading...' : 'Drop files here or click to browse'}</h3>
        <p>Supports PDF, TXT, DOCX, and Markdown files</p>
        {uploading && (
          <div className="upload-progress" style={{ width: '100%', maxWidth: 300 }}>
            <div className="upload-progress-bar">
              <div className="upload-progress-fill" style={{ width: '100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
            </div>
          </div>
        )}
      </div>

      {/* Upload status toast */}
      {uploadStatus && (
        <div
          className={`upload-progress`}
          style={{
            background: uploadStatus.type === 'success'
              ? 'var(--success-dim)'
              : uploadStatus.type === 'error'
                ? 'var(--error-dim)'
                : 'var(--bg-elevated)',
            borderLeft: `3px solid ${uploadStatus.type === 'success'
              ? 'var(--success)'
              : uploadStatus.type === 'error'
                ? 'var(--error)'
                : 'var(--accent-primary)'}`,
          }}
        >
          {uploadStatus.type === 'success' && <CheckCircle size={16} style={{ color: 'var(--success)', flexShrink: 0 }} />}
          {uploadStatus.type === 'error' && <AlertCircle size={16} style={{ color: 'var(--error)', flexShrink: 0 }} />}
          <span style={{ flex: 1, fontSize: '0.85rem' }}>{uploadStatus.message}</span>
          <button className="btn-icon" onClick={() => setUploadStatus(null)} style={{ flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="document-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="document-item" style={{ opacity: 0.5 }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 'var(--radius)' }} />
              <div className="document-info">
                <div className="skeleton" style={{ width: '60%', height: 16, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: '40%', height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
          <FileText size={40} className="empty-icon" />
          <h3>No documents yet</h3>
          <p>Upload your first document to start asking questions about it.</p>
        </div>
      ) : (
        <div className="document-list">
          {documents.map((doc) => {
            const icon = getFileIcon(doc.filename);
            return (
              <div key={doc.id} className="document-item">
                <div className={`document-icon ${icon.className}`}>
                  <FileText size={18} />
                </div>
                <div className="document-info">
                  <div className="document-name">{doc.filename}</div>
                  <div className="document-meta">
                    {doc.chunk_count !== undefined && (
                      <span>{doc.chunk_count} chunks</span>
                    )}
                    {doc.created_at && (
                      <>
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="document-actions">
                  <StatusBadge status={doc.status} />
                  <button
                    className="btn-icon"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deleting === doc.id}
                    title="Delete document"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {deleting === doc.id ? (
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
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
