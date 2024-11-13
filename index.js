const express = require('express');
const { default: makeWASocket, useMultiFileAuthState } = require('@adiwajshing/baileys');
const { DisconnectReason } = require('@adiwajshing/baileys');
const qrcode = require('qrcode');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const sessions = {};

// Serve static files (HTML, CSS)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API route to generate QR code for a new session
app.post('/api/pair', async (req, res) => {
  const { phoneNumber } = req.body;

  if (sessions[phoneNumber]) {
    return res.status(400).json({ error: 'Session already exists for this number.' });
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions/${phoneNumber}`);
    const sock = makeWASocket({ auth: state });

    sessions[phoneNumber] = sock;

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Generate QR code and send to frontend
        qrcode.toDataURL(qr, (err, url) => {
          res.json({ qr: url });
        });
      }

      if (connection === 'close') {
        if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
          delete sessions[phoneNumber];
          sock.end();
        }
      }
      console.log('Connection Status:', connection);
    });

    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      if (!message.key.fromMe && message.message) {
        const replyMessage = 'Hello from the bot!';
        await sock.sendMessage(message.key.remoteJid, { text: replyMessage });
      }
    });

  } catch (error) {
    console.error('Error setting up session:', error);
    res.status(500).json({ error: 'Failed to setup WhatsApp session' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
