import React, { useState, useCallback } from 'react';
import { Upload, FileText, Trash2, Search, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Document {
  id: number;
  title: string;
  file_name: string;
  file_size: number;
  chunk_count: number;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  created_at: string;
  chatbot_id?: number;
}

interface DocumentManagerProps {
  chatbotId?: number;
  onDocumentsChange?: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ chatbotId, onDocumentsChange }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Upload document
  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (chatbotId) formData.append('chatbot_id', chatbotId.toString());

      const response = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const newDoc = await response.json();
      setDocuments(prev => [newDoc, ...prev]);
      onDocumentsChange?.();
      
      // Poll for status updates
      pollDocumentStatus(newDoc.id);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document');
    } finally {
      setUploading(false);
    }
  }, [chatbotId, onDocumentsChange]);

  // Poll document status
  const pollDocumentStatus = async (docId: number) => {
    const maxAttempts = 30;
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) return;

      try {
        const response = await fetch(`/api/v1/documents/${docId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) return;

        const doc = await response.json();
        setDocuments(prev =>
          prev.map(d => (d.id === docId ? doc : d))
        );

        if (doc.status === 'processing' || doc.status === 'pending') {
          attempts++;
          setTimeout(poll, 2000);
        } else {
          onDocumentsChange?.();
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    };

    poll();
  };

  // Delete document
  const handleDelete = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`/api/v1/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Delete failed');

      setDocuments(prev => prev.filter(d => d.id !== docId));
      onDocumentsChange?.();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document');
    }
  };

  // Search documents
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch('/api/v1/documents/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          chatbot_id: chatbotId,
          limit: 5,
        }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed');
    }
  };

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (chatbotId) params.append('chatbot_id', chatbotId.toString());

      const response = await fetch(`/api/v1/documents?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch documents');

      const data = await response.json();
      setDocuments(data.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }, [chatbotId]);

  // Load documents on mount
  React.useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                {uploading ? 'Uploading...' : 'Upload a document'}
              </span>
              <input
                id="file-upload"
                name="file-upload"
                type="file"
                accept=".txt,.md,.markdown"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
            <p className="mt-1 text-xs text-gray-500">
              TXT, MD, or Markdown up to 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Search Results</h3>
          <div className="space-y-2">
            {searchResults.map((result, idx) => (
              <div key={idx} className="bg-white p-3 rounded border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{result.payload.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{result.payload.text}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {(result.score * 100).toFixed(0)}% match
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold">Documents ({documents.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {documents.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No documents uploaded yet
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(doc.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.file_name} • {formatSize(doc.file_size)} • {doc.chunk_count} chunks
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="ml-4 p-2 text-red-500 hover:bg-red-50 rounded"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentManager;
