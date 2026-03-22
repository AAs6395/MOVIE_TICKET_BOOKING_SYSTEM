const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    movie: { type: String, required: true },
    user: { type: String, required: true },
    email: { type: String, required: true },
    theaterName: { type: String, required: true },
    theaterId: { type: String },
    city: { type: String, required: true },
    showtime: { type: String, required: true },
    showDate: { type: Date, required: true },
    seatsBooked: { type: [String], required: true },
    numberOfSeats: { type: Number, required: true, min: 1 },
    totalAmount: { type: Number, required: true },
    bookingStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled'],
        default: 'Confirmed',
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'confirmed',
    },
    paymentDetails: {
        method: { type: String },
        transactionId: String,
        status: { type: String, default: 'completed' },
        amount: Number,
        currency: { type: String, default: 'INR' }
    },
    convenienceFee: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    cancellationDetails: {
        cancelledAt: Date,
        reason: String,
        refundAmount: Number,
        refundStatus: { type: String, default: 'pending' }
    },
    bookingReference: { type: String, unique: true },
    bookingDate: { type: Date, default: Date.now },
}, {
    timestamps: true
});

bookingSchema.pre('save', async function () {
    if (!this.bookingReference) {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.bookingReference = `BMS${year}${month}${day}${random}`;
    }
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;