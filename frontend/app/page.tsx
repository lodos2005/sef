'use client';

import { ProtectedRoute } from '../components/auth/protected-route';
import { UserMenu } from '../components/auth/user-menu';
import { useAuth } from '../lib/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Bot, MessageSquare, Settings, Activity, Users, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const handleStartChat = () => {
    router.push('/chatbots');
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
                Şef Dashboard
              </h1>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Hoş Geldiniz, {user?.name}!
          </h2>
          <p className="text-gray-600">
            AI asistanlarınızla sohbet etmeye hazır mısınız?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleStartChat}>
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Yeni Sohbet</h3>
              <p className="text-sm text-gray-600">AI modelleriyle sohbet başlatın</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/chat-history')}>
            <CardContent className="p-6 text-center">
              <Activity className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Sohbet Geçmişi</h3>
              <p className="text-sm text-gray-600">Önceki konuşmalarınızı görüntüleyin</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/settings')}>
            <CardContent className="p-6 text-center">
              <Settings className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Ayarlar</h3>
              <p className="text-sm text-gray-600">Sistem ayarlarını yönetin</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push('/admin')}>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Kullanıcı Yönetimi</h3>
              <p className="text-sm text-gray-600">Kullanıcı hesaplarını yönetin</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Hesap Bilgileri
              </CardTitle>
              <CardDescription>Hesap detaylarınız</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Ad Soyad:</span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Kullanıcı Adı:</span>
                <span className="font-medium">{user?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Rol:</span>
                <Badge variant={user?.super_admin ? "default" : "secondary"}>
                  {user?.super_admin ? "Super Admin" : "User"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Üyelik:</span>
                <span className="text-sm">
                  {new Date(user?.created_at || '').toLocaleDateString('tr-TR')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* System Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Sistem Durumu
              </CardTitle>
              <CardDescription>Platform durumu</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Kimlik Doğrulama:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 text-sm font-medium">Aktif</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Backend:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 text-sm font-medium">Bağlı</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API:</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-700 text-sm font-medium">Çalışıyor</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Hızlı İstatistikler
              </CardTitle>
              <CardDescription>Kullanım özeti</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Toplam Sohbet:</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Aktif Modeller:</span>
                <span className="font-medium">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Provider'lar:</span>
                <span className="font-medium">3</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-8 text-center">
            <Bot className="h-16 w-16 mx-auto mb-4 text-white/90" />
            <h3 className="text-2xl font-bold mb-4">AI Asistanlarınızla Tanışın</h3>
            <p className="text-indigo-100 mb-6 max-w-2xl mx-auto">
              GPT-4, Claude, Llama ve diğer güçlü AI modelleriyle sohbet edin.
              Kod yazın, araştırma yapın, yaratıcı projeler geliştirin.
            </p>
            <Button
              onClick={handleStartChat}
              size="lg"
              className="bg-white text-indigo-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Sohbet Başlat
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}