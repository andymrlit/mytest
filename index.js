const express = require('express');
const makeWASocket = require('@adiwajshing/baileys').default;
const { DisconnectReason } = require('@adiwajshing/baileys');
require('dotenv').config();
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', apiRoutes);

let sock;

const connectToWhatsApp = async () => {
  sock = makeWASocket();

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
        connectToWhatsApp();
      }
    }
    console.log('Connection Status:', connection);
  });

  sock.ev.on('messages.upsert', async (m) => {
    console.log('Received message:', JSON.stringify(m, null, 2));

    const message = m.messages[0];
    if (!message.key.fromMe && message.message) {
      const replyMessage = 'Hello from the bot!';
      await sock.sendMessage(message.key.remoteJid, { text: replyMessage });
    }
  });

  sock.ev.on('status.update', async (statusUpdate) => {
    console.log('Status Update:', JSON.stringify(statusUpdate, null, 2));

    if (statusUpdate.participant) {
      await sock.readMessages([statusUpdate.key]);
      console.log(`Marked status as seen for: ${statusUpdate.participant}`);
    }
  });
};

connectToWhatsApp();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
