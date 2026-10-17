/**
 * Chat Privado con registro, login y mensajes directos.
 * Backend: Node.js + Express + SQLite (chat.db)
 * Frontend: Vanilla JS + polling para recibir mensajes en tiempo real cercano.
 */

const API = 'http://localhost:3000';

// Elementos DOM
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const toggleAuth = document.getElementById('toggle-auth');
const authBtn = document.getElementById('auth-btn');
const authMessage = document.getElementById('auth-message');
const authUsername = document.getElementById('auth-username');
const authPassword = document.getElementById('auth-password');

const btnLogout = document.getElementById('btnLogout');
const userBadge = document.getElementById('user-badge');
const usersList = document.getElementById('users-list');
const contactName = document.getElementById('contact-name');
const messagesBox = document.getElementById('messagesBox');
const formMensaje = document.getElementById('formMensaje');
const inputMensaje = document.getElementById('inputMensaje');
const btnEnviar = document.getElementById('btnEnviar');

// Estado
let isLogin = true;
let token = localStorage.getItem('chat_token');
let currentUserId = null;
let currentUserName = null;
let selectedUserId = null;
let selectedUserName = null;
let pollingInterval = null;

/* -------------------- Pantallas -------------------- */
function mostrarPantallaAuth() {
  authScreen.classList.remove('hidden');
  authScreen.classList.add('active');
  chatScreen.classList.remove('active');
  chatScreen.classList.add('hidden');
}

function mostrarPantallaChat() {
  authScreen.classList.remove('active');
  authScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  chatScreen.classList.add('active');
}

/* -------------------- Auth -------------------- */
toggleAuth.addEventListener('click', (e) => {
  e.preventDefault();
  isLogin = !isLogin;

  if (isLogin) {
    authTitle.textContent = 'Iniciar sesión';
    authSubtitle.innerHTML = '¿No tienes cuenta? <a href="#" id="toggle-auth">Regístrate aquí</a>';
    authBtn.textContent = 'Iniciar sesión';
    document.getElementById('toggle-auth').addEventListener('click', toggleAuthHandler, { once: true });
  } else {
    authTitle.textContent = 'Crear cuenta';
    authSubtitle.innerHTML = '¿Ya tienes cuenta? <a href="#" id="toggle-auth">Inicia sesión aquí</a>';
    authBtn.textContent = 'Registrarse';
    document.getElementById('toggle-auth').addEventListener('click', toggleAuthHandler, { once: true });
  }
  authMessage.textContent = '';
});

// Reasignar listener porque cambiamos el HTML del enlace
function toggleAuthHandler(e) {
  e.preventDefault();
  isLogin = !isLogin;

  if (isLogin) {
    authTitle.textContent = 'Iniciar sesión';
    authSubtitle.innerHTML = '¿No tienes cuenta? <a href="#" id="toggle-auth">Regístrate aquí</a>';
    authBtn.textContent = 'Iniciar sesión';
  } else {
    authTitle.textContent = 'Crear cuenta';
    authSubtitle.innerHTML = '¿Ya tienes cuenta? <a href="#" id="toggle-auth">Inicia sesión aquí</a>';
    authBtn.textContent = 'Registrarse';
  }
  authMessage.textContent = '';
  document.getElementById('toggle-auth').addEventListener('click', toggleAuthHandler, { once: true });
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = authUsername.value.trim();
  const password = authPassword.value.trim();
  authMessage.textContent = '';
  authBtn.disabled = true;

  try {
    if (isLogin) {
      const res = await fetch(`${API}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');

      token = data.token;
      currentUserId = data.user.id;
      currentUserName = data.user.username;
      localStorage.setItem('chat_token', token);

      entrarAlChat();
    } else {
      const res = await fetch(`${API}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrarse');

      authMessage.textContent = data.mensaje;
      authMessage.className = 'message success';
      authUsername.value = '';
      authPassword.value = '';
      isLogin = true;
      authTitle.textContent = 'Iniciar sesión';
      authSubtitle.innerHTML = '¿No tienes cuenta? <a href="#" id="toggle-auth">Regístrate aquí</a>';
      authBtn.textContent = 'Iniciar sesión';
      document.getElementById('toggle-auth').addEventListener('click', toggleAuthHandler, { once: true });
    }
  } catch (err) {
    authMessage.textContent = err.message;
    authMessage.className = 'message error';
  } finally {
    authBtn.disabled = false;
  }
});

