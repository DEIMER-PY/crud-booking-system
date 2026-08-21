import express from 'express';
import cors from 'cors';
import jsonServer from 'json-server';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const SECRET = 'crud-booking-secret';

const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();
const db = router.db;

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(middlewares);

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '12h' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado, falta token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ---------- AUTH ----------
app.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Datos incompletos' });
  const exists = db.get('users').find({ email }).value();
  if (exists) return res.status(409).json({ error: 'El email ya está registrado' });
  const user = { id: uuid(), name, email, password, role: 'user', avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}` };
  db.get('users').push(user).write();
  const { password: _pw, ...safe } = user;
  res.status(201).json({ user: safe, token: sign(user) });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.get('users').find({ email, password }).value();
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
  const { password: _pw, ...safe } = user;
  res.json({ user: safe, token: sign(user) });
});

app.get('/auth/me', auth, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  const { password: _pw, ...safe } = user;
  res.json(safe);
});

// ---------- NOTIFICATIONS HELPER ----------
function notify(userId, message, type = 'info') {
  const n = { id: uuid(), userId, message, type, read: false, createdAt: new Date().toISOString() };
  db.get('notifications').push(n).write();
  return n;
}

// ---------- BOOKINGS (race-condition safe) ----------
let bookingLock = Promise.resolve();

app.get('/bookings', auth, (req, res) => {
  const all = db.get('bookings').value();
  const mine = req.user.role === 'admin' ? all : all.filter((b) => b.userId === req.user.id);
  res.json(mine);
});

app.post('/bookings', auth, async (req, res) => {
  const { resourceId, date, time } = req.body;
  if (!resourceId || !date || !time) return res.status(400).json({ error: 'resourceId, date y time son requeridos' });

  // Serialize booking creation to prevent two people booking the same slot at once
  bookingLock = bookingLock.then(async () => {
    const resource = db.get('resources').find({ id: resourceId }).value();
    if (!resource) {
      res.status(404).json({ error: 'Recurso no encontrado' });
      return;
    }
    const conflict = db.get('bookings')
      .find((b) => b.resourceId === resourceId && b.date === date && b.time === time && b.status !== 'cancelled')
      .value();
    if (conflict) {
      res.status(409).json({ error: 'Ese horario ya fue reservado por otra persona. Elige otro.' });
      notify(req.user.id, `Conflicto: el horario ${date} ${time} para "${resource.name}" ya no está disponible.`, 'error');
      return;
    }
    const booking = {
      id: uuid(),
      userId: req.user.id,
      resourceId,
      date,
      time,
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
    };
    db.get('bookings').push(booking).write();
    notify(req.user.id, `Reserva creada para "${resource.name}" el ${date} a las ${time}. Pendiente de pago.`, 'success');
    res.status(201).json(booking);
  });

  await bookingLock;
});

app.put('/bookings/:id', auth, (req, res) => {
  const booking = db.get('bookings').find({ id: req.params.id }).value();
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (booking.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });
  db.get('bookings').find({ id: req.params.id }).assign(req.body).write();
  res.json(db.get('bookings').find({ id: req.params.id }).value());
});

app.delete('/bookings/:id', auth, (req, res) => {
  const booking = db.get('bookings').find({ id: req.params.id }).value();
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (booking.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });
  db.get('bookings').remove({ id: req.params.id }).write();
  notify(booking.userId, `Reserva del ${booking.date} ${booking.time} fue cancelada.`, 'info');
  res.status(204).end();
});

// ---------- PAYMENTS ----------
app.post('/payments', auth, (req, res) => {
  const { bookingId, cardName, amount } = req.body;
  const booking = db.get('bookings').find({ id: bookingId }).value();
  if (!booking) return res.status(404).json({ error: 'Reserva no encontrada' });
  if (booking.userId !== req.user.id) return res.status(403).json({ error: 'No autorizado' });
  if (booking.status === 'confirmed') return res.status(409).json({ error: 'La reserva ya fue pagada' });

  const payment = {
    id: uuid(),
    bookingId,
    userId: req.user.id,
    cardName: cardName || 'Tarjeta',
    amount,
    status: 'approved',
    createdAt: new Date().toISOString(),
  };
  db.get('payments').push(payment).write();
  db.get('bookings').find({ id: bookingId }).assign({ status: 'confirmed' }).write();
  notify(req.user.id, `Pago de $${amount} aprobado. Reserva confirmada.`, 'success');
  res.status(201).json(payment);
});

app.get('/payments', auth, (req, res) => {
  const all = db.get('payments').value();
  const mine = req.user.role === 'admin' ? all : all.filter((p) => p.userId === req.user.id);
  res.json(mine);
});

// ---------- NOTIFICATIONS ----------
app.get('/notifications', auth, (req, res) => {
  const all = db.get('notifications').filter({ userId: req.user.id }).orderBy('createdAt', 'desc').value();
  res.json(all);
});

app.put('/notifications/:id', auth, (req, res) => {
  db.get('notifications').find({ id: req.params.id, userId: req.user.id }).assign({ read: true }).write();
  res.json(db.get('notifications').find({ id: req.params.id }).value());
});

// ---------- RESOURCES (with images) ----------
app.get('/resources', (req, res) => res.json(db.get('resources').value()));
app.post('/resources', auth, (req, res) => {
  const resource = { id: uuid(), ...req.body };
  db.get('resources').push(resource).write();
  res.status(201).json(resource);
});
app.put('/resources/:id', auth, (req, res) => {
  db.get('resources').find({ id: req.params.id }).assign(req.body).write();
  res.json(db.get('resources').find({ id: req.params.id }).value());
});
app.delete('/resources/:id', auth, (req, res) => {
  db.get('resources').remove({ id: req.params.id }).write();
  res.status(204).end();
});

// ---------- IMAGE UPLOAD (base64 data URL, stored inline) ----------
app.post('/upload', auth, (req, res) => {
  const { dataUrl, name } = req.body;
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return res.status(400).json({ error: 'Imagen inválida' });
  res.status(201).json({ url: dataUrl, name: name || 'imagen' });
});

app.use('/db', router); // fallback raw json-server CRUD for resources/users if needed

app.listen(PORT, () => {
  console.log(`API + JSON Server escuchando en http://localhost:${PORT}`);
});
