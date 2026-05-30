const fetch = require('node-fetch');

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Hanya menerima request POST Webhook.' });
    }

    try {
        const { reference_id, status, trx_id, sid, price } = req.body;
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        // Mengecek status respon lunas dari server gateway iPaymu
        if (status === 'berhasil' || req.body.status === 'berhasil') {
            const formatHarga = price ? parseInt(price).toLocaleString('id-ID') : '-';
            
            const pesanSuksesTelegram = 
`✅ *TRANSAKSI TERVERIFIKASI LUNAS* ✅
-----------------------------------------
📌 *ID Order:* ${reference_id || '-'}
🆔 *iPaymu Trx ID:* ${trx_id || sid || '-'}
💰 *Dana Masuk:* Rp ${formatHarga}
🟢 *Keamanan:* Terverifikasi Sah (OK)
-----------------------------------------
Sistem iPaymu menyatakan pembayaran valid. Silakan berikan lisensi AJM Guardian kepada pembeli!`;

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: pesanSuksesTelegram, parse_mode: 'Markdown' })
            });
        }

        // Respon teks 'OK' wajib dikirim agar server iPaymu tahu callback sukses diterima
        return res.status(200).send('OK');

    } catch (error) {
        console.error('Callback Error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = handler;
