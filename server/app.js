require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { sequelize } = require('./models');
const { setupSocketIO } = require('./socket');

// Import routes
const usersRoutes = require('./routes/Users.routes');
const friendRequestsRoutes = require('./routes/FriendRequests.routes');
const friendsRoutes = require('./routes/Friends.routes');
const messagesRoutes = require('./routes/Messages.routes');
const blocksRoutes = require('./routes/Blocks.routes');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Set up Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/users', usersRoutes);
app.use('/api/friend-requests', friendRequestsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/blocks', blocksRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to PingCode API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Set up Socket.io event handlers
setupSocketIO(io);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Database sync is handled in models/index.js
});

module.exports = { app, server, io };
