'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Users,
  MessageSquare,
  Settings,
  Wrench,
  TrendingUp,
  Activity,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';

export default function AdminPage() {
  const [stats, setStats] = useState([
    {
      title: 'Toplam Kullanıcı',
      value: '0',
      change: '+0%',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Aktif Sohbetler',
      value: '0',
      change: '+0%',
      icon: MessageSquare,
      color: 'text-green-600',
    },
    {
      title: 'Chatbot Sayısı',
      value: '0',
      change: '+0',
      icon: Bot,
      color: 'text-purple-600',
    },
    {
      title: 'Aktif Provider',
      value: '0',
      change: '0',
      icon: Settings,
      color: 'text-orange-600',
    },
  ]);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard stats on component mount
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const [usersResponse, chatbotsResponse, providersResponse, chatsResponse] = await Promise.all([
        apiClient.getUsers(1, 1), // Just get pagination info
        apiClient.getChatbots(),
        apiClient.getProviders(),
        apiClient.getChatSessions(),
      ]);

            // Update stats with real data
      setStats([
        {
          title: 'Toplam Kullanıcı',
          value: (usersResponse.total_records || 0).toString(),
          change: '+0%',
          icon: Users,
          color: 'text-blue-600',
        },
        {
          title: 'Aktif Sohbetler',
          value: chatsResponse.records.length.toString(),
          change: '+0%',
          icon: MessageSquare,
          color: 'text-green-600',
        },
        {
          title: 'Chatbot Sayısı',
          value: (chatbotsResponse.chatbots?.length || 0).toString(),
          change: '+0',
          icon: Bot,
          color: 'text-purple-600',
        },
        {
          title: 'Provider Sayısı',
          value: (providersResponse.providers?.length || 0).toString(),
          change: '+0',
          icon: Settings,
          color: 'text-orange-600',
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Yeni Chatbot Ekle',
      description: 'Sisteme yeni bir chatbot tanımlayın',
      href: '/admin/chatbots/new',
      icon: Bot,
      color: 'bg-blue-500',
    },
    {
      title: 'Provider Yapılandır',
      description: 'LLM provider ayarlarını yönetin',
      href: '/admin/providers',
      icon: Settings,
      color: 'bg-green-500',
    },
    {
      title: 'Kullanıcı Yönetimi',
      description: 'Kullanıcı hesaplarını ve izinlerini yönetin',
      href: '/admin/users',
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Tool Yönetimi',
      description: 'Mevcut araçları düzenleyin ve yeni araçlar ekleyin',
      href: '/admin/tools',
      icon: Wrench,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Sistem yönetimi ve istatistikler</p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Super Admin
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">{stat.change}</span> geçen aya göre
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Hızlı İşlemler</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card key={action.title} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href={action.href}>Git</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Son Aktiviteler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Yeni kullanıcı kaydı</p>
                <p className="text-xs text-gray-500">2 dakika önce</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Chatbot güncellendi</p>
                <p className="text-xs text-gray-500">15 dakika önce</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Provider yapılandırması değiştirildi</p>
                <p className="text-xs text-gray-500">1 saat önce</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
