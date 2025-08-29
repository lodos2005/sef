'use client';

import { ArrowLeft, Bot } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ProtectedRoute } from '../../components/auth/protected-route';
import { UserMenu } from '../../components/auth/user-menu';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { ChatMessage } from '../../components/ui/chat-message';
import { MessageInput } from '../../components/ui/message-input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Separator } from '../../components/ui/separator';
import { apiClient } from '../../lib/api/client';

interface Chatbot {
  id: number;
  name: string;
  description: string;
  provider_id: number;
  provider: {
    id: number;
    name: string;
    type: string;
    description: string;
    is_active: boolean;
    config: string;
    created_at: string;
    updated_at: string;
  };
  user_id: number;
  user: {
    id: number;
    name: string;
    username: string;
    super_admin: boolean;
    created_at: string;
    updated_at: string;
  };
  is_active: boolean;
  is_public: boolean;
  system_prompt: string;
  config: string;
  created_at: string;
  updated_at: string;
}

interface ChatSession {
  id: number;
  user_id: number;
  chatbot_id: number;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name: string;
    username: string;
  };
  chatbot?: Chatbot;
  messages?: Message[];
}

interface Message {
  id: number;
  session_id: number;
  role: string;
  content: string;
  created_at: string;
}

interface StreamingMessage {
  id: string;
  role: 'assistant';
  content: string;
  isStreaming: boolean;
}

function ChatInterface() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatbotId = searchParams.get('chatbot');

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<(Message | StreamingMessage)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatbotId) {
      router.push('/chatbots');
      return;
    }
    initializeChat();
  }, [chatbotId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      setIsLoading(true);

      // Chatbot bilgilerini al
      const chatbotsResponse = await apiClient.getChatbots();
      const foundChatbot = chatbotsResponse.chatbots.find((c: Chatbot) => c.id === parseInt(chatbotId!));

      if (!foundChatbot) {
        throw new Error('Chatbot bulunamadı');
      }

      setChatbot(foundChatbot);

      // Kullanıcının bu chatbot ile aktif session'ı var mı kontrol et
      const sessionsResponse = await apiClient.getUserSessions();
      const existingSession = sessionsResponse.sessions?.find(
        (s: ChatSession) => s.chatbot_id === foundChatbot.id && s.is_active
      );

      if (existingSession) {
        setSession(existingSession);
        // Mevcut mesajları yükle
        const sessionMessages = await apiClient.getSessionMessages(existingSession.id);
        setMessages(sessionMessages);
      } else {
        // Yeni session oluştur
        const newSession = await apiClient.createChatSession({
          title: `${foundChatbot.name} ile Sohbet`,
          chatbot_id: foundChatbot.id
        });
        setSession(newSession);
        setMessages([]);
      }
    } catch (error) {
      console.error('Chat başlatma hatası:', error);
      router.push('/chatbots');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!session || !content.trim()) return;

    try {
      setIsStreaming(true);

      // Kullanıcı mesajını ekle
      const userMessage: Message = {
        id: Date.now(),
        session_id: session.id,
        role: 'user',
        content: content.trim(),
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue('');

      // Streaming mesaj için placeholder oluştur
      const streamingMessageId = `streaming-${Date.now()}`;
      const streamingMessage: StreamingMessage = {
        id: streamingMessageId,
        role: 'assistant',
        content: '',
        isStreaming: true
      };

      setMessages(prev => [...prev, streamingMessage]);

      // API'ye mesaj gönder ve streaming yanıtını al
      const response = await fetch(`${apiClient.getBaseURL()}/api/v1/chats/${session.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: content.trim(),
          role: 'user'
        })
      });

      if (!response.ok) {
        throw new Error('Mesaj gönderilemedi');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body not available');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedContent += parsed.content;

                setMessages(prev => prev.map(msg =>
                  msg.id === streamingMessageId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                ));
              }
            } catch (e) {
              // JSON parse hatası, devam et
            }
          }
        }
      }

      // Streaming tamamlandı, gerçek mesaj olarak kaydet
      setMessages(prev => prev.map(msg =>
        msg.id === streamingMessageId
          ? {
              id: Date.now(),
              session_id: session.id,
              role: 'assistant',
              content: accumulatedContent,
              created_at: new Date().toISOString()
            }
          : msg
      ));

    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      // Hata durumunda streaming mesajı kaldır
      setMessages(prev => prev.filter(msg => {
        if ('isStreaming' in msg) {
          return !msg.isStreaming;
        }
        return true;
      }));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSendMessage = () => {
    if (inputValue.trim() && !isStreaming) {
      sendMessage(inputValue);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Sohbet hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  if (!chatbot || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sohbet başlatılamadı</h2>
          <p className="text-gray-600 mb-4">Chatbot bulunamadı veya erişim izniniz yok.</p>
          <Button onClick={() => router.push('/chatbots')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Chatbot'lara Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/chatbots')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <Bot className="h-8 w-8 text-indigo-600" />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {chatbot.name}
                  </h1>
                  <p className="text-sm text-gray-600">{chatbot.provider.name} ({chatbot.provider.type})</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={chatbot.is_active ? "default" : "secondary"}>
                {chatbot.is_active ? 'Aktif' : 'Pasif'}
              </Badge>
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto p-4 h-[calc(100vh-140px)]">
        <Card className="h-full flex flex-col bg-white/60 backdrop-blur-sm">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="h-16 w-16 text-indigo-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {chatbot.name} ile sohbetinize başlayın
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    {chatbot.description || 'Bu chatbot ile ilgili sorularınızı sorabilirsiniz.'}
                  </p>
                </div>
              )}

              {messages.map((message) => {
                if ('isStreaming' in message) {
                  // Streaming message için özel render
                  return (
                    <div key={message.id} className="flex items-start space-x-3 mb-4">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-sm">{message.content}</p>
                          {message.isStreaming && (
                            <div className="flex items-center space-x-2 mt-2 text-gray-500">
                              <div className="animate-pulse text-xs">Yazıyor...</div>
                              <div className="flex space-x-1">
                                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Normal message için ChatMessage component kullan
                  return (
                    <ChatMessage
                      key={message.id}
                      id={message.id.toString()}
                      role={message.role}
                      content={message.content}
                      createdAt={new Date(message.created_at)}
                      showTimeStamp={false}
                      animation="scale"
                    />
                  );
                }
              })}

              {isStreaming && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="animate-pulse">AI düşünüyor...</div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          <Separator />

          {/* Input Area */}
          <div className="p-4">
            <MessageInput
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              isGenerating={isStreaming}
              placeholder={`${chatbot.name} ile sohbet edin...`}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatInterface />
    </ProtectedRoute>
  );
}
