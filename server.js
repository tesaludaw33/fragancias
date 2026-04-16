const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'wfraganc.sqlite');
const SESSION_SECRET = process.env.SESSION_SECRET || 'wfraganc-change-this-secret';

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at TEXT NOT NULL
  );
`);

function nowIso() {
  return new Date().toISOString();
}

function seedAdmin() {
  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admi';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admi';
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER || 'tesaludaw33@gmail.com';
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);
  if (existing) return;

  const passwordHash = bcrypt.hashSync(adminPassword, 12);
  db.prepare(`
    INSERT INTO users (full_name, email, username, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, 'admin', ?)
  `).run("Administrador W'Fraganc", adminEmail, adminUsername, passwordHash, nowIso());

  console.log(`Administrador inicial creado: ${adminUsername}`);
}

seedAdmin();

app.set('trust proxy', 1);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 12
  }
}));

app.use('/static', express.static(PUBLIC_DIR, { fallthrough: false }));

function getMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

async function notifyAdmin(newUser) {
  const transporter = getMailer();
  const destination = process.env.ADMIN_NOTIFY_EMAIL || 'tesaludaw33@gmail.com';
  if (!transporter || !destination) {
    console.log('Aviso por correo omitido: faltan variables SMTP en .env');
    return;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.7">
      <h2 style="margin:0 0 12px">Nuevo registro en W'Fraganc</h2>
      <p>Se registró un nuevo usuario en la boutique:</p>
      <ul>
        <li><strong>Nombre:</strong> ${escapeHtml(newUser.fullName)}</li>
        <li><strong>Email:</strong> ${escapeHtml(newUser.email)}</li>
        <li><strong>Usuario:</strong> ${escapeHtml(newUser.username)}</li>
        <li><strong>Fecha:</strong> ${escapeHtml(newUser.createdAt)}</li>
      </ul>
      <p>La contraseña no se envía por correo y quedó guardada cifrada en la base de datos.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: destination,
    subject: `Nuevo registro en W'Fraganc: ${newUser.username}`,
    html
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    username: row.username,
    role: row.role,
    createdAt: row.created_at
  };
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth');
  }
  next();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'wfraganc', environment: NODE_ENV });
});

app.get('/auth', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'auth.html'));
});

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'catalog.html'));
});

app.get('/api/session', (req, res) => {
  if (!req.session.user) {
    return res.json({ authenticated: false });
  }
  res.json({ authenticated: true, user: req.session.user });
});

app.post('/api/register', async (req, res) => {
  const fullName = String(req.body.fullName || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!fullName || !email || !username || !password) {
    return res.status(400).json({ message: 'Completa todos los campos.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener mínimo 8 caracteres.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Escribe un correo válido.' });
  }
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
    return res.status(400).json({ message: 'El usuario debe tener entre 3 y 32 caracteres y solo usar letras, números, punto, guion o guion bajo.' });
  }

  const duplicate = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (duplicate) {
    return res.status(409).json({ message: 'Ese correo o usuario ya está registrado.' });
  }

  const createdAt = nowIso();
  const passwordHash = bcrypt.hashSync(password, 12);
  const result = db.prepare(`
    INSERT INTO users (full_name, email, username, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, 'user', ?)
  `).run(fullName, email, username, passwordHash, createdAt);

  const newUser = {
    id: result.lastInsertRowid,
    fullName,
    email,
    username,
    createdAt
  };

  try {
    await notifyAdmin(newUser);
  } catch (error) {
    console.error('No se pudo enviar el correo de notificación:', error.message);
  }

  res.status(201).json({ message: 'Cuenta creada correctamente. Ya puedes iniciar sesión.' });
});

app.post('/api/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!username || !password) {
    return res.status(400).json({ message: 'Escribe usuario y contraseña.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
  }

  const validPassword = bcrypt.compareSync(password, user.password_hash);
  if (!validPassword) {
    return res.status(401).json({ message: 'Usuario o contraseña incorrectos.' });
  }

  req.session.user = sanitizeUser(user);
  res.json({ message: 'Sesión iniciada correctamente.', user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada.' });
});

app.listen(PORT, HOST, () => {
  console.log(`W'Fraganc listo en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
