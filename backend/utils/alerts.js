const nodemailer = require('nodemailer');
const axios = require('axios');
const { logger } = require('./logger');

// Email transporter configuration
let emailTransporter = null;

function initializeEmailTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
}

// Initialize email transporter on module load
initializeEmailTransporter();

// Alert system with multiple notification channels
const alertSystem = {
  // Send email alert
  async sendEmail(subject, message, details = {}) {
    if (!emailTransporter || !process.env.ALERT_EMAIL) {
      logger.warn('Email alerts not configured', { subject, message });
      return;
    }

    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: process.env.ALERT_EMAIL,
        subject: `[Kiwi Predict Alert] ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">🚨 System Alert</h2>
            <p><strong>${message}</strong></p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3>Details:</h3>
              <pre style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify(details, null, 2)}</pre>
            </div>
            <p style="color: #6b7280; font-size: 12px;">
              Generated at: ${new Date().toISOString()}<br>
              Environment: ${process.env.NODE_ENV || 'development'}
            </p>
          </div>
        `,
      };

      await emailTransporter.sendMail(mailOptions);
      logger.info('Email alert sent successfully', { subject, recipient: process.env.ALERT_EMAIL });
    } catch (error) {
      logger.error('Failed to send email alert', { error: error.message, subject });
    }
  },

  // Send Slack alert
  async sendSlack(message, details = {}, color = 'danger') {
    if (!process.env.SLACK_WEBHOOK_URL) {
      logger.warn('Slack alerts not configured', { message });
      return;
    }

    try {
      const slackMessage = {
        attachments: [{
          color: color,
          title: '🚨 Kiwi Predict Alert',
          text: message,
          fields: Object.entries(details).map(([key, value]) => ({
            title: key,
            value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
            short: false
          })),
          footer: 'Kiwi Predict Monitoring',
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      await axios.post(process.env.SLACK_WEBHOOK_URL, slackMessage);
      logger.info('Slack alert sent successfully', { message });
    } catch (error) {
      logger.error('Failed to send Slack alert', { error: error.message, message });
    }
  },

  // Send alert to all configured channels
  async alert(level, message, details = {}) {
    logger.error(`ALERT_${level.toUpperCase()}`, {
      message,
      ...details,
      timestamp: new Date().toISOString(),
      category: 'alert'
    });

    // Determine color based on level
    const colors = {
      critical: 'danger',
      warning: 'warning',
      info: 'good'
    };

    const color = colors[level] || 'danger';

    // Send to console (always)
    console.error(`🚨 ${level.toUpperCase()} ALERT: ${message}`, details);

    // Send to all configured channels
    await Promise.allSettled([
      this.sendEmail(`${level.toUpperCase()}: ${message}`, message, details),
      this.sendSlack(message, details, color)
    ]);
  },

  // Critical system alerts
  async critical(message, details) {
    await this.alert('critical', message, details);
  },

  // Warning alerts
  async warning(message, details) {
    await this.alert('warning', message, details);
  },

  // Info alerts
  async info(message, details) {
    await this.alert('info', message, details);
  },

  // Specific alert types
  async securityAlert(event, details) {
    await this.critical(`Security Alert: ${event}`, {
      ...details,
      alertType: 'security',
      timestamp: new Date().toISOString()
    });
  },

  async performanceAlert(event, details) {
    await this.warning(`Performance Alert: ${event}`, {
      ...details,
      alertType: 'performance',
      timestamp: new Date().toISOString()
    });
  },

  async systemAlert(event, details) {
    await this.critical(`System Alert: ${event}`, {
      ...details,
      alertType: 'system',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = alertSystem;
