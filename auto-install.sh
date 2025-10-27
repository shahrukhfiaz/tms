#!/bin/bash
# Sacred Cube TMS - Automated Installation Script
# This script installs everything needed on a fresh Ubuntu droplet

set -e

echo "🚀 Sacred Cube TMS - Automated Installation"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
SERVER_IP="157.230.7.126"
APP_NAME="sacred-cube-tms"
GITHUB_REPO="https://github.com/shahrukhfiaz/tms.git"

print_status "Starting automated installation for Sacred Cube TMS..."
print_status "Server IP: $SERVER_IP"
echo ""

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# Install Node.js 18
print_status "Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_status "Upgrading Node.js to version 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
fi
print_success "Node.js installed: $(node -v)"

# Install PM2 globally
print_status "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
print_success "PM2 installed"

# Install Git and other utilities
print_status "Installing Git and utilities..."
sudo apt install -y git curl wget build-essential
print_success "Utilities installed"

# Clone/Update repository
print_status "Setting up repository..."
if [ -d "/root/$APP_NAME" ]; then
    print_warning "Directory exists, updating..."
    cd /root/$APP_NAME
    git pull origin main
else
    cd /root
    git clone $GITHUB_REPO $APP_NAME
    cd $APP_NAME
fi
print_success "Repository ready"

# Install dependencies
print_status "Installing Node.js dependencies..."
npm ci --production
print_success "Dependencies installed"

# Setup environment
print_status "Configuring environment..."
if [ ! -f ".env" ]; then
    cp CLOUD_CONFIG.env .env
    # Update server IP
    sed -i "s/CLOUD_SERVER_IP=.*/CLOUD_SERVER_IP=$SERVER_IP/g" .env
    sed -i "s|API_BASE_URL=.*|API_BASE_URL=http://$SERVER_IP:4000/api/v1|g" .env
    
    # Generate secure secrets
    JWT_ACCESS_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    
    # Add secrets to .env if not present
    if ! grep -q "JWT_ACCESS_SECRET" .env; then
        echo "JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET" >> .env
        echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET" >> .env
        echo "JWT_ACCESS_EXPIRES_IN=15m" >> .env
        echo "JWT_REFRESH_EXPIRES_IN=7d" >> .env
    fi
    
    print_success "Environment configured"
    print_warning "⚠️  IMPORTANT: Please update .env with your database credentials!"
    print_warning "Edit .env now with: nano .env"
    read -p "Press Enter after you've updated the .env file..."
else
    print_success "Environment file already exists"
fi

# Build application
print_status "Building application..."
npm run build
print_success "Application built"

# Run database migrations
print_status "Running database migrations..."
npm run db:generate
npm run db:migrate
print_success "Database migrations completed"

# Setup Squid Proxy
print_status "Setting up Squid Proxy..."
sudo ./setup-squid-proxy.sh
print_success "Squid Proxy configured"

# Stop existing PM2 processes
print_status "Stopping existing processes..."
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true
print_success "Previous processes stopped"

# Start application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js --env production
pm2 save
print_success "Application started with PM2"

# Configure PM2 startup
print_status "Configuring PM2 startup..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
print_success "PM2 startup configured"

# Show status
print_status "PM2 Status:"
pm2 status

# Health check
print_status "Performing health check..."
sleep 5
if curl -f http://localhost:4000/api/v1/healthz > /dev/null 2>&1; then
    print_success "🎉 Installation completed successfully!"
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "  Sacred Cube TMS is now running!"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "📊 Server Information:"
    echo "  • API: http://$SERVER_IP:4000/api/v1"
    echo "  • Health: http://$SERVER_IP:4000/api/v1/healthz"
    echo "  • Admin Panel: http://$SERVER_IP:4000"
    echo "  • Proxy: $SERVER_IP:3128"
    echo ""
    echo "🔐 Credentials:"
    echo "  • Proxy Username: dat"
    echo "  • Proxy Password: ChangeMe123!"
    echo "  • Super Admin: superadmin@digitalstorming.com"
    echo ""
    echo "🛠️  Useful Commands:"
    echo "  • View logs: pm2 logs $APP_NAME"
    echo "  • Restart: pm2 restart $APP_NAME"
    echo "  • Status: pm2 status"
    echo "  • Monitor: pm2 monit"
    echo ""
    echo "📝 Configuration files:"
    echo "  • Server config: /root/$APP_NAME/.env"
    echo "  • Proxy config: /etc/squid/squid.conf"
    echo "  • Proxy password: /etc/squid/passwd"
    echo ""
else
    print_error "Health check failed!"
    print_warning "Check logs with: pm2 logs $APP_NAME"
fi

