<<<<<<< HEAD
# 🎬 BookMyShow Clone

A full-stack movie ticket booking app built with React + Vite (frontend) and Express + MongoDB (backend), with real-time seat updates via Socket.IO.

---

## 📁 Project Structure

```
book_my_show/
├── backend/
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── models/          (User, Movie, Booking, ShowSeat)
│   ├── routes/          (auth.js, user.cjs, movie.cjs, booking.cjs, seat.cjs)
│   ├── server.js
│   └── .env
├── src/
│   ├── components/      (Theater.jsx, Confirmation.jsx + CSS)
│   ├── services/api.js
│   ├── App.jsx, Index.jsx, Signup.jsx, Book.jsx, Movie.jsx
│   ├── UserContext.jsx
│   └── *.css / *.jpg
├── index.html
├── vite.config.js
├── package.json
└── .env
```

---

## ✅ Prerequisites

Make sure you have these installed:

| Tool | Version |
|------|---------|
| Node.js | v18 or higher |
| npm | v9 or higher |
| MongoDB | v6+ (running locally) |

---

## 🚀 How to Run

### Step 1 — Install dependencies

```bash
npm install
```

### Step 2 — Start MongoDB

Make sure MongoDB is running on your machine:

**Windows:**
```bash
# If installed as a service, it may already be running.
# Otherwise open a terminal and run:
mongod
```

**Mac (with Homebrew):**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

### Step 3 — Run backend + frontend together

```bash
npm run dev:all
```

This runs both servers concurrently:
- **Backend** → http://localhost:5000
- **Frontend** → http://localhost:5173

### Or run them separately:

**Terminal 1 – Backend:**
```bash
npm run server
```

**Terminal 2 – Frontend:**
```bash
npm run client
```

---

## 🌐 Open the App

Go to: **http://localhost:5173**

---

## 🔐 First-time Setup — Add a Movie

The database starts empty. Use a tool like **Postman** or **Thunder Client** to add a movie:

```
POST http://localhost:5000/api/movies
Content-Type: application/json

{
  "title": "Avengers: Endgame",
  "description": "The Avengers assemble once more to reverse Thanos's actions.",
  "genre": "Action, Sci-Fi",
  "duration": 181,
  "language": "English",
  "price": 250,
  "posterUrl": "https://upload.wikimedia.org/wikipedia/en/0/0d/Avengers_Endgame_poster.jpg",
  "releaseDate": "2019-04-26",
  "totalSeats": 40,
  "availableSeats": 40,
  "rating": 4.8,
  "status": "now-showing"
}
```

---

## 🐛 Bugs Fixed

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `db.js` | `MONGODB_URI` undefined (typo) | Changed to `MONGO_URI` |
| 2 | `backend/server.js` | Missing `dotenv`, deprecated Mongoose options | Added `require('dotenv').config()`, removed deprecated options |
| 3 | `booking.cjs` | `mongoose.Types.ObjectId(bookingId)` deprecated (throws in Mongoose 7+) | Removed deprecated call, use `new mongoose.Types.ObjectId()` only when valid |
| 4 | `user.cjs` / `auth.js` routes | Different JWT secrets (`secretkey` vs `your-secret-key`) | Unified to single env variable `JWT_SECRET` |
| 5 | `api.js` (frontend) | `BASE_URL` hardcoded to `http://localhost:5000/api`, breaks CORS in some configs | Changed to `/api` — proxied via Vite config |
| 6 | `UserContext.jsx` | Called broken `/api/user/me` endpoint on every load | Removed broken fetch, load from localStorage only |
| 7 | `Theater.jsx` | `fetchSeatData` called before socket connected, missing `useCallback` dep | Wrapped in `useCallback`, decoupled from socket state |
| 8 | `Theater.jsx` | Held seats not shown as unclickable in UI | Added `isHeld` check — held seats by others are now blocked |
| 9 | `Book.jsx` | Navigate to `/Movie` (capital M) — React Router is case-sensitive | Changed to `/movie` |
| 10 | `package.json` | Missing `jsonwebtoken` in dependencies | Added `jsonwebtoken` |
| 11 | `eslint.config.js` | `no-unused-vars` as `error` breaking build | Downgraded to `warn` for smoother dev experience |
| 12 | All logout handlers | Only removed `user` key, left `token` + `userData` in localStorage | Now clears all three keys on logout |

---

## 📝 Tech Stack

- **Frontend:** React 19, React Router 7, Axios, Socket.IO Client, Vite
- **Backend:** Express 5, MongoDB, Mongoose, Socket.IO, JWT, bcryptjs
- **Database:** MongoDB (local)
=======
# MOVIE_TICKET_BOOKING_SYSTEM
>>>>>>> 413528fec8a466799bc2ec1bbf94e44e724c68db
