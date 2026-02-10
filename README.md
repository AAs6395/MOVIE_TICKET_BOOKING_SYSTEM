🎬 Movie Ticket Booking System
A full-stack Movie Ticket Booking System that allows users to browse movies, select theaters, choose seats, and book tickets through a secure and user-friendly web interface.

📌 Features
🔐 User Authentication

Secure signup and login using JWT-based authentication

Persistent user sessions using local storage

🎥 Movie Browsing

View available movies with details

Select movies and proceed to booking

🏟️ Theater & Seat Selection

Choose theaters and show timings

Real-time seat availability validation

Prevents duplicate seat bookings

🎟️ Ticket Booking

Book and confirm tickets securely

Store booking details in the database

View booking confirmation

⚡ Responsive UI

Built with React and modern CSS

Smooth navigation using React Router

🛠️ Tech Stack
Frontend
React (Vite)

JavaScript (ES6+)

HTML5, CSS3

React Router

Backend
Node.js

Express.js

RESTful APIs

JWT Authentication

Database
MongoDB

Mongoose ODM

 Project Structure
book/
├── backend/
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── server.js
│   └── package.json
│
├── src/
│   ├── components/
│   ├── services/
│   ├── App.jsx
│   ├── main.jsx
│   ├── Index.jsx
│   ├── UserContext.jsx
│   └── style.css
│
├── index.html
├── package.json
└── README.md

🚀 How to Run the Project Locally
1️⃣ Prerequisites
Make sure you have:

Node.js (v18+ recommended)

MongoDB (local or MongoDB Atlas)

npm

2️⃣ Clone the Repository
git clone <repository-url>
cd book

3️⃣ Backend Setup
cd backend
npm install
node server.js

Backend will run on:
http://localhost:5000

4️⃣ Frontend Setup
Open a new terminal:
cd book
npm install
npm run dev

Frontend will run on:
http://localhost:5173

🔐 Environment Variables (Optional)
Create a .env file inside backend/:
PORT=5000
MONGO_URI=mongodb://localhost:27017/movieticket
JWT_SECRET=your_secret_key

🧪 Testing
Test user authentication (signup/login)

Book tickets and confirm seat availability

Verify backend API responses using Postman

Check frontend-backend communication via browser DevTools

🎓 Learning Outcomes
Full-stack web development using React and Node.js

REST API design and integration

Authentication and authorization using JWT

Database modeling with MongoDB

Handling real-time booking logic and state management

📌 Future Enhancements
Online payment gateway integration

Admin dashboard for movie and theater management

Email/SMS booking confirmations

Recommendation system for movies

Deployment on cloud platforms

👨‍💻 Author
Aashish Joshi
B.Tech CSE
Full-Stack Web Development Project














🛠️ Tech Stack
Frontend
