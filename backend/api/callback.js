const fetch = require('node-fetch');

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Only POST webhook data allowed' });
    }

    try {
        const { reference_id, status, trx_id, sid, price } = req.body;
        const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
        const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

        if (status === 'berhasil' || req.body.status === 'berhasil') {
            const formatHarga = price ? parseInt(price).toLocaleString('id-ID') : '-';
            const pesanSuksesTelegram = 
`✅ *TRANSAKSI LUNAS OTOMATIS* ✅
-----------------------------------------
📌 *ID Order:* ${reference_id || '-'}
🆔 *iPaymu Trx ID:* ${trx_id || sid || '-'}
💰 *Dana Masuk:* Rp ${formatHarga}
🟢 *Status:* BERHASIL / SUKSES 
-----------------------------------------
Sistem pembayaran menyatakan lunas. Akun dapat segera diproses atau diaktifkan untuk pembeli!`;

            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: pesanSuksesTelegram, parse_mode: 'Markdown' })
            });
        }

        return res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = handler;
