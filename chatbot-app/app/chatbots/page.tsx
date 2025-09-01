'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Loader2, Bot } from 'lucide-react';

interface Provider {
  id: number;
  name: string;
  type: string;
  description: string;
}

interface Chatbot {
  id: number;
  name: string;
  description: string;
  provider: Provider;
  is_active: boolean;
  is_public: boolean;
  system_prompt: string;
  config: string;
}

export default function ChatbotsPage() {
  const router = useRouter();
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    provider_id: '',
    is_public: false,
    system_prompt: '',
    config: '{"model": "llama2"}',
  });

  useEffect(() => {
    fetchChatbots();
    fetchProviders();
  }, []);

  const fetchChatbots = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/v1/chatbots', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChatbots(data.chatbots || []);
      } else if (response.status === 401) {
        localStorage.removeItem('authToken');
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to fetch chatbots:', error);
      setError('Failed to load chatbots');
    }
  };

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('/api/v1/providers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Validate that a provider is selected
    if (!formData.provider_id || formData.provider_id === '') {
      setError('Please select a provider');
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        router.push('/');
        return;
      }

      const submitData = {
        ...formData,
        provider_id: parseInt(formData.provider_id),
      };

      const response = await fetch('/api/v1/chatbots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('Chatbot created successfully!');
        setFormData({
          name: '',
          description: '',
          provider_id: '',
          is_public: false,
          system_prompt: '',
          config: '{"model": "llama2"}',
        });
        fetchChatbots(); // Refresh the list
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create chatbot');
      }
    } catch (error) {
      console.error('Failed to create chatbot:', error);
      setError('Failed to create chatbot');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading chatbots...</p>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Chatbots</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Chatbot Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Create New Chatbot</CardTitle>
                <CardDescription>
                  Configure a new chatbot with your preferred settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Chatbot Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g., My Assistant"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="provider">Provider <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.provider_id}
                      onValueChange={(value) => handleInputChange('provider_id', value)}
                      disabled={providers.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={providers.length === 0 ? "Loading providers..." : "Select a provider"} />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((provider, index) => {
                          const itemValue = provider.id?.toString() || `fallback-${index}`;
                          return (
                            <SelectItem 
                              key={provider.id || `provider-${index}`} 
                              value={itemValue}
                            >
                              {provider.name} ({provider.type})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {providers.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        No providers available. Please create a provider first.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Optional description..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="system_prompt">System Prompt</Label>
                    <Textarea
                      id="system_prompt"
                      placeholder="You are a helpful AI assistant..."
                      value={formData.system_prompt}
                      onChange={(e) => handleInputChange('system_prompt', e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="config">Configuration (JSON)</Label>
                    <Textarea
                      id="config"
                      placeholder='{"model": "llama2"}'
                      value={formData.config}
                      onChange={(e) => handleInputChange('config', e.target.value)}
                      rows={3}
                      className="font-mono text-sm"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Configuration must be valid JSON
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_public"
                      checked={formData.is_public}
                      onCheckedChange={(checked) =>
                        handleInputChange('is_public', checked as boolean)
                      }
                    />
                    <Label htmlFor="is_public">Make this chatbot public</Label>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert>
                      <AlertDescription className="text-green-700">
                        {success}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 mr-2" />
                        Create Chatbot
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Existing Chatbots List */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Your Chatbots</CardTitle>
                <CardDescription>
                  {chatbots.length} chatbot{chatbots.length !== 1 ? 's' : ''} configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                {chatbots.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No chatbots configured yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {chatbots.map((chatbot) => (
                      <div
                        key={chatbot.id}
                        className="border rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium flex items-center space-x-2">
                              <Bot className="w-4 h-4" />
                              <span>{chatbot.name}</span>
                            </h3>
                            <p className="text-sm text-gray-600">
                              Provider: {chatbot.provider?.name || 'Unknown'}
                            </p>
                            {chatbot.description && (
                              <p className="text-sm text-gray-500 mt-1">
                                {chatbot.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {chatbot.is_public && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Public
                              </span>
                            )}
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                chatbot.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {chatbot.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
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
