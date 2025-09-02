// API Types - Updated to match backend structure
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
  description: string;
  is_active: boolean;
  config: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Chatbot {
  id: number;
  name: string;
  description: string;
  provider_id: number;
  provider: Provider;
  user_id: number;
  user: User;
  is_active: boolean;
  is_public: boolean;
  system_prompt: string;
  config: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Tool {
  id: number;
  name: string;
  description: string;
  type: string;
  script?: string;
  config?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: number;
  user_id: number;
  chatbot_id: number;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
  chatbot?: Chatbot;
  messages?: Message[];
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

export interface SimpleResponse<T> {
  [key: string]: T;
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
  apiKey: string;
  baseUrl: string;
  config: Record<string, any>;
}

export interface CreateChatbotRequest {
  name: string;
  description: string;
  provider_id: number;
  is_public?: boolean;
  system_prompt?: string;
  config?: Record<string, any>;
  tool_ids?: number[];
}

export interface CreateToolRequest {
  name: string;
  description: string;
  type: string;
  script?: string;
  config?: string;
}

export interface CreateChatSessionRequest {
  title: string;
  chatbot_id: number;
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
