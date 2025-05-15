const jwt = require('jsonwebtoken');
const { Users } = require('./models');
const {
  handleSendMessage,
  handleMessageStatusUpdate,
  handleTypingIndicator
} = require('./controllers/Messages.controller');

// Store online users and their socket IDs
const onlineUsers = new Map();

/**
 * Set up Socket.io on the HTTP server
 * @param {Object} io - Socket.io instance
 */
const setupSocketIO = (io) => {
  // Middleware to authenticate socket connections using JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }
      
      // Verify token
      jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
          return next(new Error('Authentication error: Invalid token'));
        }
        
        // Store user data in socket for later use
        socket.user = decoded;
        
        // Find user in database to confirm they exist
        const user = await Users.findByPk(decoded.userId);
        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }
        
        next();
      });
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Internal server error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.userId}`);
    
    // Add user to online users map
    onlineUsers.set(socket.user.userId, socket.id);
    
    // Join a room specific to this user for private messages
    socket.join(`user_${socket.user.userId}`);
    
    // Notify friends that this user is online
    io.emit('userStatus', {
      userId: socket.user.userId,
      status: 'online'
    });

    // Handle message sending
    socket.on('sendMessage', async (data) => {
      try {
        await handleSendMessage(io, socket, data, socket.user);
      } catch (error) {
        console.error('Error in sendMessage event:', error.message);
        socket.emit('error', { message: 'Error sending message' });
      }
    });

    // Handle message status updates (delivered, seen)
    socket.on('updateMessageStatus', async (data) => {
      try {
        await handleMessageStatusUpdate(io, socket, data, socket.user);
      } catch (error) {
        console.error('Error in updateMessageStatus event:', error.message);
        socket.emit('error', { message: 'Error updating message status' });
      }
    });

    // Handle typing indicators
    socket.on('typing', async (data) => {
      try {
        await handleTypingIndicator(io, socket, { ...data, isTyping: true }, socket.user);
      } catch (error) {
        console.error('Error in typing event:', error.message);
        socket.emit('error', { message: 'Error with typing indicator' });
      }
    });

    socket.on('stopTyping', async (data) => {
      try {
        await handleTypingIndicator(io, socket, { ...data, isTyping: false }, socket.user);
      } catch (error) {
        console.error('Error in stopTyping event:', error.message);
        socket.emit('error', { message: 'Error with typing indicator' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.userId}`);
      
      // Remove user from online users map
      onlineUsers.delete(socket.user.userId);
      
      // Notify friends that this user is offline
      io.emit('userStatus', {
        userId: socket.user.userId,
        status: 'offline'
      });
    });
  });
};

module.exports = {
  setupSocketIO,
  onlineUsers
};
