'use client';

import { Chat } from '@/components/ui/chat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Message } from '@/components/ui/chat-message';
import { ArrowLeft, Save, Loader2, Bot, Settings, Plus, MessageSquare } from 'lucide-react';

interface ChatInterfaceProps {
  token: string;
  onLogout: () => void;
}

interface Chatbot {
  id: number;
  name: string;
  description: string;
}

interface ChatSession {
  id: number;
  title: string;
  chatbot: Chatbot;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: number;
  role: string;
  content: string;
  created_at: string;
}

export function ChatInterface({ token, onLogout }: ChatInterfaceProps) {
  const router = useRouter();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    fetchChatbots();
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchMessages(selectedSession.id);
    }
  }, [selectedSession]);

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
      console.error('Failed to fetch chatbots:', error);
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
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/v1/chats/${sessionId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const formattedMessages: Message[] = (data.messages || []).map((msg: ChatMessage) => ({
          id: msg.id.toString(),
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
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
          title: `Chat with ${chatbots.find(c => c.id === chatbotId)?.name || 'Chatbot'}`,
          chatbot_id: chatbotId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newSession: ChatSession = {
          id: data.session.id,
          title: data.session.title,
          chatbot: data.session.chatbot,
          is_active: data.session.is_active,
          created_at: data.session.created_at,
          updated_at: data.session.updated_at,
        };
        setSessions(prev => [newSession, ...prev]);
        setSelectedSession(newSession);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleSessionSelect = (session: ChatSession) => {
    setSelectedSession(session);
  };

  const handleChatbotSelect = (chatbot: Chatbot) => {
    createNewSession(chatbot.id);
  };

  const handleSubmit = async (event?: { preventDefault?: () => void }, options?: { experimental_attachments?: FileList }) => {
    event?.preventDefault?.();
    if (!input.trim() || isGenerating || !selectedSession) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    setStreamError(null); // Clear any previous errors

    let retryCount = 0;
    const maxRetries = 2;
    const streamTimeout = 30000; // 30 seconds timeout

    const attemptStream = async (): Promise<void> => {
      const controller = new AbortController();
      setAbortController(controller);
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, streamTimeout);

      try {
        console.log('Starting stream attempt:', retryCount + 1);

        const response = await fetch(`/api/v1/chats/${selectedSession.id}/messages?stream=true`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: userMessage.content,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
            // Try to parse as JSON first
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
              throw new Error(`HTTP ${response.status}: ${errorJson.error}`);
            }
          } catch (jsonError) {
            // If it's not JSON, use the raw text
            if (errorText.trim()) {
              throw new Error(`HTTP ${response.status}: ${errorText.trim()}`);
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unknown error'}`);
            }
          }
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body reader available');
        }

        let assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
        };

        setMessages((prev) => [...prev, assistantMessage]);

        const decoder = new TextDecoder();
        let buffer = '';
        let lastChunkTime = Date.now();
        let streamEnded = false;

        // Monitor stream health
        const healthCheck = setInterval(() => {
          if (Date.now() - lastChunkTime > 10000) { // 10 seconds without data
            console.warn('Stream appears stalled');
          }
        }, 5000);

        try {
          while (!streamEnded) {
            const { done, value } = await reader.read();
            lastChunkTime = Date.now();

            if (done) {
              streamEnded = true;
              // Check if we received any content before the stream ended
              const lastMessage = messages[messages.length - 1];
              if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.content.trim()) {
                console.warn('Stream ended without content');
                // Remove empty assistant message
                setMessages((prev) => prev.slice(0, -1));
              }
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  streamEnded = true;
                  break;
                }

                try {
                  const parsed = JSON.parse(data);

                  // Check for error in stream data
                  if (parsed.error) {
                    throw new Error(`Stream error: ${parsed.error}`);
                  }

                  // Check for HTTP-like error responses in stream
                  if (parsed.status && parsed.status >= 400) {
                    throw new Error(`Stream HTTP error ${parsed.status}: ${parsed.message || 'Unknown error'}`);
                  }

                  // Handle completion with finish_reason
                  if (parsed.choices && parsed.choices[0]?.finish_reason) {
                    const finishReason = parsed.choices[0].finish_reason;
                    if (finishReason === 'stop') {
                      streamEnded = true;
                      break;
                    }
                  }

                  // Process content
                  if (parsed.choices && parsed.choices[0]?.delta?.content) {
                    const content = parsed.choices[0].delta.content;
                    setMessages((prev) => {
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      if (lastMessage.role === 'assistant') {
                        lastMessage.content += content;
                      }
                      return newMessages;
                    });
                  }
                } catch (parseError) {
                  // Check if this is a plain text error message from backend
                  if (data.trim() && !data.startsWith('{') && !data.startsWith('[')) {
                    // This looks like a plain text error message
                    console.error('Backend plain text error:', data.trim());
                    throw new Error(`Backend error: ${data.trim()}`);
                  } else if (parseError instanceof Error && !parseError.message.includes('JSON')) {
                    // Re-throw actual errors (not JSON parsing errors)
                    throw parseError;
                  } else {
                    console.warn('Failed to parse stream data:', parseError, 'Raw data:', data);
                    // Continue processing other lines for non-critical parse errors
                  }
                }
              }
            }
          }
        } finally {
          clearInterval(healthCheck);
          setAbortController(null);
          try {
            reader.releaseLock();
          } catch (e) {
            // Ignore release errors
          }
        }

        console.log('Stream completed successfully');
        setStreamError(null);

      } catch (error) {
        console.error(`Stream attempt ${retryCount + 1} failed:`, error);

        // Determine if we should retry
        const errorObj = error instanceof Error ? error : new Error(String(error));
        const shouldRetry = retryCount < maxRetries && (
          errorObj.name === 'AbortError' || // Timeout
          errorObj.message.includes('network') || // Network error
          errorObj.message.includes('fetch') || // Fetch error
          errorObj.message.includes('Failed to fetch') // Connection error
        );

        if (shouldRetry) {
          retryCount++;
          console.log(`Retrying stream (attempt ${retryCount + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
          return attemptStream();
        }

        // Final error - show to user
        let errorMessage = errorObj.message; // Show actual error message instead of generic message

        // For user-friendly display, we can still provide some context
        const userFriendlyMessage = `Hata: ${errorObj.message}`;

        const errorMsg: Message = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: userFriendlyMessage,
        };
        setMessages((prev) => [...prev, errorMsg]);
        setStreamError(userFriendlyMessage);
        setAbortController(null);

        throw error; // Re-throw to be caught by outer catch
      }
    };

    try {
      await attemptStream();
    } catch (error) {
      // Final error handling already done in attemptStream
      console.error('All streaming attempts failed:', error);
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const stop = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setIsGenerating(false);
    setStreamError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Şef Chat</h1>
              {selectedSession && (
                <Badge variant="secondary">
                  {selectedSession.chatbot.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/providers')}
                className="flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Providers</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/chatbots')}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Chatbots</span>
              </Button>
              <Button variant="outline" onClick={onLogout}>
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Sessions and Chatbots */}
          <div className="lg:col-span-1 space-y-6">
            {/* Chat Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Konuşmalar</span>
                </CardTitle>
                <CardDescription>
                  Önceki konuşmalarınız
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {sessions.map((session) => (
                    <Button
                      key={session.id}
                      variant={selectedSession?.id === session.id ? "default" : "outline"}
                      className="w-full justify-start text-left h-auto py-2 px-3"
                      onClick={() => handleSessionSelect(session)}
                    >
                      <div className="truncate">
                        <div className="font-medium text-sm truncate">{session.title}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {session.chatbot.name}
                        </div>
                      </div>
                    </Button>
                  ))}
                  {sessions.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Henüz konuşma yok.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Available Chatbots */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="w-4 h-4" />
                  <span>Chatbotlar</span>
                </CardTitle>
                <CardDescription>
                  Yeni konuşma başlat
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {chatbots.map((chatbot) => (
                    <Button
                      key={chatbot.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleChatbotSelect(chatbot)}
                      disabled={creatingSession}
                    >
                      {creatingSession ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Bot className="w-4 h-4 mr-2" />
                      )}
                      {chatbot.name}
                    </Button>
                  ))}
                  {chatbots.length === 0 && (
                    <p className="text-sm text-gray-500">
                      Henüz chatbot bulunmuyor.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="lg:col-span-3">
            <Card className="h-[600px]">
              <CardContent className="p-0 h-full">
                {streamError && (
                  <div className="bg-red-50 border-b border-red-200 p-3">
                    <div className="flex items-center space-x-2">
                      <div className="text-red-600 text-sm">
                        ⚠️ {streamError}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStreamError(null)}
                        className="h-6 px-2 text-xs"
                      >
                        Kapat
                      </Button>
                    </div>
                  </div>
                )}
                {selectedSession ? (
                  <Chat
                    messages={messages}
                    handleSubmit={handleSubmit}
                    input={input}
                    handleInputChange={handleInputChange}
                    isGenerating={isGenerating}
                    stop={stop}
                    setMessages={setMessages}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Konuşma Seçin veya Başlatın
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Soldaki listeden önceki bir konuşmayı seçin veya yeni bir konuşma başlatın.
                      </p>
                      {chatbots.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">Hızlı Başlat:</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {chatbots.slice(0, 3).map((chatbot) => (
                              <Button
                                key={chatbot.id}
                                variant="outline"
                                size="sm"
                                onClick={() => handleChatbotSelect(chatbot)}
                                disabled={creatingSession}
                              >
                                {creatingSession ? (
                                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Bot className="w-3 h-3 mr-1" />
                                )}
                                {chatbot.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
