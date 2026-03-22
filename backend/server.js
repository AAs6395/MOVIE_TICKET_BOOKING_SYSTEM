require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

const seatCache = {
  cache: new Map(),
  locks: new Map(),

  getKey(movie, city, showtime, date, seatNumber) {
    return `${movie}_${city}_${showtime}_${date}_${seatNumber}`;
  },

  get(movie, city, showtime, date, seatNumber) {
    return this.cache.get(this.getKey(movie, city, showtime, date, seatNumber));
  },

  set(movie, city, showtime, date, seatNumber, status, user = null) {
    this.cache.set(this.getKey(movie, city, showtime, date, seatNumber), {
      status, user, timestamp: Date.now(),
    });
    return true;
  },

  invalidateShow(movie, city, showtime, date) {
    const prefix = `${movie}_${city}_${showtime}_${date}_`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  },
};

app.set('io', io);
app.set('seatCache', seatCache);

const userRoutes    = require('./routes/user.cjs');
const bookingRoutes = require('./routes/booking.cjs');
const movieRoutes   = require('./routes/movie.cjs');
const seatRoutes    = require('./routes/seat.cjs')(io, seatCache);
const authRoutes    = require('./routes/auth.js');

app.use('/api/users',    userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/movies',   movieRoutes);
app.use('/api/seats',    seatRoutes);
app.use('/api/auth',     authRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bookmyshow';

const connectWithRetry = () => {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('MongoDB connected');
      server.listen(5000, () => console.log('Server running on port 5000'));
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

io.on('connection', (socket) => {
  socket.on('joinShow', (showKey) => {
    socket.join(showKey);
  });

  socket.on('cancelBooking', (data) => {
    if (data.movie && data.city && data.showtime && data.date) {
      seatCache.invalidateShow(data.movie, data.city, data.showtime, data.date);
    }
    io.to(data.showKey).emit('seatStatusUpdate', { showKey: data.showKey, reload: true });
  });
});
