'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bot } from 'lucide-react';
import { Chat } from '@/components/ui/chat';
import { cn } from '@/lib/utils';

interface ChatSession {
  id: number;
  title: string;
  chatbot: {
    id: number;
    name: string;
    provider: {
      name: string;
      type: string;
    };
  };
}

interface ChatSessionPageProps {
  token: string;
  onLogout: () => void;
}

export default function ChatSessionPage({ token, onLogout }: ChatSessionPageProps) {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch session
  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/v1/chats/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    append,
    stop,
    status,
    setMessages,
  } = useChat({
    api: `/api/v1/chats/${sessionId}/messages?stream=true`,
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Convert UIMessage to Message format expected by Chat component
  const formattedMessages = messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: typeof msg.content === 'string' ? msg.content : '',
    createdAt: msg.createdAt,
    experimental_attachments: msg.experimental_attachments,
    toolInvocations: msg.toolInvocations,
    parts: msg.parts,
  }));

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

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sohbet bulunamadı</h3>
          <Button onClick={() => router.push('/chat')}>
            Geri Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/chat')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Geri
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{session.title}</h1>
                <p className="text-sm text-gray-600">
                  {session.chatbot.name} • {session.chatbot.provider.name}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onLogout}>
              Çıkış
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Chat
          className="grow"
          messages={formattedMessages}
          handleSubmit={handleSubmit}
          input={input}
          handleInputChange={(e) => setInput(e.target.value)}
          isGenerating={isLoading}
          stop={stop}
          append={append}
          setMessages={setMessages}
          suggestions={[
            "Merhaba, nasılsın?",
            "Bugün hava nasıl?",
            "Bana kendinden bahseder misin?",
          ]}
        />
      </div>
    </div>
  );
}
