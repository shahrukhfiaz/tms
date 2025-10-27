# Sacred Cube TMS - Deployment Guide

## Quick Deployment Instructions

### Option 1: Automated Installation (Recommended)

SSH into your DigitalOcean droplet and run:

```bash
# Clone the repository
cd /root
git clone https://github.com/shahrukhfiaz/tms.git
cd tms

# Make the script executable
chmod +x auto-install.sh
chmod +x setup-squid-proxy.sh

# Run the automated installation
sudo ./auto-install.sh
```

The script will:
1. ✅ Install Node.js 18+
2. ✅ Install PM2 globally
3. ✅ Install Git and utilities
4. ✅ Clone the repository
5. ✅ Install dependencies
6. ✅ Configure environment (you'll be prompted to edit .env)
7. ✅ Build the application
8. ✅ Run database migrations
9. ✅ Setup Squid proxy with authentication
10. ✅ Start the application with PM2
11. ✅ Configure PM2 to start on boot

### Option 2: Manual Installation

If you prefer manual installation:

```bash
# 1. Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PM2
sudo npm install -g pm2

# 3. Clone repository
git clone https://github.com/shahrukhfiaz/tms.git
cd tms

# 4. Install dependencies
npm ci --production

# 5. Configure environment
cp CLOUD_CONFIG.env .env
nano .env  # Edit with your database credentials

# 6. Build application
npm run build

# 7. Run migrations
npm run db:generate
npm run db:migrate

# 8. Setup Squid proxy
chmod +x setup-squid-proxy.sh
sudo ./setup-squid-proxy.sh

# 9. Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

## Environment Configuration

Edit `/root/sacred-cube-tms/.env` with these required values:

```env
# Database
DATABASE_URL=your_postgresql_connection_string

# JWT Secrets (generate secure keys)
JWT_ACCESS_SECRET=your_secure_32_character_secret
JWT_REFRESH_SECRET=your_secure_32_character_secret

# Server IP (already configured)
CLOUD_SERVER_IP=157.230.7.126
API_BASE_URL=http://157.230.7.126:4000/api/v1

# TMS Master Credentials (for automated login)
TMS_MASTER_USERNAME=your_tms_username
TMS_MASTER_PASSWORD=your_tms_password
```

## Generate Secure Secrets

```bash
# Generate JWT secrets
openssl rand -base64 32
openssl rand -base64 32
```

## Verify Installation

Check if everything is running:

```bash
# Check PM2 status
pm2 status

# Check Squid proxy
sudo systemctl status squid

# Test API health
curl http://localhost:4000/api/v1/healthz

# View logs
pm2 logs sacred-cube-tms

# Monitor resources
pm2 monit
```

## Access Points

- **API**: http://157.230.7.126:4000/api/v1
- **Health Check**: http://157.230.7.126:4000/api/v1/healthz
- **Admin Panel**: http://157.230.7.126:4000
- **Squid Proxy**: 157.230.7.126:3128

## Proxy Credentials

- **Username**: `dat`
- **Password**: `ChangeMe123!`

To change proxy password:
```bash
sudo htpasswd /etc/squid/passwd dat
```

## Useful Commands

```bash
# View application logs
pm2 logs sacred-cube-tms

# Restart application
pm2 restart sacred-cube-tms

# Stop application
pm2 stop sacred-cube-tms

# View proxy access logs
sudo tail -f /var/log/squid/access.log

# Restart proxy
sudo systemctl restart squid

# Update application
cd /root/sacred-cube-tms
git pull origin main
npm ci --production
npm run build
npm run db:migrate
pm2 restart sacred-cube-tms
```

## Troubleshooting

### Application won't start

```bash
# Check PM2 logs
pm2 logs sacred-cube-tms

# Check if port 4000 is in use
sudo netstat -tlnp | grep 4000

# Kill process on port 4000 if needed
sudo fuser -k 4000/tcp
```

### Database connection errors

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check database URL in .env
cat .env | grep DATABASE_URL
```

### Proxy not working

```bash
# Check Squid status
sudo systemctl status squid

# Check Squid configuration
sudo squid -k parse

# View error logs
sudo tail -f /var/log/squid/cache.log
```

## Security Checklist

- [ ] Change default proxy password
- [ ] Update database credentials
- [ ] Generate new JWT secrets
- [ ] Enable firewall rules
- [ ] Configure SSL/TLS (Nginx reverse proxy)
- [ ] Set up fail2ban
- [ ] Enable automatic security updates

## Next Steps

1. ✅ Server deployed and running
2. ⏳ Update client configuration with new server IP
3. ⏳ Inspect Sacred Cube TMS login page
4. ⏳ Update login selectors in session seeder
5. ⏳ Build and distribute client installer
6. ⏳ Test session capture and sharing

---

**Need help?** Check the logs: `pm2 logs sacred-cube-tms`

