const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.adminEmail = process.env.ADMIN_EMAIL;
    }

    initTransporter() {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.warn("SMTP credentials missing. Email alerts will not be sent.");
            return false;
        }

        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for others
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        return true;
    }

    async sendAlert(subject, text) {
        try {
            if (!this.transporter) {
                const initialized = this.initTransporter();
                if (!initialized) return;
            }

            const mailOptions = {
                from: `"PredictPro Monitor" <${process.env.SMTP_USER}>`,
                to: this.adminEmail,
                subject: `🚨 PredictPro ALERT: ${subject}`,
                text: text,
                html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                        <h2 style="color: #e11d48;">🚨 PredictPro Sistem Uyarısı</h2>
                        <p>${text.replace(/\n/g, '<br>')}</p>
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                        <small style="color: #666;">Bu e-posta otomatik olarak oluşturulmuştur.</small>
                       </div>`
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Alert email sent: ' + info.messageId);
        } catch (error) {
            console.error('Failed to send alert email:', error.message);
        }
    }

    async sendQuotaExhaustedAlert(providerName) {
        const subject = `AI Kotası Tükendi (${providerName})`;
        const text = `PredictPro uygulaması için kullanılan ${providerName} anahtarının kotası tükenmiş görünüyor. 
        Analizlerin devam edebilmesi için lütfen API anahtarlarınızı kontrol edin veya yeni bir anahtar ekleyin.
        
        Tarih: ${new Date().toLocaleString('tr-TR')}`;
        
        await this.sendAlert(subject, text);
    }
}

module.exports = new EmailService();
