#!/bin/bash
# Sacred Cube TMS - Fresh Installation Script
# Creates a COMPLETELY ISOLATED Sacred Cube TMS server
# No connection to old DAT server whatsoever

set -e

echo "🚀 Sacred Cube TMS - Fresh Installation"
echo "==========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration - ISOLATED Sacred Cube TMS only
SERVER_IP="157.230.7.126"
SERVER_PORT="3000"
APP_NAME="sacred-cube-tms"
GITHUB_REPO="https://github.com/shahrukhfiaz/tms.git"

# Sacred Cube TMS Database (ISOLATED)
SACRED_CUBE_DB_URL="postgresql://neondb_owner:npg_PNef3Twbux0j@ep-silent-wave-ahrnasx0-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

print_status "Starting fresh Sacred Cube TMS installation..."
print_status "Server IP: $SERVER_IP"
print_status "Port: $SERVER_PORT"
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
fi
print_success "Node.js installed: $(node -v)"

# Install PM2 globally
print_status "Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi
print_success "PM2 installed"

# Install Git and utilities
print_status "Installing Git and utilities..."
sudo apt install -y git curl wget build-essential
print_success "Utilities installed"

# Remove old installation if exists
if [ -d "/root/$APP_NAME" ]; then
    print_warning "Removing old installation..."
    cd /root
    pm2 delete $APP_NAME 2>/dev/null || true
    rm -rf $APP_NAME
fi

# Clone repository
print_status "Cloning repository..."
cd /root
git clone $GITHUB_REPO $APP_NAME
cd $APP_NAME
print_success "Repository cloned"

# Install ALL dependencies (including dev)
print_status "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Create .env file with Sacred Cube TMS credentials
print_status "Creating environment configuration..."
cat > .env << EOF
# Server Configuration
PORT=$SERVER_PORT
NODE_ENV=production

# Security - Generated secrets for Sacred Cube TMS
JWT_ACCESS_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# Sacred Cube TMS Database (ISOLATED - NOT connected to old server)
DATABASE_URL=$SACRED_CUBE_DB_URL

# Server IP
CLOUD_SERVER_IP=$SERVER_IP
CLOUD_SERVER_PORT=$SERVER_PORT

# API Configuration
API_BASE_URL=http://$SERVER_IP:$SERVER_PORT/api/v1

# Sacred Cube TMS Object Storage
OBJECT_STORAGE_ENDPOINT=https://nyc3.digitaloceanspaces.com
OBJECT_STORAGE_BUCKET=tms-loadboard
OBJECT_STORAGE_ACCESS_KEY=DO801LHNWPJAYRXRPEVD
OBJECT_STORAGE_SECRET_KEY=8NwEmjkNgKVhMYRpTXZ6id7YGBA4OGWb8/wE2MpB75g
OBJECT_STORAGE_REGION=nyc3

# Proxy management
DEFAULT_PROXY_ROTATION_INTERVAL_MINUTES=15

# Session seeder (optional)
SEEDER_PLAYWRIGHT_WS_ENDPOINT=ws://localhost:9222
SEEDER_API_TOKEN=replace_with_machine_token

# Sacred Cube TMS credentials (add when ready)
TMS_MASTER_USERNAME=
TMS_MASTER_PASSWORD=
SESSION_BUNDLE_ENCRYPTION_KEY=base64encoded32bytekey
EOF

print_success "Environment configured"

# Build application
print_status "Building application..."
npm run build
print_success "Application built"

# Setup database
print_status "Setting up database..."
npm run db:generate
npx prisma migrate dev --name init
print_success "Database setup complete"

# Setup Squid Proxy
print_status "Setting up Squid Proxy..."
chmod +x setup-squid-proxy.sh
sudo ./setup-squid-proxy.sh
print_success "Squid Proxy configured"

# Start application with PM2
print_status "Starting application..."
PORT=$SERVER_PORT pm2 start dist/server.js --name $APP_NAME --max-memory-restart 1G
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
print_success "Application started with PM2"

# Health check
print_status "Performing health check..."
sleep 5

if curl -f http://localhost:$SERVER_PORT/api/v1/healthz > /dev/null 2>&1; then
    print_success "🎉 Sacred Cube TMS installation completed successfully!"
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "  Sacred Cube TMS Server (ISOLATED)"
    echo "═══════════════════════════════════════════════════"
    echo ""
    echo "📊 Server Information:"
    echo "  • Admin Panel: http://$SERVER_IP:$SERVER_PORT"
    echo "  • API: http://$SERVER_IP:$SERVER_PORT/api/v1"
    echo "  • Health: http://$SERVER_IP:$SERVER_PORT/api/v1/healthz"
    echo "  • Proxy: $SERVER_IP:3128"
    echo ""
    echo "🗄️  Database:"
    echo "  • Isolated Sacred Cube TMS database"
    echo "  • NO connection to old DAT server"
    echo ""
    echo "🔐 Proxy Credentials:"
    echo "  • Username: dat"
    echo "  • Password: ChangeMe123!"
    echo ""
    echo "👤 Super Admin Login:"
    echo "  • Email: superadmin@digitalstorming.com"
    echo "  • Password: ChangeMeSuperSecure123!"
    echo ""
    echo "🛠️  Useful Commands:"
    echo "  • View logs: pm2 logs $APP_NAME"
    echo "  • Restart: pm2 restart $APP_NAME"
    echo "  • Status: pm2 status"
    echo ""
else
    print_error "Health check failed!"
    print_warning "Check logs: pm2 logs $APP_NAME"
fi

