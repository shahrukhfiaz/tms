#!/bin/bash
# Sacred Cube TMS - Squid Proxy Setup Script
# This script installs and configures Squid proxy with authentication

set -e

echo "🚀 Setting up Squid Proxy for Sacred Cube TMS..."

# Install required packages
echo "📦 Installing dependencies..."
sudo apt update
sudo apt install -y squid apache2-utils

# Backup original config
echo "💾 Backing up original Squid configuration..."
sudo cp /etc/squid/squid.conf /etc/squid/squid.conf.original

# Copy new configuration
echo "⚙️  Installing new Squid configuration..."
sudo cp squid.conf /etc/squid/squid.conf

# Set up authentication (username: dat, password: ChangeMe123!)
echo "🔐 Setting up authentication..."
sudo htpasswd -c -b /etc/squid/passwd dat ChangeMe123!

# Set proper permissions
sudo chown proxy:proxy /etc/squid/passwd
sudo chmod 640 /etc/squid/passwd

# Create log directory if it doesn't exist
sudo mkdir -p /var/log/squid
sudo chown proxy:proxy /var/log/squid

# Restart Squid service
echo "🔄 Restarting Squid service..."
sudo systemctl enable squid
sudo systemctl restart squid

# Check if Squid is running
if sudo systemctl is-active --quiet squid; then
    echo "✅ Squid proxy is running successfully!"
    echo ""
    echo "📋 Configuration Summary:"
    echo "   - Proxy Address: 157.230.7.126:3128"
    echo "   - Username: dat"
    echo "   - Password: ChangeMe123!"
    echo "   - Authentication: Basic HTTP Auth"
    echo ""
    echo "🔧 To change password, run:"
    echo "   sudo htpasswd /etc/squid/passwd dat"
    echo ""
    echo "📝 To view logs:"
    echo "   sudo tail -f /var/log/squid/access.log"
else
    echo "❌ Error: Squid failed to start. Check configuration:"
    echo "   sudo systemctl status squid"
    exit 1
fi

