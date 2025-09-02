'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, Plus, Bot, Clock } from 'lucide-react';

interface Chatbot {
  id: number;
  name: string;
  description: string;
  provider: {
    id: number;
    name: string;
    type: string;
  };
  is_active: boolean;
  is_public: boolean;
}

interface ChatSession {
  id: number;
  title: string;
  chatbot: Chatbot;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatPageProps {
  token: string;
  onLogout: () => void;
}

export default function ChatPage({ token, onLogout }: ChatPageProps) {
  const router = useRouter();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);

  // Fetch chatbots and sessions
  useEffect(() => {
    fetchChatbots();
    fetchSessions();
  }, []);

  const fetchChatbots = async () => {
    try {
      const response = await fetch('/api/v1/chatbots', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChatbots(data.chatbots || []);
      }
    } catch (error) {
      console.error('Error fetching chatbots:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/v1/chats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async (chatbotId: number) => {
    setCreatingSession(true);
    try {
      const response = await fetch('/api/v1/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatbot_id: chatbotId,
          title: `Chat with ${chatbots.find(c => c.id === chatbotId)?.name || 'Chatbot'}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to the chat interface with the new session
        router.push(`/chat/${data.session.id}`);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setCreatingSession(false);
    }
  };

  const selectSession = (session: ChatSession) => {
    router.push(`/chat/${session.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Şef AI Chat</h1>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Çıkış
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Son Sohbetler</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sessions.slice(0, 6).map((session) => (
                <Card
                  key={session.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => selectSession(session)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{session.title}</CardTitle>
                      <MessageSquare className="h-5 w-5 text-gray-400" />
                    </div>
                    <CardDescription>
                      {session.chatbot.name} • {new Date(session.created_at).toLocaleDateString('tr-TR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant={session.is_active ? "default" : "secondary"}>
                        {session.is_active ? "Aktif" : "Kapalı"}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {session.chatbot.provider.name}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Chatbots */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Mevcut Chatbotlar</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {chatbots.map((chatbot) => (
              <Card key={chatbot.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      {chatbot.name}
                    </CardTitle>
                    <Badge variant={chatbot.is_active ? "default" : "secondary"}>
                      {chatbot.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                  <CardDescription>{chatbot.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Provider:</span>
                      <span className="font-medium">{chatbot.provider.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Tip:</span>
                      <span className="font-medium">{chatbot.provider.type}</span>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createNewSession(chatbot.id)}
                      disabled={creatingSession || !chatbot.is_active}
                    >
                      {creatingSession ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Oluşturuluyor...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Yeni Sohbet Başlat
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {chatbots.length === 0 && (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz chatbot yok</h3>
              <p className="text-gray-600 mb-4">
                Sohbet edebilmek için önce bir chatbot oluşturmanız gerekiyor.
              </p>
              <Button onClick={() => router.push('/chatbots')}>
                Chatbot Oluştur
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
