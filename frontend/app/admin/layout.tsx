'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Bot,
  Settings,
  Users,
  MessageSquare,
  Wrench,
  BarChart3,
  Shield
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

const adminNavItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: BarChart3,
  },
  {
    href: '/admin/chatbots',
    label: 'Chatbot Yönetimi',
    icon: Bot,
  },
  {
    href: '/admin/providers',
    label: 'Provider Yönetimi',
    icon: Settings,
  },
  {
    href: '/admin/tools',
    label: 'Tool Yönetimi',
    icon: Wrench,
  },
  {
    href: '/admin/users',
    label: 'Kullanıcı Yönetimi',
    icon: Users,
  },
  {
    href: '/admin/chats',
    label: 'Sohbet Yönetimi',
    icon: MessageSquare,
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center border-b px-6">
          <Shield className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-gray-900">Admin Panel</span>
        </div>
        <nav className="mt-6 px-4">
          <ul className="space-y-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
