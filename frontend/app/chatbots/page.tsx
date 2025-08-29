'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../components/auth/protected-route';
import { UserMenu } from '../../components/auth/user-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Bot, Sparkles, Zap, Brain, MessageSquare, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../lib/api/client';

interface Provider {
  id: number;
  name: string;
  type: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface User {
  id: number;
  name: string;
  username: string;
  super_admin: boolean;
  created_at: string;
  updated_at: string;
}

interface Chatbot {
  id: number;
  name: string;
  description: string;
  provider_id: number;
  provider: Provider;
  user_id: number;
  user: User;
  is_active: boolean;
  is_public: boolean;
  system_prompt: string;
  config: string;
  created_at: string;
  updated_at: string;
}

function ChatbotSelector() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchChatbots();
  }, []);

  const fetchChatbots = async () => {
    try {
      const response = await apiClient.getChatbots();
      setChatbots(response.chatbots || []);
    } catch (error) {
      console.error('Failed to fetch chatbots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatbotSelect = (chatbot: Chatbot) => {
    setSelectedChatbot(chatbot);
  };

  const handleStartChat = () => {
    if (selectedChatbot) {
      // Chat sayfasına chatbot ID'si ile yönlendirme
      router.push(`/chat?chatbot=${selectedChatbot.id}`);
    }
  };

  const getProviderIcon = (providerType: string) => {
    switch (providerType) {
      case 'openai':
        return <Sparkles className="h-8 w-8 text-purple-500" />;
      case 'anthropic':
        return <Brain className="h-8 w-8 text-blue-500" />;
      case 'ollama':
        return <Bot className="h-8 w-8 text-green-500" />;
      default:
        return <Bot className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Bot className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Şef AI Chat
              </h1>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            AI Asistanınızı Seçin
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Hazır chatbot'larınızla sohbet edin, sorular sorun ve görevleri tamamlayın.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chatbot'lar yükleniyor...</p>
          </div>
        )}

        {/* Chatbots Grid */}
        {!loading && (
          <>
            {chatbots.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Henüz chatbot bulunmuyor</h3>
                <p className="text-gray-600 mb-6">İlk chatbot'unuzu oluşturmak için admin paneline gidin.</p>
                <Button onClick={() => router.push('/admin/chatbots')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Chatbot Oluştur
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {chatbots.map((chatbot) => (
                    <Card
                      key={chatbot.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        selectedChatbot?.id === chatbot.id
                          ? 'ring-2 ring-indigo-500 shadow-lg'
                          : 'hover:shadow-md'
                      } ${!chatbot.is_active ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => chatbot.is_active && handleChatbotSelect(chatbot)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          {getProviderIcon(chatbot.provider.type)}
                          {selectedChatbot?.id === chatbot.id && (
                            <Badge variant="default" className="bg-indigo-600">
                              Seçildi
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{chatbot.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {chatbot.description || 'Açıklama bulunmuyor'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                              Provider
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {chatbot.provider.name} ({chatbot.provider.type})
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                              Oluşturan
                            </p>
                            <div className="flex items-center space-x-2">
                              <User className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-600">{chatbot.user.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <Badge
                              variant={chatbot.is_public ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {chatbot.is_public ? 'Herkese Açık' : 'Özel'}
                            </Badge>
                            {!chatbot.is_active && (
                              <Badge variant="destructive" className="text-xs">
                                Pasif
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Action Section */}
                <div className="text-center">
                  <Button
                    onClick={handleStartChat}
                    disabled={!selectedChatbot}
                    size="lg"
                    className="px-8 py-3 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    {selectedChatbot ? `${selectedChatbot.name} ile Sohbet Başlat` : 'Önce bir chatbot seçin'}
                  </Button>

                  <div className="mt-6">
                    <Button variant="outline" className="px-6" onClick={() => router.push('/admin/chatbots')}>
                      <Settings className="h-4 w-4 mr-2" />
                      Chatbot Yönetimi
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-white/60 backdrop-blur-sm rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Nasıl Çalışır?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bot className="h-6 w-6 text-indigo-600" />
              </div>
              <h4 className="font-medium mb-2">Chatbot Seçin</h4>
              <p>Kullanmak istediğiniz chatbot'u seçin.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium mb-2">Sohbet Başlatın</h4>
              <p>Seçtiğiniz chatbot ile anında sohbet etmeye başlayın.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium mb-2">Sonuçları Alın</h4>
              <p>Chatbot'unuzun uzmanlık alanına göre yardımcı yanıtlar alın.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ChatbotsPage() {
  return (
    <ProtectedRoute>
      <ChatbotSelector />
    </ProtectedRoute>
  );
}
