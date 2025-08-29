'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../components/auth/protected-route';
import { UserMenu } from '../../components/auth/user-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { History, MessageSquare, Calendar, Bot, Trash2, Search, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api/client';

interface ChatSession {
  id: number;
  user_id: number;
  title: string;
  provider: string;
  ai_model: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

interface Message {
  id: number;
  session_id: number;
  role: string;
  content: string;
  token_count: number;
  created_at: string;
}

function ChatHistoryPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [sessions, searchTerm]);

  const fetchSessions = async () => {
    try {
      const response = await apiClient.getUserSessions();
      setSessions(response.sessions || []);
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    if (!searchTerm) {
      setFilteredSessions(sessions);
      return;
    }

    const filtered = sessions.filter(session =>
      session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.ai_model.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSessions(filtered);
  };

  const handleSessionClick = async (session: ChatSession) => {
    if (selectedSession?.id === session.id) {
      setSelectedSession(null);
      setShowMessages(false);
      return;
    }

    setSelectedSession(session);
    setShowMessages(false);

    // Fetch messages if not already loaded
    if (!session.messages) {
      try {
        const response = await apiClient.getSessionMessages(session.id);
        const updatedSession = { ...session, messages: response.messages || [] };
        setSelectedSession(updatedSession);

        // Update in sessions list
        setSessions(prev => prev.map(s => s.id === session.id ? updatedSession : s));
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    }
  };

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Bu sohbet oturumunu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      await apiClient.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setShowMessages(false);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Sohbet oturumu silinirken hata oluştu');
    }
  };

  const handleContinueChat = (session: ChatSession) => {
    router.push(`/chat?session=${session.id}&model=${session.ai_model}&provider=${session.provider}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'bg-blue-100 text-blue-800';
      case 'anthropic': return 'bg-purple-100 text-purple-800';
      case 'ollama': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <Bot className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Sohbet geçmişi yükleniyor...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <History className="h-8 w-8 text-indigo-600" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Sohbet Geçmişi
                </h1>
              </div>
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Search and Filter */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Sohbet başlığı, provider veya model ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Filtrele
              </Button>
            </div>
          </div>

          {sessions.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Henüz sohbet yok
                </h3>
                <p className="text-gray-600 mb-6">
                  İlk sohbetinizi başlatmak için chatbot seçimi sayfasına gidin.
                </p>
                <Button onClick={() => router.push('/chatbots')}>
                  Chatbot'ları Keşfet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sessions List */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Sohbet Oturumları ({filteredSessions.length})
                </h2>

                {filteredSessions.map((session) => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedSession?.id === session.id
                        ? 'ring-2 ring-indigo-500 shadow-lg'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => handleSessionClick(session)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base line-clamp-2">
                            {session.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <div className="flex items-center space-x-2 text-xs">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(session.created_at)}</span>
                            </div>
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getProviderColor(session.provider)}>
                            {session.provider}
                          </Badge>
                          <Badge variant="outline">
                            {session.ai_model}
                          </Badge>
                          {!session.is_active && (
                            <Badge variant="secondary">Pasif</Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleContinueChat(session);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          Devam Et
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Messages Panel */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedSession ? 'Mesajlar' : 'Mesajları görmek için bir sohbet seçin'}
                </h2>

                {selectedSession && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{selectedSession.title}</CardTitle>
                      <CardDescription>
                        {selectedSession.messages?.length || 0} mesaj
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedSession.messages && selectedSession.messages.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {selectedSession.messages.map((message) => (
                            <div
                              key={message.id}
                              className={`p-3 rounded-lg ${
                                message.role === 'user'
                                  ? 'bg-indigo-100 ml-8'
                                  : 'bg-gray-100 mr-8'
                              }`}
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge
                                  variant={message.role === 'user' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {message.role === 'user' ? 'Siz' : 'AI'}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {formatDate(message.created_at)}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">
                                {message.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          Bu sohbette henüz mesaj yok
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default ChatHistoryPage;
