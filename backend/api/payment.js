const fetch = require('node-fetch');
const crypto = require('crypto');

function allowCors(fn) {
    return async (req, res) => {
        res.setHeader('Access-Control-Allow-Credentials', true);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
        res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
        if (req.method === 'OPTIONS') return res.status(200).end();
        return await fn(req, res);
    };
}

async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

    try {
        const { packageName, price, name, telegram, whatsapp } = req.body;
        if (!packageName || !price || !name || !telegram || !whatsapp) {
            return res.status(400).json({ success: false, message: 'Data input tidak lengkap.' });
        }

        const IPAYMU_VA = process.env.IPAYMU_VA;
        const IPAYMU_KEY = process.env.IPAYMU_KEY;
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
        const BACKEND_DOMAIN = process.env.BACKEND_DOMAIN || 'https://domain-anda.vercel.app';
        const IS_PRODUCTION = process.env.IPAYMU_SANDBOX !== 'true';

        const orderId = 'AJM-' + Date.now();
        const formatHarga = parseInt(price).toLocaleString('id-ID');

        const bodyIpaymu = {
            product: [packageName],
            qty: [1],
            price: [parseInt(price)],
            description: `Pembelian ${packageName} senilai Rp ${formatHarga}`,
            returnUrl: `https://t.me/Rayanxweb37`,
            cancelUrl: `https://t.me/Rayanxweb37`,
            notifyUrl: `${BACKEND_DOMAIN}/api/callback`,
            referenceId: orderId,
            buyerName: name,
            buyerPhone: whatsapp,
            buyerEmail: 'buyer@ajmguardian.store'
        };

        const bodyEncrypt = JSON.stringify(bodyIpaymu);
        const requestBodyHash = crypto.createHash('sha256').update(bodyEncrypt).digest('hex').toLowerCase();
        const stringToSign = `POST:${IPAYMU_VA}:${requestBodyHash}:${IPAYMU_KEY}`;
        const signature = crypto.createHmac('sha256', IPAYMU_KEY).update(stringToSign).digest('hex');

        const ipaymuUrl = IS_PRODUCTION ? 'https://my.ipaymu.com/api/v2/payment' : 'https://sandbox.ipaymu.com/api/v2/payment';

        const ipaymuResponse = await fetch(ipaymuUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'va': IPAYMU_VA, 'signature': signature },
            body: bodyEncrypt
        });

        const ipaymuData = await ipaymuResponse.json();
        if (ipaymuData.Status !== 200) throw new Error(ipaymuData.Message || 'Kesalahan handshake API iPaymu.');

        const paymentUrl = ipaymuData.Data.Url;

        // Telegram Notification (Menunggu Pembayaran)
        const pesanTelegram = 
`📝 *INVOICE BARU DIBUAT* 📝
-----------------------------------------
📌 *ID Order:* ${orderId}
📦 *Paket:* ${packageName}
💰 *Total:* Rp ${formatHarga}
👤 *Nama:* ${name}
✈️ *Telegram:* ${telegram}
📱 *WhatsApp:* ${whatsapp}
-----------------------------------------
🔗 *Link Pembayaran:* ${paymentUrl}
⏳ _Menunggu konfirmasi penyelesaian pembayaran oleh user..._`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: pesanTelegram, parse_mode: 'Markdown' })
        });

        return res.status(200).json({ success: true, paymentUrl });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = allowCors(handler);
