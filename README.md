# SEF - LLM Chat System

A flexible LLM-powered chat system that allows users to create custom chat interfaces with support for multiple AI providers.

## Features

- 🔐 **Authentication System**: JWT-based user authentication with role management
- 💬 **Chat Sessions**: Persistent chat conversations with streaming support
- 🤖 **LLM Provider Abstraction**: Support for Ollama and extensible to other providers
- � **Web Search Integration**: Built-in web search capability using SearXNG
- 🛠️ **Tool Support**: API tool integration and custom tool runners
- 📚 **RAG Support**: Vector-based document retrieval with Qdrant
- �👑 **Admin Panel**: Super admin functionality for system management
- 🐳 **Docker Support**: Full containerization with Docker Compose
- ⚡ **Real-time Streaming**: HTTP-based streaming chat responses

## Tech Stack

### Backend
- **Go** with Fiber v2 framework
- **GORM** for database ORM
- **PostgreSQL** database
- **Redis** for caching
- **JWT** for authentication

### Frontend
- **Next.js 15** with React 19
- **Tailwind CSS v4** for styling
- **Shadcn UI** component library

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)
- Go 1.21+ (for local development)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd sef
```

### 2. Environment Configuration
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

### 3. Start with Docker
```bash
# From project root
docker-compose -f docker/docker-compose.yml up -d

# Or if you have docker-compose installed globally
cd docker
docker-compose up -d
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8110
- **SearXNG**: http://localhost:8888
- **Qdrant Dashboard**: http://localhost:6333/dashboard

### 5. Database Setup
The database will be automatically created and migrated when the backend starts.

## Local Development

### Backend
```bash
cd backend
go mod download
cp .env.example .env
# Edit .env file
air  # Hot reload development server
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env file
npm run dev
```

## API Documentation

### Authentication
- `POST /api/v1/login` - User login
- `POST /api/v1/logout` - User logout
- `GET /api/v1/users/me` - Get current user

### Users (Admin)
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users/:id` - Get user by ID
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

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
│   │   └── server/
│   ├── pkg/
│   └── utils/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── hooks/
├── docker/
└── docs/
```

## Docker Services

- **postgresql**: PostgreSQL database
- **redis**: Redis cache
- **qdrant**: Vector database for RAG
- **searxng**: Privacy-respecting metasearch engine for web search
- **backend**: Go API server
- **frontend**: Next.js application

## Environment Variables

### Backend
- `APP_ENV`: Application environment
- `APP_KEY`: Application secret key
- `JWT_SECRET`: JWT secret key
- `DATABASE_HOST`: Database host
- `DATABASE_PORT`: Database port
- `DATABASE_NAME`: Database name
- `DATABASE_USER`: Database user
- `DATABASE_PASSWORD`: Database password
- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port
- `QDRANT_HOST`: Qdrant host
- `QDRANT_PORT`: Qdrant port
- `SEARXNG_URL`: SearXNG service URL (default: http://searxng:8080)

### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
