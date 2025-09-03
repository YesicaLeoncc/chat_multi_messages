const socket = io('http://localhost:3000');
const chat = document.getElementById('chat');
const lastPhoneIdMap = {}; // cliente -> phone_number_id

socket.on('new-message', (msg) => {
  const div = document.createElement('div');
  div.className = 'message';

  if (msg.from === 'empresa') {
    div.style.background = '#dcf8c6'; // verde claro
    div.style.textAlign = 'right';
  } else {
    div.style.background = '#ffffff'; // blanco
    div.style.textAlign = 'left';
  }

  div.innerHTML = `
    <strong>De: ${msg.from}</strong><br>
    <div>${msg.content}</div>
    <div class="timestamp">${new Date(msg.timestamp * 1000).toLocaleTimeString()}</div>
    <details><summary>Ver RAW</summary><pre class="raw">${JSON.stringify(msg.raw, null, 2)}</pre></details>
  `;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
 // guardar con qué línea llegó
});
