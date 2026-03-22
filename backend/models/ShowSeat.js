const mongoose = require('mongoose');

const showSeatSchema = new mongoose.Schema({
  showKey: { type: String, required: true },
  seatNumber: { type: Number, required: true },
  bookedBy: { type: String, required: true },
  bookingId: { type: mongoose.Schema.Types.Mixed, ref: 'Booking', required: true },
  status: { type: String, enum: ['available', 'held', 'booked'], default: 'booked' },
  heldBy: { type: String },
  holdExpiresAt: { type: Date },
}, { timestamps: true });

showSeatSchema.index({ showKey: 1, seatNumber: 1 }, { unique: true });
showSeatSchema.index({ bookingId: 1 });
showSeatSchema.index({ showKey: 1, bookedBy: 1 });

showSeatSchema.statics.findByBookingId = function (bookingId) {
  const stringId = bookingId.toString();
  let objectId;
  try {
    if (mongoose.Types.ObjectId.isValid(bookingId)) {
      objectId = new mongoose.Types.ObjectId(bookingId);
    }
  } catch {}
  return this.find({
    $or: [
      { bookingId: stringId },
      ...(objectId ? [{ bookingId: objectId }] : [])
    ]
  });
};

showSeatSchema.statics.deleteByBookingId = function (bookingId) {
  const stringId = bookingId.toString();
  let objectId;
  try {
    if (mongoose.Types.ObjectId.isValid(bookingId)) {
      objectId = new mongoose.Types.ObjectId(bookingId);
    }
  } catch {}
  return this.deleteMany({
    $or: [
      { bookingId: stringId },
      ...(objectId ? [{ bookingId: objectId }] : [])
    ]
  });
};

module.exports = mongoose.model('ShowSeat', showSeatSchema);