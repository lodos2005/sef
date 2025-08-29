# Authentication System

This project uses a cookie-based authentication system with Next.js proxying API requests to the Go backend.

## Architecture

### Frontend (Next.js)
- **Auth Context**: Manages authentication state using React Context
- **API Client**: Handles HTTP requests with automatic cookie inclusion
- **Protected Routes**: Components that require authentication
- **Proxy Configuration**: Next.js rewrites `/api/*` requests to the backend

### Backend (Go/Fiber)
- **JWT Tokens**: Stored in HTTP-only cookies for security
- **Login Endpoint**: `/api/v1/login` - validates credentials and sets cookie
- **Logout Endpoint**: `/api/v1/logout` - clears the cookie
- **Current User**: `/api/v1/users/me` - returns authenticated user data
- **Middleware**: Validates JWT tokens on protected routes

## How It Works

1. **Login Flow**:
   - User submits credentials to `/api/v1/login`
   - Backend validates credentials and creates JWT token
   - JWT token is stored in HTTP-only cookie
   - Frontend receives success response and fetches user data

2. **Authenticated Requests**:
   - Frontend makes requests with `credentials: 'include'`
   - Browser automatically sends the HTTP-only cookie
   - Backend validates JWT token in middleware
   - User data is attached to request context

3. **Logout Flow**:
   - Frontend calls `/api/v1/logout`
   - Backend clears the cookie by setting expired cookie
   - Frontend clears local state

## Security Features

- **HTTP-Only Cookies**: Prevents XSS attacks
- **JWT Tokens**: Stateless authentication
- **CORS**: Properly configured for cross-origin requests
- **Input Validation**: Server-side validation on all endpoints

## Development Setup

### Local Development
```bash
# Start backend
cd backend && go run cmd/server/main.go

# Start frontend
cd frontend && npm run dev
```

### Docker Development
```bash
# Start all services
docker-compose up

# Frontend will be available at http://localhost:3000
# Backend API at http://localhost:8110
```

## API Endpoints

- `POST /api/v1/login` - Login with username/password
- `POST /api/v1/logout` - Logout and clear session
- `GET /api/v1/users/me` - Get current user information

## Environment Variables

### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL (defaults to http://localhost:8110)

### Backend
- `APP_KEY`: Secret key for JWT signing and cookie encryption
- Database and Redis configuration (see docker-compose.yml)
