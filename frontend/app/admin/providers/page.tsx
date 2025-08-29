'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api/client';
import { CreateProviderRequest, Provider } from '@/lib/api/types';
import {
  CheckCircle,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  TestTube,
  Trash2,
  XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';

const providerTypes = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'custom', label: 'Custom API' },
];

export default function ProvidersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProvider, setNewProvider] = useState({
    name: '',
    type: '',
    apiKey: '',
    baseUrl: '',
    config: {} as Record<string, any>,
  });

  // Fetch providers on component mount
  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProviders();
      setProviders(response.providers || []);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter((provider: Provider) =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateProvider = async () => {
    try {
      const providerData: CreateProviderRequest = {
        name: newProvider.name,
        type: newProvider.type,
        apiKey: newProvider.apiKey,
        baseUrl: newProvider.baseUrl,
        config: newProvider.config,
      };

      await apiClient.createProvider(providerData);
      setIsCreateDialogOpen(false);
      setNewProvider({ name: '', type: '', apiKey: '', baseUrl: '', config: {} });
      fetchProviders(); // Refresh the list
    } catch (error) {
      console.error('Failed to create provider:', error);
      // TODO: Add proper error handling with toast notifications
    }
  };

  const handleTestProvider = async (provider: Provider) => {
    try {
      // Test API call - this might need a separate endpoint
      console.log('Testing provider:', provider.name);
    } catch (error) {
      console.error('Failed to test provider:', error);
    }
  };

  const handleConfigureProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setIsConfigDialogOpen(true);
  };

  const handleDeleteProvider = async (provider: Provider) => {
    if (!confirm(`"${provider.name}" providerını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      await apiClient.deleteProvider(provider.id);
      fetchProviders(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete provider:', error);
      // TODO: Add proper error handling with toast notifications
    }
  };

  const getConfigFields = (providerType: string) => {
    const config = newProvider.config;

    switch (providerType) {
      case 'openai':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">
                Model
              </Label>
              <Select
                value={config.model || ''}
                onValueChange={(value) => setNewProvider({
                  ...newProvider,
                  config: { ...config, model: value }
                })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Model seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="temperature" className="text-right">
                Temperature
              </Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature || ''}
                onChange={(e) => setNewProvider({
                  ...newProvider,
                  config: { ...config, temperature: parseFloat(e.target.value) || 0.7 }
                })}
                className="col-span-3"
                placeholder="0.7"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxTokens" className="text-right">
                Max Tokens
              </Label>
              <Input
                id="maxTokens"
                type="number"
                value={config.max_tokens || ''}
                onChange={(e) => setNewProvider({
                  ...newProvider,
                  config: { ...config, max_tokens: parseInt(e.target.value) || 1000 }
                })}
                className="col-span-3"
                placeholder="1000"
              />
            </div>
          </div>
        );

      case 'anthropic':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">
                Model
              </Label>
              <Select
                value={config.model || ''}
                onValueChange={(value) => setNewProvider({
                  ...newProvider,
                  config: { ...config, model: value }
                })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Model seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                  <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="temperature" className="text-right">
                Temperature
              </Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature || ''}
                onChange={(e) => setNewProvider({
                  ...newProvider,
                  config: { ...config, temperature: parseFloat(e.target.value) || 0.7 }
                })}
                className="col-span-3"
                placeholder="0.7"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxTokens" className="text-right">
                Max Tokens
              </Label>
              <Input
                id="maxTokens"
                type="number"
                value={config.max_tokens || ''}
                onChange={(e) => setNewProvider({
                  ...newProvider,
                  config: { ...config, max_tokens: parseInt(e.target.value) || 1000 }
                })}
                className="col-span-3"
                placeholder="1000"
              />
            </div>
          </div>
        );

      case 'ollama':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">
                Model
              </Label>
              <Input
                id="model"
                value={config.model || ''}
                onChange={(e) => setNewProvider({
                  ...newProvider,
                  config: { ...config, model: e.target.value }
                })}
                className="col-span-3"
                placeholder="llama2:7b"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="temperature" className="text-right">
                Temperature
              </Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature || ''}
                onChange={(e) => setNewProvider({
                  ...newProvider,
                  config: { ...config, temperature: parseFloat(e.target.value) || 0.7 }
                })}
                className="col-span-3"
                placeholder="0.7"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="numPredict" className="text-right">
                Num Predict
              </Label>
              <Input
                id="numPredict"
                type="number"
                value={config.num_predict || ''}
                onChange={(e) => setNewProvider({
                  ...newProvider,
                  config: { ...config, num_predict: parseInt(e.target.value) || 1000 }
                })}
                className="col-span-3"
                placeholder="1000"
              />
            </div>
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="model" className="text-right">
                Model
              </Label>
              <Input
                id="model"
                value={config.model || ''}
                onChange={(e) => setNewProvider({
                  ...newProvider,
                  config: { ...config, model: e.target.value }
                })}
                className="col-span-3"
                placeholder="Model adı"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="temperature" className="text-right">
                Temperature
              </Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature || ''}
                onChange={(e) => setNewProvider({
                  ...newProvider,
                  config: { ...config, temperature: parseFloat(e.target.value) || 0.7 }
                })}
                className="col-span-3"
                placeholder="0.7"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxTokens" className="text-right">
                Max Tokens
              </Label>
              <Input
                id="maxTokens"
                type="number"
                value={config.max_tokens || ''}
                onChange={(e) => setNewProvider({
                  ...newProvider,
                  config: { ...config, max_tokens: parseInt(e.target.value) || 1000 }
                })}
                className="col-span-3"
                placeholder="1000"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Aktif</Badge>
    ) : (
      <Badge variant="secondary">Pasif</Badge>
    );
  };

  const getTestStatusIcon = (status: string) => {
    return status === 'success' ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Provider Yönetimi</h1>
          <p className="text-gray-600">LLM providerlarını yapılandırın ve yönetin</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Provider Ekle</DialogTitle>
              <DialogDescription>
                Sistem için yeni bir LLM provider tanımlayın.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  İsim
                </Label>
                <Input
                  id="name"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({...newProvider, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Tip
                </Label>
                <Select value={newProvider.type} onValueChange={(value) => setNewProvider({...newProvider, type: value, config: {}})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Provider tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="apiKey" className="text-right">
                  API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={newProvider.apiKey}
                  onChange={(e) => setNewProvider({...newProvider, apiKey: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="baseUrl" className="text-right">
                  Base URL
                </Label>
                <Input
                  id="baseUrl"
                  value={newProvider.baseUrl}
                  onChange={(e) => setNewProvider({...newProvider, baseUrl: e.target.value})}
                  className="col-span-3"
                />
              </div>
              {newProvider.type && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">
                    Yapılandırma
                  </Label>
                  <div className="col-span-3 space-y-4">
                    {getConfigFields(newProvider.type)}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleCreateProvider}>Ekle</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Provider ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Provider</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Provider</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.filter((p: Provider) => p.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Başarılı Test</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
        </Card>
      </div>

      {/* Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Listesi</CardTitle>
          <CardDescription>
            Yapılandırılmış tüm providerları görüntüleyin ve yönetin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Providerlar yükleniyor...</p>
              </div>
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {searchTerm ? 'Aranan kriterlere uygun provider bulunamadı.' : 'Henüz hiç provider eklenmemiş.'}
              </p>
            </div>
          ) : (
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İsim</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Son Test</TableHead>
                <TableHead>Test Durumu</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProviders.map((provider: Provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium">{provider.name}</TableCell>
                  <TableCell>{provider.type}</TableCell>
                  <TableCell>{getStatusBadge(provider.status)}</TableCell>
                  <TableCell>{provider.config?.model || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">{provider.baseUrl || '-'}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleTestProvider(provider as Provider)}>
                          <TestTube className="mr-2 h-4 w-4" />
                          Test Et
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleConfigureProvider(provider as Provider)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Yapılandır
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteProvider(provider)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Provider Yapılandırması</DialogTitle>
            <DialogDescription>
              {selectedProvider?.name} provider ayarlarını düzenleyin.
            </DialogDescription>
          </DialogHeader>
          {selectedProvider && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="config-name" className="text-right">
                  İsim
                </Label>
                <Input
                  id="config-name"
                  defaultValue={selectedProvider.name}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="config-apiKey" className="text-right">
                  API Key
                </Label>
                <Input
                  id="config-apiKey"
                  type="password"
                  defaultValue={selectedProvider.apiKey}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="config-baseUrl" className="text-right">
                  Base URL
                </Label>
                <Input
                  id="config-baseUrl"
                  defaultValue={selectedProvider.baseUrl}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Yapılandırma
                </Label>
                <div className="col-span-3 space-y-4">
                  {/* Config fields will be added here */}
                  <p className="text-sm text-gray-500">Yapılandırma ayarları burada görüntülenecek</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              İptal
            </Button>
            <Button>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
