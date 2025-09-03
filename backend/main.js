const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');




dotenv.config();
let mensajeAutoReply = 'Hola, gracias por tu mensaje'; // valor por defecto

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const PORT=process.env.PORT || 3000;
const API_VERSION=process.env.WHATSAPP_CLOUD_API_VERSION;
const VERIFY_TOKEN=process.env.VERIFY_TOKEN; // CUALQUIER CADENA QUE LE PUEDAS ASIGNAR ELLO TAMBIEN TIENE QUE REGISTRARSE EN LA PLATAFORMA META
//const ACCESS_TOKEN='EAAO3MB9z5Q4BPNeOR3UjvMKF50InRPIn8iF6HbVGgT0rUEqnJmX2ZBnZCTjrWqJRaOh52nhqdxzFmYIZB9dvAhQXXnePKVVnyhS3yOVVGmgPstkCkkaF4mlCbFAb7OEjZCKTz8YzEkQudCz9ELkJ79YElWbZBNZAvC4VEEa0pNcMaWZAKBwIyeSZB3vJtui760CFHcQZCq2cYkO8gqxOkzqSj6n1cxCQtwXkZCAZA2L';


app.use(cors());
app.use(bodyParser.json());


io.on('connection', (socket) => {
  console.log('Cliente conectado a socket.io');

  socket.on('set-auto-reply', (msg) => {
    console.log('Mensaje automático actualizado:', msg);
    mensajeAutoReply = msg;
  });
});


const phoneMap = {
  [process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID]: process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN,
  [process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID_1]: process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN,
  
};
console.log("📌 phoneMap cargado:", phoneMap);
// fuera de los handlers, al inicio del archivo
const processedIds = new Set();
const MAX_IDS = 5000;
function rememberId(id) {
  processedIds.add(id);
  if (processedIds.size > MAX_IDS) {
    const first = processedIds.values().next().value;
    processedIds.delete(first);
  }
}



// 🔹 reconstruir __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 📌 servir la carpeta frontend
app.use("/frontend", express.static(path.join(__dirname, "frontend")));



// 🚀 Endpoint de prueba
app.get("/", (req, res) => {
  res.send("Servidor corriendo 🚀");
});

// Webhook de Meta (POST para mensajes entrantes)



app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object) {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0]?.value?.messages?.[0];
    const phoneNumberId = entry?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (changes && phoneNumberId) {
      const msgId = changes.id;
      const msgTimestamp = parseInt(changes.timestamp, 10); // viene como string

      // ⛔️ Filtrar mensajes viejos
      const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
      if (msgTimestamp < todayStart) {
        console.log("⏩ Ignorado mensaje antiguo:", msgId);
        return res.sendStatus(200);
      }

      if (processedIds.has(msgId)) {
        return res.sendStatus(200);
      }
      rememberId(msgId);

      const msg = {
        id: msgId,
    from: changes.from,
    to: changes.to, // 👈 asegúrate de capturar el destino
    type: changes.type,
    content:
      changes.text?.body ||
      changes.button?.text ||
      changes.interactive?.button_reply?.title ||
      '[Mensaje no soportado]',
    raw: changes,
    timestamp: changes.timestamp,
    phone_number_id: phoneNumberId,
    status: "sent",
      };
// ⚡️ Si el mensaje es de la empresa, actualizamos el "pending"
  if (changes.from === phoneNumberId) {
    io.emit("update-message", msg);
  } else {
    io.emit("new-message", msg); // mensaje de cliente
  }
     
    }

    
  }
  res.sendStatus(200);
});










// Webhook de verificación (GET)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
console.log('Webhook GET recibido:', { mode, token, challenge });
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Verificación exitosa');
    res.status(200).send(challenge);
  } else {
      console.log('Verificación fallida');
    res.sendStatus(403);
  }
});


// Endpoint para enviar mensajes
// Endpoint para enviar mensajes




app.post('/send-message', async (req, res) => {
  const { to, text, phone_number_id } = req.body;

  // Obtener el token correcto según el phone_number_id
  const accessToken = phoneMap[phone_number_id];
  if (!accessToken) {
    return res.status(400).json({ success: false, error: 'Número no registrado en phoneMap' });
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${phone_number_id}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Emitir el mensaje enviado
   
    io.emit('new-message', {
      id: `local-${Date.now()}`,  // 👈 ID único temporal
      from: 'empresa',
      content: text,
      //raw: { to, text, phone_number_id },
      timestamp: Math.floor(Date.now() / 1000),
       phone_number_id, 
       status: "pending"
    }); 

    res.json({ success: true, response: response.data });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ success: false, error: err.message });
  }
});




/*

app.post('/send-message', async (req, res) => {
  const { to, text } = req.body;

  try {
    const response = await axios.post(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // ✅ Emitir el mensaje enviado para mostrarlo en pantalla
    // 👇 Emitir mensaje a la interfaz
    io.emit('new-message', {
      from: 'empresa',
      content: text,
      raw: { to, text },
      timestamp: Math.floor(Date.now() / 1000),
    });

    res.json({ success: true, response: response.data });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ success: false, error: err.message });
  }
});


*/





server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
