import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { moviesAPI, bookingsAPI, seatAPI } from '../services/api';
import './Theater.css';
import { FaStar } from 'react-icons/fa';
import { useUser } from '../UserContext';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', { autoConnect: false });

const showTimes = [
  { label: "Morning",    value: "morning",    display: "09:00 AM" },
  { label: "Afternoon",  value: "afternoon",  display: "01:00 PM" },
  { label: "Evening",    value: "evening",    display: "06:00 PM" },
  { label: "Late Night", value: "late_night", display: "10:00 PM" },
];

const getShowKey = (city, movieId, showTime, date) =>
  `${city}_${movieId}_${showTime}_${date}`;

const Theater = () => {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const [movie, setMovie] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Preparing theater experience...');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [city] = useState(localStorage.getItem('selectedCity') || 'Delhi');
  const [selectedShowTime, setSelectedShowTime] = useState(showTimes[0].value);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [socketConnected, setSocketConnected] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [statusChangedSeats, setStatusChangedSeats] = useState([]);

  const fetchSeatData = useCallback(async () => {
    if (!movieId) return;
    try {
      const seatResponse = await seatAPI.getStatus({
        movie: movieId,
        city,
        showtime: selectedShowTime,
        date: selectedDate.toISOString().split('T')[0],
      });
      if (seatResponse.success) {
        setSeats(seatResponse.seats || []);
        const showKey = getShowKey(city, movieId, selectedShowTime, selectedDate.toISOString().split('T')[0]);
        socket.emit('joinShow', showKey);
      }
    } catch {
      // silently ignore
    }
  }, [movieId, city, selectedShowTime, selectedDate]);

  useEffect(() => {
    const initializeTheater = async () => {
      try {
        if (!movieId) throw new Error('Movie ID is missing');
        setLoadingMessage('Loading movie details...');

        const movieResponse = await moviesAPI.getOne(movieId);
        if (!movieResponse.success) throw new Error(movieResponse.message || 'Failed to load movie');
        setMovie(movieResponse.data);

        setLoadingMessage('Connecting to seat service...');

        if (!socket.connected) socket.connect();

        const timeout = setTimeout(() => {
          setSocketConnected(false);
          setContentReady(true);
          setLoading(false);
          fetchSeatData();
        }, 4000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          setSocketConnected(true);
          setContentReady(true);
          setLoading(false);
          fetchSeatData();
        });

        socket.on('connect_error', () => {
          clearTimeout(timeout);
          setSocketConnected(false);
          setContentReady(true);
          setLoading(false);
          fetchSeatData();
        });
      } catch (err) {
        setError(err.message || 'Failed to load theater');
        setLoading(false);
      }
    };

    initializeTheater();

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      if (socket.connected) socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId]);

  useEffect(() => {
    if (!contentReady) return;
    setSelectedSeats([]);
    setSeats([]);
    fetchSeatData();
  }, [selectedShowTime, selectedDate, contentReady, fetchSeatData]);

  useEffect(() => {
    const handleSeatStatusUpdate = (data) => {
      if (data.reload) {
        seatAPI.invalidateCache();
        fetchSeatData();
      } else if (Array.isArray(data.seats)) {
        setSeats(data.seats);
      }
    };
    socket.on('seatStatusUpdate', handleSeatStatusUpdate);
    return () => socket.off('seatStatusUpdate', handleSeatStatusUpdate);
  }, [fetchSeatData]);

  useEffect(() => {
    if (!contentReady) return;
    const handleBeforeUnload = () => {
      if (selectedSeats.length > 0 && user?.username) {
        const releaseRequests = selectedSeats.map((seatNumber) => ({
          movie: movieId,
          city,
          showtime: selectedShowTime,
          date: selectedDate.toISOString().split('T')[0],
          seatNumber,
          user: user.username,
        }));
        if (navigator.sendBeacon) {
          const data = new Blob([JSON.stringify({ seats: releaseRequests })], {
            type: 'application/json',
          });
          navigator.sendBeacon('/api/seats/release-batch', data);
        }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedSeats, movieId, city, selectedShowTime, selectedDate, user, contentReady]);

  const markSeatStatusChanged = (seatNumber) => {
    setStatusChangedSeats((prev) => [...prev, seatNumber]);
    setTimeout(() => {
      setStatusChangedSeats((prev) => prev.filter((s) => s !== seatNumber));
    }, 500);
  };

  const handleSeatClick = async (seatNumber) => {
    const serverSeat = seats.find((s) => s.seatNumber === seatNumber);
    if (serverSeat?.status === 'booked') return;
    if (serverSeat?.status === 'held' && serverSeat?.heldBy !== user?.username) return;

    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats((prev) => prev.filter((s) => s !== seatNumber));
      markSeatStatusChanged(seatNumber);
      await seatAPI.release({
        movie: movieId,
        city,
        showtime: selectedShowTime,
        date: selectedDate.toISOString().split('T')[0],
        seatNumber,
        user: user?.username,
      });
    } else {
      setSelectedSeats((prev) => [...prev, seatNumber]);
      markSeatStatusChanged(seatNumber);
      const result = await seatAPI.hold({
        movie: movieId,
        city,
        showtime: selectedShowTime,
        date: selectedDate.toISOString().split('T')[0],
        seatNumber,
        user: user?.username,
      });
      if (!result.success) {
        setSelectedSeats((prev) => prev.filter((s) => s !== seatNumber));
        setError(result.message || 'Seat is no longer available');
      }
    }
  };

  const handlePayment = async () => {
    if (!paymentMethod) { setError('Please select a payment method'); return; }
    if (selectedSeats.length === 0) { setError('Please select at least one seat'); return; }

    setIsProcessing(true);
    setError('');

    try {
      const showtimeDisplay = showTimes.find((st) => st.value === selectedShowTime)?.display || '';
      const basePrice = selectedSeats.length * (movie?.price || 0);
      const convenienceFee = parseFloat((basePrice * 0.05).toFixed(2));
      const taxes = parseFloat((basePrice * 0.18).toFixed(2));
      const totalAmount = parseFloat((basePrice + convenienceFee + taxes).toFixed(2));

      // Get user details - fallback to localStorage if context missing fields
      const storedUser = JSON.parse(localStorage.getItem('userData') || '{}');
      const username = user?.username || storedUser?.username || 'Guest';
      const email = user?.email || storedUser?.email || 'guest@bookmyshow.com';

      const bookingData = {
        movie: movie?.title,
        user: username,
        email: email,
        theaterId: `${city}_theater`,
        theaterName: `${city} Theater`,
        city,
        showtime: selectedShowTime,
        showDate: selectedDate.toISOString(),
        seatsBooked: selectedSeats.map(String),
        numberOfSeats: selectedSeats.length,
        totalAmount,
        paymentDetails: {
          method: paymentMethod,
          status: 'completed',
          amount: totalAmount,
          currency: 'INR'
        },
        convenienceFee,
        taxes,
      };

      console.log('Creating booking with data:', bookingData);

      const res = await bookingsAPI.create(bookingData);
      console.log('Booking response:', res);

      if (!res.success) {
        throw new Error(res.message || 'Failed to create booking');
      }

      const bookingId = res.data._id;

      // Mark seats as booked in ShowSeat collection
      const seatResults = await Promise.all(
        selectedSeats.map((seatNumber) =>
          seatAPI.book({
            movie: movieId,
            city,
            showtime: selectedShowTime,
            date: selectedDate.toISOString().split('T')[0],
            seatNumber,
            user: username,
            bookingId,
          })
        )
      );

      console.log('Seat booking results:', seatResults);

      const failed = seatResults.filter((r) => !r.success);
      if (failed.length > 0) {
        setError(`Some seats failed to book: ${failed.map((f) => f.message).join(', ')}`);
        setIsProcessing(false);
        return;
      }

      navigate('/confirmation', {
        state: {
          bookingId,
          ...bookingData,
          showtime: showtimeDisplay
        },
      });
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Booking failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    if (setUser) setUser(null);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="theater-container">
        <div className="loading-screen">
          <div className="loading">
            <h2>Loading Theater</h2>
            <p>{loadingMessage}</p>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !movie) {
    return (
      <div className="theater-container">
        <div className="loading-screen">
          <div className="loading">
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="theater-container">
      <div className="user-info">
        <span className="user-label"><b>User:</b></span>{' '}
        <span className="user-value">{user?.username || user?.email || 'Guest'}</span>
        <br />
        <span className="user-label"><b>Email:</b></span>{' '}
        <span className="user-value">{user?.email || '-'}</span>
        <br />
        <span className="user-label"><b>City:</b></span>{' '}
        <span className="user-value">{city}</span>
        <button onClick={handleLogout} className="logout-button">Log out</button>
      </div>

      {movie && (
        <div className="movie-details">
          <div className="movie-poster">
            <img src={movie.posterUrl} alt={movie.title} />
          </div>
          <div className="movie-info">
            <h2>{movie.title}</h2>
            <div className="movie-meta">
              <span className="rating"><FaStar /> {movie.rating}/5</span>
              <span>{movie.duration} min</span>
              <span>{movie.language}</span>
            </div>
            <p className="description">{movie.description}</p>
            <div className="genre-tags">
              {movie.genre.split(',').map((g, i) => (
                <span key={i} className="genre-tag">{g.trim()}</span>
              ))}
            </div>
            <p style={{ marginTop: '10px', fontWeight: 'bold', color: '#e50914' }}>
              ₹{movie.price} per seat
            </p>
          </div>
        </div>
      )}

      <div className="screen">SCREEN</div>

      <div className="seats-container">
        {error && <div className="error-message">{error}</div>}

        {!socketConnected && (
          <div className="error-message" style={{ background: '#fff3cd', color: '#856404', border: '1px solid #ffc107' }}>
            Note: Real-time updates unavailable. Seats may not reflect live status.
          </div>
        )}

        <div className="showtime-selector">
          <div className="date-selector">
            <label><b>Available Dates: </b></label>
            <div className="date-selector-row">
              {Array.from({ length: 7 }).map((_, idx) => {
                const date = new Date();
                date.setDate(date.getDate() + idx);
                const isSelected = selectedDate.toDateString() === date.toDateString();
                return (
                  <div key={idx} className="date-button-container">
                    <button
                      className={isSelected ? 'date-button selected' : 'date-button'}
                      onClick={() => setSelectedDate(new Date(date))}
                    >
                      <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="showtime-selector">
          <label>Show Time: </label>
          <select value={selectedShowTime} onChange={(e) => setSelectedShowTime(e.target.value)}>
            {showTimes.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label} : {st.display}
              </option>
            ))}
          </select>
        </div>

        <div className="seats-grid">
          {Array.from({ length: movie?.totalSeats || 40 }, (_, i) => {
            const seatNumber = i + 1;
            const serverSeat = seats.find((s) => s.seatNumber === seatNumber);
            const isSelected = selectedSeats.includes(seatNumber);
            const isBooked = serverSeat?.status === 'booked';
            const isHeld = serverSeat?.status === 'held' && serverSeat?.heldBy !== user?.username;
            const isChanged = statusChangedSeats.includes(seatNumber);

            let cls = 'seat';
            if (isSelected) cls += ' selected';
            else if (isBooked) cls += ' booked';
            else if (isHeld) cls += ' held';
            if (isChanged) cls += ' seat-status-changed';

            return (
              <div
                key={seatNumber}
                className={cls}
                onClick={() => !isBooked && !isHeld && handleSeatClick(seatNumber)}
                title={`Seat ${seatNumber}`}
              >
                {seatNumber}
              </div>
            );
          })}
        </div>

        <div className="seat-legend">
          <div className="legend-item">
            <div className="seat-sample available"></div>
            <span>Available</span>
          </div>
          <div className="legend-item">
            <div className="seat-sample" style={{ background: '#6feaf6', width: 20, height: 20, borderRadius: 3 }}></div>
            <span>Selected</span>
          </div>
          <div className="legend-item">
            <div className="seat-sample" style={{ background: '#ff0000', width: 20, height: 20, borderRadius: 3 }}></div>
            <span>Booked</span>
          </div>
          <div className="legend-item">
            <div className="seat-sample" style={{ background: '#FFA500', width: 20, height: 20, borderRadius: 3 }}></div>
            <span>Held</span>
          </div>
        </div>

        <div className="booking-summary">
          <h3>Booking Summary</h3>
          <p>Selected Seats: {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'None'}</p>
          <p>Price per seat: ₹{movie?.price || 0}</p>
          <p>Subtotal: ₹{selectedSeats.length * (movie?.price || 0)}</p>
          <p>Convenience Fee (5%): ₹{(selectedSeats.length * (movie?.price || 0) * 0.05).toFixed(2)}</p>
          <p>Taxes (18%): ₹{(selectedSeats.length * (movie?.price || 0) * 0.18).toFixed(2)}</p>
          <p><b>Total: ₹{(selectedSeats.length * (movie?.price || 0) * 1.23).toFixed(2)}</b></p>

          {!showPayment ? (
            <button
              onClick={() => setShowPayment(true)}
              disabled={isProcessing || selectedSeats.length === 0}
              className="proceed-button"
            >
              Proceed to Payment
            </button>
          ) : (
            <div className="payment-section">
              <h4>Select Payment Method</h4>
              <div className="payment-methods">
                {['card', 'upi', 'netbanking'].map((method) => (
                  <label key={method}>
                    <input
                      type="radio"
                      name="payment"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    {method === 'card' ? 'Credit / Debit Card' : method === 'upi' ? 'UPI' : 'Net Banking'}
                  </label>
                ))}
              </div>
              <button
                onClick={handlePayment}
                disabled={isProcessing || !paymentMethod}
                className="payment-button"
              >
                {isProcessing ? 'Processing...' : 'Pay Now'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Theater;