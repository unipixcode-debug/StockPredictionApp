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
            console.error('❌ CRITICAL: Email service failure (suppressed to prevent crash):', error.message);
        }
    }

    async sendQuotaExhaustedAlert(providerName) {
        const subject = `CRITICAL: AI Quota Exhausted - ${providerName}`;
        const text = `Sistemdeki tüm AI sağlayıcıları veya belirtilen ${providerName} sağlayıcısı kota sınırına ulaştı. Tahmin ve analiz hizmetleri şu an verilemiyor. Lütfen API anahtarlarını kontrol edin veya yeni anahtarlar ekleyin.`;
        await this.sendAlert(subject, text);
    }

    async sendBotStoppedAlert(userEmail, currentCredits) {
        const subject = `⚠️ PredictPro: Bot Taraması Durduruldu (Yetersiz Bakiye)`;
        const text = `Hesabınızdaki kredi miktarı (${currentCredits}) tükendiği için AI Bot taraması durdurulmuştur. Botun tekrar çalışması için lütfen kredi yükleyiniz. Açık olan pozisyonlarınız bakiye durumundan etkilenmez ve stratejiye göre kapanmaya devam eder.`;
        
        try {
            await this.transporter.sendMail({
                from: `"PredictPro System" <${process.env.SMTP_USER}>`,
                to: userEmail,
                subject: subject,
                text: text,
                html: `<div style="font-family: sans-serif; padding: 20px; background: #fffcf0; border: 1px solid #fbbf24; border-radius: 8px;">
                    <h2 style="color: #b45309;">⚠️ Bot Taraması Durduruldu</h2>
                    <p style="font-size: 16px; color: #1e293b;">${text}</p>
                    <hr style="border: 0; border-top: 1px solid #fde68a; margin: 20px 0;">
                    <p style="font-size: 12px; color: #6b7280;">Bakiye: ${currentCredits} | Kullanıcı: ${userEmail}</p>
                </div>`,
            });
            console.log(`Bot stop alert sent to ${userEmail}`);
        } catch (error) {
            console.error('Failed to send bot stop email:', error.message);
        }
    }
}

module.exports = new EmailService();
