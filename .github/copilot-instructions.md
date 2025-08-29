# Şef - LLM Chat System Project Instructions

## Overview
Şef is a flexible LLM-powered chat system that allows users to create custom chat interfaces. The system supports multiple LLM providers through an abstraction layer, enabling easy integration of new providers. It features streaming chat over HTTP, user authentication, chat session management, and an admin panel for superadmin users.

## Architecture
- **Backend**: Golang with Gofiber v2, GORM, PostgreSQL
- **Frontend**: React 19, Next.js 15, Tailwind v4, Shadcn UI, Vercel AI SDK
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose
- **Authentication**: JWT-based with user roles (including SuperAdmin)

## Core Features
1. **User Management**: Authentication, authorization, role-based access
2. **Chat Sessions**: Create, manage, and persist chat conversations
3. **LLM Provider Abstraction**: Support for Ollama and extensible to other providers
4. **Streaming Chat**: HTTP-based streaming responses (not WebSocket)
5. **Admin Panel**: SuperAdmin access to system management
6. **API Integration**: Flexible API endpoint management for LLM providers

## Project Structure
```
sef/
├── backend/
│   ├── app/
│   │   ├── controllers/
│   │   ├── entities/
│   │   ├── middleware/
│   │   └── routes/
│   ├── internal/
│   │   ├── bootstrap/
│   │   ├── database/
│   │   ├── jwtware/
│   │   ├── migration/
│   │   ├── redis/
│   │   ├── search/
│   │   ├── server/
│   │   └── validation/
│   ├── pkg/
│   └── utils/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   └── lib/
├── docker/
└── docs/
```

## Development Workflow
1. **Setup Environment**: Use Docker Compose for local development
2. **Backend Development**: Implement API endpoints, database models, provider abstraction
3. **Frontend Development**: Build UI components, integrate with Vercel AI SDK
4. **Testing**: Unit tests, integration tests
5. **Deployment**: Docker-based deployment

## Important Notes
- **Package Manager**: This project uses `pnpm` as the package manager for the frontend
- **Development Server**: Never start a development server manually. Let user starts by itself
- **Environment Setup**: Always copy `.env.example` files and configure them before running the application

## Key Components to Implement

### Backend
- **Provider Interface**: Abstract LLM provider interactions
- **Chat Session Management**: CRUD operations for chat sessions
- **Streaming Handler**: HTTP streaming for chat responses
- **API Routes**: RESTful endpoints for chat operations
- **Database Models**: Chat, Message, ProviderConfig entities

### Frontend
- **Chat Interface**: Streaming chat UI with message history
- **Provider Configuration**: UI for selecting/managing LLM providers
- **Admin Panel**: User management, system settings
- **Authentication**: Login/logout, protected routes

## Provider Abstraction Design
```go
type LLMProvider interface {
    Generate(ctx context.Context, prompt string, options map[string]interface{}) (<-chan string, error)
    ListModels() ([]string, error)
    ValidateConfig(config map[string]interface{}) error
}
```

## Database Schema Extensions
- **ChatSessions**: id, user_id, title, created_at, updated_at
- **Messages**: id, session_id, role, content, created_at
- **ProviderConfigs**: id, user_id, provider_type, config_json, is_active

## API Endpoints
- `POST /api/v1/chat/sessions` - Create chat session
- `GET /api/v1/chat/sessions` - List user sessions
- `POST /api/v1/chat/{session_id}/messages` - Send message (streaming)
- `GET /api/v1/chat/{session_id}/messages` - Get message history
- `GET /api/v1/providers` - List available providers
- `POST /api/v1/providers/{type}/models` - Get provider models

## Docker Setup
- **PostgreSQL**: Database service
- **Redis**: Caching (if needed)
- **Backend**: Go application
- **Frontend**: Next.js application
- **Ollama**: Optional LLM service

## Security Considerations
- JWT token validation
- Rate limiting
- Input sanitization
- CORS configuration
- Environment variable management

## Next Steps
1. Set up Docker environment
2. Implement provider abstraction layer
3. Create chat session database models
4. Build streaming chat endpoints
5. Develop frontend chat interface
6. Add admin panel functionality
7. Testing and optimization

## Questions for Clarification
- Specific LLM providers to support initially (beyond Ollama)?
- Chat session persistence requirements?
- Real-time features needed?
- File upload support for chat?
- Multi-user chat rooms?
- Analytics/tracking requirements?