btnLogout.addEventListener('click', () => {
  token = null;
  currentUserId = null;
  currentUserName = null;
  selectedUserId = null;
  selectedUserName = null;
  localStorage.removeItem('chat_token');
  if (pollingInterval) clearInterval(pollingInterval);
  mostrarPantallaAuth();
  authUsername.value = '';
  authPassword.value = '';
});

/* -------------------- Ingreso al chat -------------------- */
async function entrarAlChat() {
  userBadge.textContent = currentUserName;
  mostrarPantallaChat();
  await cargarUsuarios();
  iniciarPolling();
}

/* -------------------- Usuarios -------------------- */
async function cargarUsuarios() {
  try {
    const res = await fetch(`${API}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      mostrarPantallaAuth();
      return;
    }
    const users = await res.json();

    usersList.innerHTML = '';
    users.forEach((u) => {
      const li = document.createElement('li');
      li.textContent = u.username;
      li.dataset.userId = u.id;
      li.addEventListener('click', () => seleccionarUsuario(u.id, u.username, li));
      usersList.appendChild(li);
    });

    if (users.length === 0) {
      usersList.innerHTML = '<li style="color:#9ca3af;font-size:13px;padding:12px 16px;">No hay otros usuarios registrados</li>';
    }
  } catch (err) {
    console.error('Error cargando usuarios:', err);
  }
}

function seleccionarUsuario(userId, userName, elementoLi) {
  selectedUserId = userId;
  selectedUserName = userName;
  contactName.textContent = userName;

  // Marcar activo en la lista
  document.querySelectorAll('#users-list li').forEach((li) => li.classList.remove('active'));
  if (elementoLi) elementoLi.classList.add('active');

  // Habilitar input
  inputMensaje.disabled = false;
  btnEnviar.disabled = false;
  inputMensaje.focus();

  // Cargar conversación
  cargarMensajes();
}

/* -------------------- Mensajes -------------------- */
async function cargarMensajes() {
  if (!selectedUserId) return;

  try {
    const res = await fetch(`${API}/api/messages/${selectedUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      mostrarPantallaAuth();
      return;
    }
    const mensajes = await res.json();

    messagesBox.innerHTML = '';
    mensajes.forEach((m) => agregarMensajeAlDOM(m));

    scrollAlFinal();
  } catch (err) {
    console.error('Error cargando mensajes:', err);
  }
}

function agregarMensajeAlDOM(m) {
  const esMio = m.sender_id == currentUserId;

  const div = document.createElement('div');
  div.className = `msg ${esMio ? 'enviado' : 'recibido'}`;

  const texto = document.createElement('div');
  texto.textContent = m.text;

  const info = document.createElement('span');
  info.className = 'msg-info';
  info.textContent = esMio ? 'Tú' : m.sender_name;
  info.textContent += ' · ' + new Date(m.created_at).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  div.appendChild(texto);
  div.appendChild(info);
  messagesBox.appendChild(div);
}

formMensaje.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedUserId) return;

  const texto = inputMensaje.value.trim();
  if (!texto) return;

  btnEnviar.disabled = true;
  btnEnviar.textContent = 'Enviando...';

  try {
    const res = await fetch(`${API}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ receiverId: selectedUserId, text: texto }),
    });

    if (res.status === 401 || res.status === 403) {
      mostrarPantallaAuth();
      return;
    }

    const msg = await res.json();
    agregarMensajeAlDOM(msg);
    inputMensaje.value = '';
    scrollAlFinal();
  } catch (err) {
    alert('Error enviando el mensaje');
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = 'Enviar';
  }
});

inputMensaje.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    formMensaje.requestSubmit ? formMensaje.requestSubmit() : formMensaje.dispatchEvent(new Event('submit'));
  }
});

function scrollAlFinal() {
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

/* -------------------- Polling (recibir mensajes nuevos) -------------------- */
async function pollingMensajes() {
  if (!selectedUserId) return;

  try {
    const res = await fetch(`${API}/api/messages/${selectedUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      mostrarPantallaAuth();
      return;
    }
    const mensajes = await res.json();

    // Solo renderizar si hay mensajes nuevos (comparar por cantidad)
    if (mensajes.length === messagesBox.children.length) return;

    messagesBox.innerHTML = '';
    mensajes.forEach((m) => agregarMensajeAlDOM(m));
    scrollAlFinal();
  } catch (err) {
    console.error('Polling error:', err);
  }
}

function iniciarPolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(pollingMensajes, 3000);
}

/* -------------------- Inicio -------------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (token) {
    // Validar que el token siga siendo válido y entrar al chat
    entrarAlChat();
  } else {
    mostrarPantallaAuth();
  }
});
