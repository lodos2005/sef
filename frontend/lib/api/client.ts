import {
  User,
  Provider,
  Chatbot,
  Tool,
  ChatSession,
  Message,
  ApiResponse,
  PaginatedResponse,
  SimpleResponse,
  CreateUserRequest,
  CreateProviderRequest,
  CreateChatbotRequest,
  CreateToolRequest,
  CreateChatSessionRequest,
  SendMessageRequest,
  LoginRequest,
  LoginResponse
} from './types';

const API_BASE_URL = 'http://localhost:3000';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies in requests
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'API request failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication API
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/api/v1/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<User>('/api/v1/users/me');
    return response;
  }

  async logout(): Promise<void> {
    await this.request('/api/v1/logout', {
      method: 'POST',
    });
  }

  // Users API
  async getUsers(page = 1, limit = 10): Promise<PaginatedResponse<User>> {
    const response = await this.request<PaginatedResponse<User>>(
      `/api/v1/admin/users?page=${page}&limit=${limit}`
    );
    return response;
  }

  async getUser(id: number): Promise<User> {
    const response = await this.request<User>(`/api/v1/admin/users/${id}`);
    return response;
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await this.request<User>('/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateUser(id: number, data: Partial<CreateUserRequest>): Promise<User> {
    const response = await this.request<User>(`/api/v1/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteUser(id: number): Promise<void> {
    await this.request(`/api/v1/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Providers API
  async getProviders(page = 1, limit = 10): Promise<SimpleResponse<Provider[]>> {
    const response = await this.request<SimpleResponse<Provider[]>>(
      `/api/v1/admin/providers?page=${page}&limit=${limit}`
    );
    return response;
  }

  async getProvider(id: number): Promise<Provider> {
    const response = await this.request<Provider>(`/api/v1/admin/providers/${id}`);
    return response;
  }

  async createProvider(data: CreateProviderRequest): Promise<Provider> {
    const payload = {
      ...data,
      config: JSON.stringify(data.config),
    };
    const response = await this.request<Provider>('/api/v1/admin/providers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response;
  }

  async updateProvider(id: number, data: Partial<CreateProviderRequest>): Promise<Provider> {
    const payload = {
      ...data,
      ...(data.config && { config: JSON.stringify(data.config) }),
    };
    const response = await this.request<Provider>(`/api/v1/admin/providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response;
  }

  async deleteProvider(id: number): Promise<void> {
    await this.request(`/api/v1/admin/providers/${id}`, {
      method: 'DELETE',
    });
  }

  async getProviderModels(type: string): Promise<string[]> {
    const response = await this.request<string[]>(`/api/v1/providers/${type}/models`);
    return response;
  }

    // Chatbots API
  async getChatbots(page = 1, limit = 10): Promise<{ chatbots: Chatbot[] }> {
    const response = await this.request<{ chatbots: Chatbot[] }>(
      `/api/v1/admin/chatbots?page=${page}&limit=${limit}`
    );
    return response;
  }

  async getChatbot(id: number): Promise<Chatbot> {
    const response = await this.request<Chatbot>(`/api/v1/admin/chatbots/${id}`);
    return response;
  }

  async createChatbot(data: CreateChatbotRequest): Promise<Chatbot> {
    const response = await this.request<Chatbot>('/api/v1/admin/chatbots', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateChatbot(id: number, data: Partial<CreateChatbotRequest>): Promise<Chatbot> {
    const response = await this.request<Chatbot>(`/api/v1/admin/chatbots/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteChatbot(id: number): Promise<void> {
    await this.request(`/api/v1/admin/chatbots/${id}`, {
      method: 'DELETE',
    });
  }

  // Tools API
  async getTools(page = 1, limit = 10): Promise<SimpleResponse<Tool[]>> {
    const response = await this.request<SimpleResponse<Tool[]>>(
      `/api/v1/admin/tools?page=${page}&limit=${limit}`
    );
    return response;
  }

  async getTool(id: number): Promise<Tool> {
    const response = await this.request<Tool>(`/api/v1/admin/tools/${id}`);
    return response;
  }

  async createTool(data: CreateToolRequest): Promise<Tool> {
    const response = await this.request<Tool>('/api/v1/admin/tools', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateTool(id: number, data: Partial<CreateToolRequest>): Promise<Tool> {
    const response = await this.request<Tool>(`/api/v1/admin/tools/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteTool(id: number): Promise<void> {
    await this.request(`/api/v1/admin/tools/${id}`, {
      method: 'DELETE',
    });
  }

  // Chats API
  async getChatSessions(page = 1, limit = 10): Promise<PaginatedResponse<ChatSession[]>> {
    const response = await this.request<PaginatedResponse<ChatSession[]>>(
      `/api/v1/admin/chats?page=${page}&limit=${limit}`
    );
    return response;
  }

  async getChatSession(id: number): Promise<ChatSession> {
    const response = await this.request<ChatSession>(`/api/v1/admin/chats/${id}`);
    return response;
  }

  async createChatSession(data: CreateChatSessionRequest): Promise<ChatSession> {
    const response = await this.request<ChatSession>('/api/v1/admin/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async updateChatSession(id: number, data: Partial<CreateChatSessionRequest>): Promise<ChatSession> {
    const response = await this.request<ChatSession>(`/api/v1/admin/chats/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return response;
  }

  async deleteChatSession(id: number): Promise<void> {
    await this.request(`/api/v1/admin/chats/${id}`, {
      method: 'DELETE',
    });
  }

  async getSessionMessages(sessionId: number): Promise<Message[]> {
    const response = await this.request<Message[]>(`/api/v1/chats/${sessionId}/messages`);
    return response;
  }

  async sendMessage(sessionId: number, data: SendMessageRequest): Promise<Message> {
    const response = await this.request<Message>(`/api/v1/chats/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  }

  async getUserSessions(): Promise<SimpleResponse<ChatSession[]>> {
    const response = await this.request<SimpleResponse<ChatSession[]>>('/api/v1/chats');
    return response;
  }

  async deleteSession(sessionId: number): Promise<void> {
    await this.request(`/api/v1/chats/${sessionId}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
