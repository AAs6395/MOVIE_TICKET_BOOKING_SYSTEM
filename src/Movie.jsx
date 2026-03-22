import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./movie.css";
import { moviesAPI, bookingsAPI } from './services/api';
import Logo from "./photo2.jpg";
import profile from "./photo3.jpg";
import { useUser } from "./UserContext";

const Movie = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCity, setSelectedCity] = useState(
    localStorage.getItem('selectedCity') || 'All Cities'
  );
  const [bookingHistory, setBookingHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const username = user?.username;

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await moviesAPI.getAll();
        if (response.success && Array.isArray(response.data)) {
          setMovies(response.data);
        } else {
          setError(response.message || 'Failed to load movies.');
        }
      } catch {
        setError('Network error. Please check your connection.');
      }
      setLoading(false);
    };
    fetchMovies();
  }, []);

  useEffect(() => {
    const handleCityChange = () => {
      setSelectedCity(localStorage.getItem('selectedCity') || 'All Cities');
    };
    window.addEventListener('cityChanged', handleCityChange);
    return () => window.removeEventListener('cityChanged', handleCityChange);
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!username) {
        setBookingHistory([]);
        setHistoryLoading(false);
        return;
      }
      setHistoryLoading(true);
      setHistoryError('');
      try {
        const res = await bookingsAPI.getUserBookings(username);
        if (res.success) {
          setBookingHistory(res.data);
        } else {
          setHistoryError(res.message);
        }
      } catch {
        setHistoryError('Failed to fetch booking history.');
      }
      setHistoryLoading(false);
    };
    fetchHistory();
  }, [username]);

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await bookingsAPI.deleteBooking(bookingId);
      if (res.success) {
        setBookingHistory((prev) => prev.filter((b) => b._id !== bookingId));
        alert('Booking cancelled successfully!');
      } else {
        alert('Failed to cancel booking: ' + (res.message || 'Unknown error'));
      }
    } catch {
      alert('Error cancelling booking. Please try again.');
    }
  };

  const handleMovieClick = (movieId) => {
    navigate(`/theater/${movieId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    if (setUser) setUser(null);
    navigate('/');
  };

  const renderMovieCard = (movie) => {
    if (!movie || !movie._id) return null;
    const posterSrc =
      movie.posterUrl ||
      `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.title || 'No Image')}`;
    return (
      <div
        key={movie._id}
        className="movie-card"
        onClick={() => handleMovieClick(movie._id)}
      >
        <div className="movie-poster">
          <img
            src={posterSrc}
            alt={movie.title || 'Movie poster'}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://via.placeholder.com/300x450?text=${encodeURIComponent(
                movie.title || 'Error'
              )}`;
            }}
          />
        </div>
        <div className="movie-info">
          <h3>{movie.title || 'Untitled Movie'}</h3>
          {movie.genre && <p><b>Genre:</b> {movie.genre}</p>}
          {movie.duration && <p><b>Duration:</b> {movie.duration} min</p>}
          {movie.releaseDate && (
            <p><b>Release:</b> {new Date(movie.releaseDate).toLocaleDateString()}</p>
          )}
          {movie.price && <p className="price">₹{movie.price}</p>}
        </div>
      </div>
    );
  };

  const renderBookingHistory = () => {
    if (!username) return null;
    return (
      <div className="booking-history">
        <h2>Your Bookings</h2>
        {historyLoading ? (
          <div className="loading">Loading booking history...</div>
        ) : historyError ? (
          <div className="error-message">{historyError}</div>
        ) : bookingHistory.length === 0 ? (
          <p className="no-bookings">No bookings found</p>
        ) : (
          <ul className="booking-list">
            {bookingHistory.map((booking) => (
              <li key={booking._id} className="booking-item">
                <div><b>Movie:</b> {booking.movie?.title || booking.movie || '-'}</div>
                <div><b>City:</b> {booking.city}</div>
                <div><b>Showtime:</b> {booking.showtime}</div>
                <div><b>ShowDate:</b> {new Date(booking.showDate).toLocaleDateString()}</div>
                <div><b>Seats:</b> {booking.seatsBooked?.join(', ')}</div>
                <div><b>Total:</b> ₹{booking.totalAmount}</div>
                <button
                  onClick={() => handleCancelBooking(booking._id)}
                  className="cancel-btn"
                  disabled={historyLoading}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="body">
      <header>
        <div className="nav">
          <div className="Logo">
            <img src={Logo} alt="Logo" />
          </div>
          <div className="Profile">
            <div>
              Welcome{' '}
              {user && (user.username || user.name || user.email)
                ? user.username || user.name || user.email
                : 'Guest'}
              ,
            </div>
            <div className="Image">
              <img src={profile} alt="Profile" />
            </div>
            <button
              onClick={handleLogout}
              style={{
                marginLeft: '10px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: '#EB4E62',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="Booking_box">
          <div className="selected-city" style={{ textAlign: 'center', margin: '20px 0' }}>
            <h2>
              Movies{' '}
              {selectedCity !== 'All Cities' ? `in ${selectedCity}` : 'Available'}
            </h2>
          </div>
          {loading ? (
            <div className="loading">Loading movies...</div>
          ) : error ? (
            <div className="error-message">Error: {error}</div>
          ) : (
            <div className="movies-grid">
              {movies.length > 0 ? (
                movies.map(renderMovieCard)
              ) : (
                <div className="no-movies">
                  No movies available at the moment. Please check back later.
                </div>
              )}
            </div>
          )}
        </div>
        {renderBookingHistory()}
        <br />
      </main>
    </div>
  );
};

export default Movie;
