const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173", // Allow your React app's origin
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Store connected users: { socketId: { username, isTyping } }
const connectedUsers = new Map();

// Helper to get online usernames
const getOnlineUsernames = () => {
  return Array.from(connectedUsers.values()).map(user => user.username);
};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send the list of currently online users to the newly connected client
  socket.emit('online users', getOnlineUsernames());

  socket.on('authenticate', (username) => {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      socket.emit('auth error', 'Invalid username.');
      return;
    }
    const trimmedUsername = username.trim();

    // Check if username is already taken by an active user
    const usernameTaken = Array.from(connectedUsers.values()).some(user => user.username === trimmedUsername);
    if (usernameTaken) {
      socket.emit('auth error', 'Username already taken. Please choose another.');
      return;
    }

    connectedUsers.set(socket.id, { username: trimmedUsername, isTyping: false });
    console.log(`${trimmedUsername} (${socket.id}) has joined.`);

    socket.emit('authenticated', trimmedUsername); // Confirm authentication to the client

    // Notify all other clients that a new user has joined
    socket.broadcast.emit('user online', trimmedUsername);
    io.emit('online users', getOnlineUsernames()); // Update online list for everyone
    io.emit('chat message', {
      sender: 'Server',
      message: `${trimmedUsername} has joined the chat.`,
      timestamp: Date.now(),
      type: 'notification'
    });
  });

  socket.on('chat message', (msg) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const messageData = {
        sender: user.username,
        message: msg,
        timestamp: Date.now(),
        type: 'message'
      };
      console.log(`Message from ${user.username}: ${msg}`);
      io.emit('chat message', messageData); // Broadcast message to all connected clients
    }
  });

  socket.on('typing', () => {
    const user = connectedUsers.get(socket.id);
    if (user && !user.isTyping) {
      user.isTyping = true;
      socket.broadcast.emit('typing', user.username);
    }
  });

  socket.on('stop typing', () => {
    const user = connectedUsers.get(socket.id);
    if (user && user.isTyping) {
      user.isTyping = false;
      socket.broadcast.emit('stop typing', user.username);
    }
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      connectedUsers.delete(socket.id);
      console.log(`${user.username} (${socket.id}) disconnected.`);

      // Notify all other clients that a user has left
      socket.broadcast.emit('user offline', user.username);
      io.emit('online users', getOnlineUsernames()); // Update online list for everyone
      io.emit('chat message', {
        sender: 'Server',
        message: `${user.username} has left the chat.`,
        timestamp: Date.now(),
        type: 'notification'
      });
    } else {
      console.log(`User disconnected: ${socket.id} (unauthenticated)`);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});