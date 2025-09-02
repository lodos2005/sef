export interface User {
  id: number;
  name: string;
  username: string;
  super_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: number;
  name: string;
  type: string;
  status: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Chatbot {
  id: number;
  name: string;
  description: string;
  provider_id: number;
  status: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Tool {
  id: number;
  name: string;
  description: string;
  type: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: number;
  user_id: number;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  session_id: number;
  role: string;
  content: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  total_records: number;
  records: T[];
  current_page: number;
  total_pages: number;
}

export interface CreateUserRequest {
  name: string;
  username: string;
  password: string;
  super_admin?: boolean;
}

export interface CreateProviderRequest {
  name: string;
  type: string;
  config: Record<string, any>;
}

export interface CreateChatbotRequest {
  name: string;
  description: string;
  provider_id: number;
  config: Record<string, any>;
}

export interface CreateToolRequest {
  name: string;
  description: string;
  type: string;
  config: Record<string, any>;
}

export interface CreateChatSessionRequest {
  title: string;
}

export interface SendMessageRequest {
  content: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}
