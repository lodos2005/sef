'use client';

import { useState, useEffect } from 'react';
import { Login } from '@/components/Login';
import ChatPage from './chat/page';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);

  const handleLogin = (authToken: string) => {
    setToken(authToken);
    localStorage.setItem('authToken', authToken);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('authToken');
  };

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  if (token) {
    return <ChatPage token={token} onLogout={handleLogout} />;
  }

  return <Login onLogin={handleLogin} />;
}
