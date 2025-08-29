'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api/client';
import { Chatbot, CreateChatbotRequest, Provider, Tool } from '@/lib/api/types';

export default function ChatbotsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [newChatbot, setNewChatbot] = useState({
    name: '',
    description: '',
    provider_id: 0,
    is_public: false,
    system_prompt: '',
    config: '',
    tool_ids: [] as number[],
  });
  const [creating, setCreating] = useState(false);

  // Fetch chatbots on component mount
  useEffect(() => {
    fetchChatbots();
    fetchProviders();
    fetchTools();
  }, []);

  const fetchChatbots = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getChatbots();
      setChatbots(data.chatbots || []);
    } catch (error) {
      console.error('Failed to fetch chatbots:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      setProvidersLoading(true);
      const data = await apiClient.getProviders();
      setProviders(data.providers || []);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setProvidersLoading(false);
    }
  };

  const fetchTools = async () => {
    try {
      setToolsLoading(true);
      const data = await apiClient.getTools();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Failed to fetch tools:', error);
    } finally {
      setToolsLoading(false);
    }
  };

  const filteredChatbots = chatbots?.filter(chatbot =>
    chatbot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chatbot.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreateChatbot = async () => {
    // Validation
    if (!newChatbot.name.trim()) {
      alert('Chatbot adı zorunludur');
      return;
    }
    if (newChatbot.provider_id === 0) {
      alert('Provider seçimi zorunludur');
      return;
    }

    try {
      setCreating(true);

      // Parse config JSON if provided
      let config = {};
      if (newChatbot.config.trim()) {
        try {
          config = JSON.parse(newChatbot.config);
        } catch (error) {
          alert('Config geçerli bir JSON olmalıdır');
          return;
        }
      }

      const chatbotData: CreateChatbotRequest = {
        name: newChatbot.name,
        description: newChatbot.description,
        provider_id: newChatbot.provider_id,
        is_public: newChatbot.is_public,
        system_prompt: newChatbot.system_prompt,
        config: config,
        tool_ids: newChatbot.tool_ids,
      };

      await apiClient.createChatbot(chatbotData);
      setIsCreateDialogOpen(false);
      setNewChatbot({
        name: '',
        description: '',
        provider_id: 0,
        is_public: false,
        system_prompt: '',
        config: '',
        tool_ids: [],
      });
      fetchChatbots(); // Refresh the list
    } catch (error) {
      console.error('Failed to create chatbot:', error);
      alert('Chatbot oluşturma başarısız: ' + (error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Aktif</Badge>
    ) : (
      <Badge variant="secondary">Pasif</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chatbot Yönetimi</h1>
          <p className="text-gray-600">Sistemdeki chatbotları yönetin</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Chatbot ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Chatbot
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Chatbot Oluştur</DialogTitle>
                <DialogDescription>
                  Sistem için yeni bir chatbot tanımlayın. Tüm alanları doldurun ve gerekli konfigürasyonları yapın.
                </DialogDescription>
              </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  İsim <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={newChatbot.name}
                  onChange={(e) => setNewChatbot({...newChatbot, name: e.target.value})}
                  className="col-span-3"
                  placeholder="Chatbot adı"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Açıklama
                </Label>
                <Textarea
                  id="description"
                  value={newChatbot.description}
                  onChange={(e) => setNewChatbot({...newChatbot, description: e.target.value})}
                  className="col-span-3"
                  placeholder="Chatbot açıklaması"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="provider" className="text-right">
                  Provider <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={newChatbot.provider_id.toString()}
                  onValueChange={(value) => setNewChatbot({...newChatbot, provider_id: parseInt(value)})}
                  disabled={providersLoading || providers.length === 0}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={
                      providersLoading
                        ? "Provider'lar yükleniyor..."
                        : providers.length === 0
                        ? "Hiç provider bulunamadı"
                        : "Provider seçin"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id ? provider.id.toString() : '0'}>
                        {provider.name} ({provider.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="system_prompt" className="text-right">
                  Sistem Prompt
                </Label>
                <Textarea
                  id="system_prompt"
                  value={newChatbot.system_prompt}
                  onChange={(e) => setNewChatbot({...newChatbot, system_prompt: e.target.value})}
                  className="col-span-3"
                  placeholder="Sen yardımcı bir AI asistansın. Kullanıcılara nazik ve bilgilendirici şekilde yanıt ver."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="config" className="text-right">
                  Config (JSON)
                </Label>
                <Textarea
                  id="config"
                  value={newChatbot.config}
                  onChange={(e) => setNewChatbot({...newChatbot, config: e.target.value})}
                  className="col-span-3 font-mono text-sm"
                  placeholder='{"temperature": 0.7, "max_tokens": 1000}'
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Araçlar
                </Label>
                <div className="col-span-3 space-y-2">
                  {toolsLoading ? (
                    <div className="text-sm text-gray-500">Araçlar yükleniyor...</div>
                  ) : tools.length === 0 ? (
                    <div className="text-sm text-gray-500">Hiç araç bulunamadı</div>
                  ) : (
                    tools.map((tool) => (
                      <div key={tool.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tool-${tool.id}`}
                          checked={newChatbot.tool_ids.includes(tool.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewChatbot({
                                ...newChatbot,
                                tool_ids: [...newChatbot.tool_ids, tool.id]
                              });
                            } else {
                              setNewChatbot({
                                ...newChatbot,
                                tool_ids: newChatbot.tool_ids.filter(id => id !== tool.id)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={`tool-${tool.id}`} className="text-sm">
                          {tool.name} - {tool.description}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Genel Erişim
                </Label>
                <div className="col-span-3 flex items-center space-x-2">
                  <Checkbox
                    id="is_public"
                    checked={newChatbot.is_public}
                    onCheckedChange={(checked) =>
                      setNewChatbot({...newChatbot, is_public: checked as boolean})
                    }
                  />
                  <Label htmlFor="is_public" className="text-sm">
                    Bu chatbot'u diğer kullanıcılar da kullanabilir
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateChatbot} disabled={creating}>
                {creating ? 'Oluşturuluyor...' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Chatbot</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chatbots?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Chatbot</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chatbots?.filter(c => c.status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kullanım</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chatbots?.reduce((sum, c) => sum + (c.usage || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pasif Chatbot</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {chatbots?.filter(c => c.status !== 'active').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chatbots Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chatbot Listesi</CardTitle>
          <CardDescription>
            Sistemde tanımlı tüm chatbotları görüntüleyin ve yönetin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İsim</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Kullanım</TableHead>
                <TableHead>Oluşturulma</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2">Yükleniyor...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredChatbots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Chatbot bulunamadı
                  </TableCell>
                </TableRow>
              ) : (
                filteredChatbots.map((chatbot) => (
                <TableRow key={chatbot.id}>
                  <TableCell className="font-medium">{chatbot.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{chatbot.description}</TableCell>
                  <TableCell>{chatbot.provider && JSON.parse(chatbot.provider.config).model}</TableCell>
                  <TableCell>{chatbot.provider && chatbot.provider.name}</TableCell>
                  <TableCell>{getStatusBadge(chatbot.status)}</TableCell>
                  <TableCell>{chatbot.usage || 0}</TableCell>
                  <TableCell>{chatbot.createdAt}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Görüntüle
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
