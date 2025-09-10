#!/bin/bash

# SEF Docker Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if Docker Compose is available
check_docker_compose() {
    if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
        print_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
}

# Function to build and start services
start_services() {
    print_status "Starting SEF application services..."
    
    if command -v docker-compose > /dev/null 2>&1; then
        docker-compose up -d --build
    else
        docker compose up -d --build
    fi
    
    print_status "Services started successfully!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend: http://localhost:8110"
    print_status "PostgreSQL: localhost:5432"
    print_status "Redis: localhost:6379"
}

# Function to stop services
stop_services() {
    print_status "Stopping SEF application services..."
    
    if command -v docker-compose > /dev/null 2>&1; then
        docker-compose down
    else
        docker compose down
    fi
    
    print_status "Services stopped successfully!"
}

# Function to view logs
view_logs() {
    local service=$1
    
    if [ -z "$service" ]; then
        print_status "Showing logs for all services..."
        if command -v docker-compose > /dev/null 2>&1; then
            docker-compose logs -f
        else
            docker compose logs -f
        fi
    else
        print_status "Showing logs for $service..."
        if command -v docker-compose > /dev/null 2>&1; then
            docker-compose logs -f "$service"
        else
            docker compose logs -f "$service"
        fi
    fi
}

# Function to restart services
restart_services() {
    print_status "Restarting SEF application services..."
    stop_services
    start_services
}

# Function to clean up
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    if command -v docker-compose > /dev/null 2>&1; then
        docker-compose down -v --rmi all
    else
        docker compose down -v --rmi all
    fi
    
    print_status "Cleanup completed!"
}

# Function to show status
show_status() {
    print_status "SEF Application Status:"
    
    if command -v docker-compose > /dev/null 2>&1; then
        docker-compose ps
    else
        docker compose ps
    fi
}

# Function to execute command in service container
exec_service() {
    local service=$1
    shift
    local cmd="$@"
    
    if [ -z "$service" ]; then
        print_error "Please specify a service name (backend, frontend, postgresql, redis)"
        exit 1
    fi
    
    if [ -z "$cmd" ]; then
        cmd="sh"
    fi
    
    print_status "Executing '$cmd' in $service container..."
    
    if command -v docker-compose > /dev/null 2>&1; then
        docker-compose exec "$service" $cmd
    else
        docker compose exec "$service" $cmd
    fi
}

# Main script logic
case "$1" in
    "start")
        check_docker
        check_docker_compose
        start_services
        ;;
    "stop")
        check_docker
        check_docker_compose
        stop_services
        ;;
    "restart")
        check_docker
        check_docker_compose
        restart_services
        ;;
    "logs")
        check_docker
        check_docker_compose
        view_logs "$2"
        ;;
    "status")
        check_docker
        check_docker_compose
        show_status
        ;;
    "exec")
        check_docker
        check_docker_compose
        shift
        exec_service "$@"
        ;;
    "cleanup")
        check_docker
        check_docker_compose
        cleanup
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|logs [service]|status|exec <service> [command]|cleanup}"
        echo ""
        echo "Commands:"
        echo "  start          - Build and start all services"
        echo "  stop           - Stop all services"
        echo "  restart        - Restart all services"
        echo "  logs [service] - View logs (optionally for specific service)"
        echo "  status         - Show status of all services"
        echo "  exec <service> - Execute command in service container"
        echo "  cleanup        - Remove all containers, volumes, and images"
        echo ""
        echo "Available services: backend, frontend, postgresql, redis"
        exit 1
        ;;
esac
