'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wrench,
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Code,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api/client';
import { Tool, CreateToolRequest } from '@/lib/api/types';

const toolTypes = [
  { value: 'web_scraping', label: 'Web Scraping' },
  { value: 'code_formatting', label: 'Code Formatting' },
  { value: 'image_processing', label: 'Image Processing' },
  { value: 'data_analysis', label: 'Data Analysis' },
  { value: 'api_integration', label: 'API Integration' },
  { value: 'file_processing', label: 'File Processing' },
];

const languages = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
];

export default function ToolsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTool, setNewTool] = useState({
    name: '',
    description: '',
    type: '',
    language: '',
    code: '',
  });

  // Fetch tools on component mount
  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getTools();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Failed to fetch tools:', error);
      setTools([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTools = tools.filter(tool =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tool.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateTool = async () => {
    try {
      const toolData = {
        name: newTool.name,
        description: newTool.description,
        type: newTool.type,
        script: newTool.code,
        config: '{}', // Default empty config
      };
      await apiClient.createTool(toolData);
      setIsCreateDialogOpen(false);
      setNewTool({ name: '', description: '', type: '', language: '', code: '' });
      fetchTools(); // Refresh the list
    } catch (error) {
      console.error('Failed to create tool:', error);
    }
  };

  const handleTestTool = (tool: any) => {
    // Tool test çağrısı yapılacak
    console.log('Testing tool:', tool.name);
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge variant="default" className="bg-green-100 text-green-800">Aktif</Badge>
    ) : (
      <Badge variant="secondary">Pasif</Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeMap: { [key: string]: string } = {
      web_scraping: 'Web Scraping',
      code_formatting: 'Code Formatting',
      image_processing: 'Image Processing',
      data_analysis: 'Data Analysis',
      api_integration: 'API Integration',
      file_processing: 'File Processing',
    };
    return <Badge variant="outline">{typeMap[type] || type}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tool Yönetimi</h1>
          <p className="text-gray-600">Sistem araçlarını yönetin ve yapılandırın</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Tool Oluştur</DialogTitle>
              <DialogDescription>
                Sistem için yeni bir araç tanımlayın.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  İsim
                </Label>
                <Input
                  id="name"
                  value={newTool.name}
                  onChange={(e) => setNewTool({...newTool, name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Açıklama
                </Label>
                <Textarea
                  id="description"
                  value={newTool.description}
                  onChange={(e) => setNewTool({...newTool, description: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Tip
                </Label>
                <Select value={newTool.type} onValueChange={(value) => setNewTool({...newTool, type: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Tool tipi seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {toolTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="language" className="text-right">
                  Dil
                </Label>
                <Select value={newTool.language} onValueChange={(value) => setNewTool({...newTool, language: value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Programlama dili seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="code" className="text-right pt-2">
                  Kod
                </Label>
                <Textarea
                  id="code"
                  value={newTool.code}
                  onChange={(e) => setNewTool({...newTool, code: e.target.value})}
                  placeholder="Tool kodunu girin..."
                  className="col-span-3 min-h-[200px] font-mono text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateTool}>Oluştur</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Tool ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Tool</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tools.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Tool</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tools.filter(t => t.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pasif Tool</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tools.filter(t => !t.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Script</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tools.filter(t => t.type === 'custom_script').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tools Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tool Listesi</CardTitle>
          <CardDescription>
            Sistemde tanımlı tüm araçları görüntüleyin ve yönetin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>İsim</TableHead>
                <TableHead>Açıklama</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Oluşturulma</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                      <span className="ml-2">Yükleniyor...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <Wrench className="h-12 w-12 mb-4" />
                      <h3 className="text-lg font-medium mb-2">Henüz araç yok</h3>
                      <p className="text-sm mb-4">Sisteminizde tanımlı araç bulunmuyor.</p>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        İlk Aracı Oluştur
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTools.map((tool) => (
                  <TableRow key={tool.id}>
                    <TableCell className="font-medium">{tool.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{tool.description}</TableCell>
                    <TableCell>{getTypeBadge(tool.type)}</TableCell>
                    <TableCell>
                      <Badge variant={tool.is_active ? "default" : "secondary"}>
                        {tool.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(tool.created_at).toLocaleDateString('tr-TR')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTestTool(tool)}>
                            <Play className="mr-2 h-4 w-4" />
                            Test Et
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
