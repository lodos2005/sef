#!/bin/bash

# Nginx HTTPS Setup Script for Ubuntu
# This script installs Nginx, creates a self-signed SSL certificate,
# and configures it to proxy port 3000 with HTTPS

set -e

echo "=================================="
echo "Nginx HTTPS Setup Script"
echo "=================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root (use sudo)"
    exit 1
fi

# Update package list
echo "Updating package list..."
apt-get update

# Install Nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get install -y nginx
else
    echo "Nginx is already installed"
fi

# Create directory for SSL certificates
SSL_DIR="/etc/nginx/ssl"
echo "Creating SSL directory at $SSL_DIR..."
mkdir -p "$SSL_DIR"

# Generate self-signed SSL certificate
CERT_FILE="$SSL_DIR/nginx-selfsigned.crt"
KEY_FILE="$SSL_DIR/nginx-selfsigned.key"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "SSL certificates already exist. Skipping generation..."
else
    echo "Generating self-signed SSL certificate..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_FILE" \
        -out "$CERT_FILE" \
        -subj "/C=TR/ST=Istanbul/L=Istanbul/O=SEF/OU=IT/CN=localhost"
    
    echo "SSL certificate generated successfully"
fi

# Create Nginx configuration for reverse proxy
NGINX_CONF="/etc/nginx/sites-available/sef-https"

echo "Creating Nginx configuration..."
cat > "$NGINX_CONF" << 'EOF'
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name _;
    
    return 301 https://$host$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name _;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/nginx-selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx-selfsigned.key;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/sef-access.log;
    error_log /var/log/nginx/sef-error.log;

    # Client request limits
    client_max_body_size 100M;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Proxy headers
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

echo "Nginx configuration created at $NGINX_CONF"

# Enable the site by creating a symbolic link
NGINX_ENABLED="/etc/nginx/sites-enabled/sef-https"
if [ -L "$NGINX_ENABLED" ]; then
    echo "Site already enabled. Removing old symlink..."
    rm "$NGINX_ENABLED"
fi

echo "Enabling the site..."
ln -s "$NGINX_CONF" "$NGINX_ENABLED"

# Remove default Nginx site if it exists
if [ -L "/etc/nginx/sites-enabled/default" ]; then
    echo "Removing default Nginx site..."
    rm /etc/nginx/sites-enabled/default
fi

# Test Nginx configuration
echo "Testing Nginx configuration..."
nginx -t

# Reload Nginx
echo "Reloading Nginx..."
systemctl reload nginx

# Enable Nginx to start on boot
echo "Enabling Nginx to start on boot..."
systemctl enable nginx

# Check Nginx status
echo ""
echo "=================================="
echo "Nginx Status:"
echo "=================================="
systemctl status nginx --no-pager

echo ""
echo "=================================="
echo "Setup completed successfully!"
echo "=================================="
echo ""
echo "Your application on port 3000 is now accessible via HTTPS"
echo "HTTP (port 80) requests will be automatically redirected to HTTPS (port 443)"
echo ""
echo "SSL Certificate: $CERT_FILE"
echo "SSL Key: $KEY_FILE"
echo ""
echo "Note: This is a self-signed certificate. Browsers will show a security warning."
echo "For production, consider using Let's Encrypt or a trusted CA certificate."
echo ""
echo "Access your application at: https://localhost or https://your-server-ip"
echo ""
echo "Useful commands:"
echo "  - Check Nginx status: systemctl status nginx"
echo "  - Reload Nginx: systemctl reload nginx"
echo "  - View logs: tail -f /var/log/nginx/sef-error.log"
echo "=================================="
