
Pulsevid is a full-stack web application built using a React (Vite) frontend and a Node.js + Express + Socket.IO backend with MongoDB Atlas as the database.
It supports user authentication, video uploads, and real-time communication.

Live Website:
https://pulse-assignment-livid.vercel.app/

Tech Stack
Frontend

React (Vite)

Axios

Basic CSS

Backend

Node.js + Express

Socket.IO

Mongoose (MongoDB)

Multer

JWT Authentication

Database

MongoDB Atlas

Project Structure

/backend
 ├── index.js — Express + Socket.IO server
 ├── routes/
 │ ├── auth.js — login and registration routes
 │ └── videos.js — video upload and socket logic
 ├── models/
 │ └── User.js — Mongoose user schema

/frontend
 ├── src/
 │ ├── components/
 │ ├── pages/
 │ └── utils/
 ├── vite.config.js
 └── package.json

Backend Setup

Navigate to backend:

cd backend
npm install

Create a .env file:

MONGO_URI=<your MongoDB Atlas URL>
JWT_SECRET=<your secret key>
PORT=4000

Start the backend:

npm start

Expected output:

Mongo connected
Server listening on 4000

Frontend Setup

Navigate to frontend:

cd frontend
npm install

Create .env:

VITE_API_URL=http://localhost:4000

Start development server:

npm run dev

Frontend runs at:
http://localhost:5173

Features

User registration and login

JWT-based authentication

Video upload and listing

Real-time communication using Socket.IO

Decoupled backend and frontend

MongoDB persistent storage

Important Notes
MongoDB Atlas Access

Your Atlas cluster must allow:

0.0.0.0/0

(Atlas → Network Access → Add IP → Allow Access From Anywhere)

Environment Variables

Backend (Render):
MONGO_URI=
JWT_SECRET=

Frontend (Vercel):
VITE_API_URL=<your backend URL>

CORS

Backend must allow:

http://localhost:5173

https://pulse-assignment-livid.vercel.app

Socket.IO

Socket.IO must enable both websocket and polling transports to work on Render/Vercel.

Uploads Folder

The folder /backend/uploads must exist for video uploads.

Deployment

Frontend (Vercel):
https://pulse-assignment-livid.vercel.app/

Backend (Render):
https://pulse-assignment-bmpx.onrender.com/
