'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../../components/auth/protected-route';
import { UserMenu } from '../../components/auth/user-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Save } from 'lucide-react';
import { useAuth } from '../../lib/contexts/auth-context';
import { apiClient } from '../../lib/api/client';

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
  autoSave: boolean;
}

function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'system',
    notifications: true,
    language: 'tr',
    autoSave: true,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Save to localStorage for now
      localStorage.setItem('userSettings', JSON.stringify(settings));
      setMessage('Ayarlar başarıyla kaydedildi!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('Ayarlar kaydedilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <SettingsIcon className="h-8 w-8 text-indigo-600" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Ayarlar
                </h1>
              </div>
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Profil</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center space-x-2">
                <Palette className="h-4 w-4" />
                <span>Görünüm</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span>Bildirimler</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Güvenlik</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profil Bilgileri</CardTitle>
                  <CardDescription>
                    Hesap bilgilerinizi yönetin ve güncelleyin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Ad Soyad</Label>
                      <Input
                        id="name"
                        value={user?.name || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">
                        Ad soyad değişikliği için yöneticinizle iletişime geçin.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Kullanıcı Adı</Label>
                      <Input
                        id="username"
                        value={user?.username || ''}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-posta</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">
                        E-posta değişikliği yakında eklenecek.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Rol</Label>
                      <Input
                        id="role"
                        value={user?.super_admin ? 'Super Admin' : 'User'}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button disabled className="bg-gray-400">
                      Profil Bilgilerini Güncelle
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      Profil güncelleme özelliği yakında eklenecek.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle>Görünüm Ayarları</CardTitle>
                  <CardDescription>
                    Uygulamanın görünümünü kişiselleştirin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Tema</Label>
                        <p className="text-sm text-gray-600">
                          Uygulamanın renk temasını seçin.
                        </p>
                      </div>
                      <select
                        value={settings.theme}
                        onChange={(e) => updateSetting('theme', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="light">Açık</option>
                        <option value="dark">Koyu</option>
                        <option value="system">Sistem</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Dil</Label>
                        <p className="text-sm text-gray-600">
                          Uygulama dilini seçin.
                        </p>
                      </div>
                      <select
                        value={settings.language}
                        onChange={(e) => updateSetting('language', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="tr">Türkçe</option>
                        <option value="en">English</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Otomatik Kaydetme</Label>
                        <p className="text-sm text-gray-600">
                          Değişiklikleri otomatik olarak kaydet.
                        </p>
                      </div>
                      <Switch
                        checked={settings.autoSave}
                        onCheckedChange={(checked) => updateSetting('autoSave', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Bildirim Ayarları</CardTitle>
                  <CardDescription>
                    Bildirim tercihlerinizi yönetin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>E-posta Bildirimleri</Label>
                        <p className="text-sm text-gray-600">
                          Önemli güncellemeler için e-posta alın.
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications}
                        onCheckedChange={(checked) => updateSetting('notifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Tarayıcı Bildirimleri</Label>
                        <p className="text-sm text-gray-600">
                          Yeni mesajlar için tarayıcı bildirimi alın.
                        </p>
                      </div>
                      <Switch defaultChecked={false} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Sesli Bildirimler</Label>
                        <p className="text-sm text-gray-600">
                          Yeni mesajlar için ses çal.
                        </p>
                      </div>
                      <Switch defaultChecked={false} />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500">
                      Bildirim ayarları yakında aktif olacak.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Güvenlik Ayarları</CardTitle>
                  <CardDescription>
                    Hesabınızın güvenliğini yönetin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Mevcut Şifre</Label>
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="Mevcut şifrenizi girin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Yeni Şifre</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Yeni şifrenizi girin"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Şifre Tekrar</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Yeni şifrenizi tekrar girin"
                      />
                    </div>
                  </div>

                  <div className="pt-4 space-y-4">
                    <Button disabled className="bg-gray-400">
                      Şifreyi Güncelle
                    </Button>
                    <p className="text-xs text-gray-500">
                      Şifre değiştirme özelliği yakında eklenecek.
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">İki Faktörlü Doğrulama</h4>
                      <p className="text-sm text-gray-600">
                        Hesabınızı daha güvenli hale getirmek için 2FA'yi etkinleştirin.
                      </p>
                      <Button variant="outline" disabled>
                        2FA Kurulumu
                      </Button>
                      <p className="text-xs text-gray-500">
                        İki faktörlü doğrulama yakında eklenecek.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="mt-8 flex items-center justify-between bg-white/60 backdrop-blur-sm rounded-lg p-6">
            <div>
              <h3 className="font-medium text-gray-900">Ayarları Kaydet</h3>
              <p className="text-sm text-gray-600">
                Değişikliklerinizi kaydetmek için aşağıdaki butona tıklayın.
              </p>
            </div>
            <Button
              onClick={saveSettings}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>

          {message && (
            <div className={`mt-4 p-4 rounded-lg ${
              message.includes('başarıyla')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default SettingsPage;
