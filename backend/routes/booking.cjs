const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const ShowSeat = require('../models/ShowSeat');
const mongoose = require('mongoose');

const seatLocks = new Map();
const LOCK_TIMEOUT = 5 * 60 * 1000;

const getCacheKey = (movie, city, showtime, date) =>
  `${movie}_${city}_${showtime}_${date}`;

const lockSeats = (movie, city, showtime, date, seats) => {
  const key = getCacheKey(movie, city, showtime, date);
  const current = seatLocks.get(key) || new Map();
  seats.forEach((seat) => current.set(seat, Date.now()));
  seatLocks.set(key, current);
};

const areSeatsLocked = (movie, city, showtime, date, seats) => {
  const key = getCacheKey(movie, city, showtime, date);
  const current = seatLocks.get(key);
  if (!current) return false;
  const now = Date.now();
  return seats.some((seat) => {
    const lockTime = current.get(seat);
    return lockTime && now - lockTime < LOCK_TIMEOUT;
  });
};

// GET booked seats for a specific show & date (used by Theater polling)
router.get('/seat-status', async (req, res) => {
  const { movie, city, showtime, date } = req.query;
  try {
    const bookings = await Booking.find({
      movie, city, showtime,
      showDate: {
        $gte: new Date(date),
        $lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
      },
    });
    const seats = bookings.flatMap((b) => b.seatsBooked.map(Number));
    res.json({ success: true, seats });
  } catch {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST create booking
router.post('/', async (req, res) => {
  try {
    const {
      user, movie, email, theaterId, theaterName,
      city, showtime, showDate, seatsBooked,
      numberOfSeats, totalAmount, paymentDetails,
      convenienceFee, taxes,
    } = req.body;

    if (!user || !movie || !email || !showtime || !showDate || !seatsBooked?.length) {
      return res.status(400).json({ success: false, message: 'Missing required booking fields' });
    }

    const requestedSeats = seatsBooked.map(Number);

    if (areSeatsLocked(movie, city, showtime, showDate, requestedSeats)) {
      return res.status(409).json({ success: false, message: 'Some seats are being booked by another user' });
    }

    lockSeats(movie, city, showtime, showDate, requestedSeats);

    // Check for conflicts in DB
    const existingBookings = await Booking.find({
      movie, city, showtime,
      showDate: {
        $gte: new Date(showDate),
        $lt: new Date(new Date(showDate).setDate(new Date(showDate).getDate() + 1)),
      },
      status: { $in: ['confirmed', 'completed'] },
    });
    const bookedSeats = existingBookings.flatMap((b) => b.seatsBooked.map(Number));
    const conflicts = requestedSeats.filter((s) => bookedSeats.includes(s));
    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Seats already booked: ${conflicts.join(', ')}`,
      });
    }

    const booking = new Booking({
      user, movie, email,
      theaterId: theaterId || `${city}_theater`,
      theaterName: theaterName || `${city} Theater`,
      city, showtime,
      showDate: new Date(showDate),
      seatsBooked,
      numberOfSeats: numberOfSeats || seatsBooked.length,
      totalAmount: totalAmount || 0,
      paymentDetails: paymentDetails || { method: 'card', status: 'completed' },
      convenienceFee: convenienceFee || 0,
      taxes: taxes || 0,
      status: 'confirmed',
    });

    const saved = await booking.save();
    res.status(201).json({ success: true, data: saved, message: 'Booking created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create booking', error: err.message });
  }
});

// GET bookings for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch user bookings' });
  }
});

// DELETE cancel booking
router.delete('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const showDate = new Date(booking.showDate);
    const dateStr = showDate.toISOString().split('T')[0];
    const showKey = `${booking.movie}_${booking.city}_${booking.showtime}_${dateStr}`;
    const seatNumbers = (booking.seatsBooked || []).map(Number);

    // Remove ShowSeat records
    try {
      await ShowSeat.deleteByBookingId(bookingId);

      // Fallback: remove by showKey + seatNumber
      if (seatNumbers.length > 0) {
        await ShowSeat.deleteMany({ showKey, seatNumber: { $in: seatNumbers } });
      }
      if (booking.user) {
        await ShowSeat.deleteMany({ showKey, bookedBy: booking.user });
      }
    } catch (seatErr) {
      console.error('Error deleting ShowSeat records:', seatErr.message);
    }

    await Booking.findByIdAndDelete(bookingId);

    // Notify via Socket.IO
    try {
      const io = req.app.get('io');
      if (io) io.emit('cancelBooking', { showKey });
    } catch { /* ignore */ }

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

// GET booked seats (simple – no date filter)
router.get('/booked-seats', async (req, res) => {
  const { movie, city, showtime } = req.query;
  if (!movie || !city || !showtime) {
    return res.status(400).json({ success: false, message: 'Missing parameters' });
  }
  try {
    const bookings = await Booking.find({ movie, city, showtime });
    const seats = [...new Set(bookings.flatMap((b) => (b.seatsBooked || []).map(Number)))];
    res.json({ success: true, seats });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch booked seats' });
  }
});

module.exports = router;
