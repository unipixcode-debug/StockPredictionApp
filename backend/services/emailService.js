const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendAlert(subject, text) {
        try {
            if (!process.env.SMTP_USER || !process.env.ADMIN_EMAIL) {
                console.log('SMTP not configured, skipping alert email.');
                return;
            }

            const info = await this.transporter.sendMail({
                from: `"PredictPro System" <${process.env.SMTP_USER}>`,
                to: process.env.ADMIN_EMAIL,
                subject: subject,
                text: text,
                html: `<div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #ef4444;">PredictPro Sistem Uyarısı</h2>
                    <p style="font-size: 16px; color: #1e293b;">${text}</p>
                    <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;">
                    <p style="font-size: 12px; color: #64748b;">Bu otomatik bir sistem uyarısıdır. Lütfen cevaplamayınız.</p>
                </div>`,
            });

            console.log('Alert email sent: %s', info.messageId);
        } catch (error) {
            console.error('Error sending alert email:', error);
        }
    }

    async sendQuotaExhaustedAlert(providerName) {
        const subject = `CRITICAL: AI Quota Exhausted - ${providerName}`;
        const text = `Sistemdeki tüm AI sağlayıcıları veya belirtilen ${providerName} sağlayıcısı kota sınırına ulaştı. Tahmin ve analiz hizmetleri şu an verilemiyor. Lütfen API anahtarlarını kontrol edin veya yeni anahtarlar ekleyin.`;
        await this.sendAlert(subject, text);
    }
}

module.exports = new EmailService();
