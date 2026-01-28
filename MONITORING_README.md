# Kiwi Predict - Monitoring & Alerting System

## 📊 Overview

The Kiwi Predict application includes a comprehensive monitoring and alerting system designed for production environments. The system provides real-time monitoring, logging, and automated alerts for critical system events.

## 🏗️ Architecture

### Components

1. **Winston Logger** (`backend/utils/logger.js`)
   - Structured logging with multiple transports
   - Separate log files for different event types
   - Configurable log levels

2. **Monitoring Middleware** (`backend/middleware/monitoring.js`)
   - Request/response monitoring
   - Security event detection
   - Performance tracking
   - System health checks

3. **Alert System** (`backend/utils/alerts.js`)
   - Multi-channel alerting (Email, Slack)
   - Configurable alert levels
   - HTML email templates

## 📋 Features

### 🔐 Security Monitoring
- **Authentication Tracking**: Failed login attempts, successful logins
- **Suspicious Activity Detection**: XSS, SQL injection, directory traversal attempts
- **Rate Limiting Violations**: Automated blocking of abusive requests
- **Security Event Logging**: All security-related events are logged with context

### ⚡ Performance Monitoring
- **API Response Times**: Track response times for all endpoints
- **Slow Query Detection**: Alert on requests taking >1 second
- **Memory Usage**: Monitor heap usage and alert on high usage
- **Database Connections**: Track connection pool usage

### 🏥 Health Checks
- **System Health**: `/health` endpoint for load balancers
- **Service Dependencies**: Database and external API health checks
- **Metrics Endpoint**: `/metrics` for monitoring dashboards

### 📧 Alerting System

#### Supported Channels
- **Email**: HTML-formatted alerts via SMTP
- **Slack**: Rich message attachments with color coding
- **Console**: Development logging

#### Alert Levels
- **Critical**: System failures, security breaches
- **Warning**: Performance issues, high resource usage
- **Info**: General system information

## 🚀 Setup Instructions

### 1. Environment Configuration

Add the following to your `backend/.env` file:

```env
# Monitoring and Alerting
LOG_LEVEL=info
ALERT_EMAIL=admin@yourdomain.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Email Configuration (for alerts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 2. Slack Integration

1. Create a Slack app at https://api.slack.com/apps
2. Add "Incoming Webhooks" feature
3. Create a webhook for your desired channel
4. Copy the webhook URL to `SLACK_WEBHOOK_URL`

### 3. Email Configuration

For Gmail:
1. Enable 2-factor authentication
2. Generate an App Password
3. Use the App Password in `SMTP_PASS`

For other providers, adjust SMTP settings accordingly.

## 📊 Monitoring Endpoints

### Health Check
```
GET /health
```
Returns system health status including:
- Uptime
- Memory usage
- Database connectivity
- External API status

### Metrics
```
GET /metrics
```
Returns detailed system metrics:
- Memory usage (RSS, heap)
- CPU usage
- Node.js version
- Environment info

## 📝 Log Files

The system creates separate log files in `backend/logs/`:

- `error.log`: Application errors
- `combined.log`: All log entries
- `security.log`: Security-related events

### Log Format
```json
{
  "timestamp": "2024-01-21T14:30:00.000Z",
  "level": "error",
  "message": "APP_ERROR",
  "category": "application",
  "error": "Database connection failed",
  "stack": "...",
  "url": "/api/matches",
  "method": "GET",
  "ip": "192.168.1.100",
  "userId": "user123"
}
```

## 🔧 API Reference

### Alert System

```javascript
const alertSystem = require('./utils/alerts');

// Send critical alert
await alertSystem.critical('Database Down', {
  error: 'Connection timeout',
  timestamp: new Date()
});

// Send warning alert
await alertSystem.warning('High Memory Usage', {
  usage: '85%',
  threshold: '80%'
});

// Send security alert
await alertSystem.securityAlert('Suspicious Login', {
  ip: '192.168.1.100',
  attempts: 5
});
```

### Logger Usage

```javascript
const { securityLogger, performanceLogger, errorLogger } = require('./utils/logger');

// Log security events
securityLogger.authAttempt('FAILED', {
  email: 'user@example.com',
  ip: '192.168.1.100'
});

// Log performance metrics
performanceLogger.apiResponse('GET', '/api/matches', 200, 250, 'user123');

// Log application errors
errorLogger.appError(new Error('Database query failed'), {
  query: 'SELECT * FROM matches',
  userId: 'user123'
});
```

## 📈 Monitoring Dashboard

### Recommended Tools

1. **Grafana + Prometheus**
   - Import metrics from `/metrics` endpoint
   - Create dashboards for system monitoring

2. **ELK Stack (Elasticsearch, Logstash, Kibana)**
   - Parse log files for advanced analytics
   - Create custom dashboards

3. **DataDog or New Relic**
   - Enterprise monitoring solutions
   - Advanced alerting and APM

### Sample Dashboard Metrics

- API Response Times (p50, p95, p99)
- Error Rates by Endpoint
- Memory Usage Trends
- Database Connection Pool Usage
- Security Events Timeline
- Failed Authentication Attempts

## 🚨 Alert Examples

### Critical Alerts
- Database connection failures
- Memory usage >90%
- Security breaches detected
- External API failures

### Warning Alerts
- Memory usage >80%
- Slow API responses (>1s)
- High database connection usage
- Suspicious activity patterns

### Info Alerts
- System startup/shutdown
- Configuration changes
- Maintenance notifications

## 🔧 Maintenance

### Log Rotation
Implement log rotation to prevent disk space issues:

```bash
# Using logrotate (Linux)
cat > /etc/logrotate.d/kiwi-predict << EOF
/backend/logs/*.log {
  daily
  rotate 30
  compress
  delaycompress
  missingok
  create 644 node node
  postrotate
    pm2 reloadLogs
  endscript
}
EOF
```

### Log Analysis
```bash
# Count errors in last 24 hours
grep "$(date -d '1 day ago' +'%Y-%m-%d')" logs/error.log | wc -l

# Find most active IPs
grep "API_RESPONSE" logs/combined.log | awk '{print $7}' | sort | uniq -c | sort -nr | head -10

# Security events summary
grep "SECURITY_VIOLATION" logs/security.log | jq -r '.event' | sort | uniq -c
```

## 🛡️ Security Considerations

1. **Log Security**: Ensure log files are properly protected and rotated
2. **Alert Channels**: Use secure communication channels for alerts
3. **PII Handling**: Avoid logging sensitive user data
4. **Rate Limiting**: Monitor alert frequency to prevent spam
5. **Access Control**: Restrict access to monitoring endpoints

## 📞 Support

For monitoring system issues:
1. Check log files in `backend/logs/`
2. Verify environment variables are set correctly
3. Test alert channels manually
4. Review monitoring middleware configuration

## 🔄 Updates

The monitoring system is designed to be extensible. Future enhancements may include:
- Real-time dashboards
- Advanced anomaly detection
- Integration with cloud monitoring services
- Custom metric collection
- Automated incident response
