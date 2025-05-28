import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { routes } from './routes/index.js';
import { dbOps } from './db/index.js';
import { initializeDbModules } from './db/init.js';
import { setSocketIO } from './routes/sessions.js'; 
const expertSockets = new Map();

dotenv.config();

// Initialize database modules
initializeDbModules();


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["https://www.soulvents.com","https://soulvents.com","http://localhost:5173","wss://api.soulvents.com","https://localhost:5173","https://api.soulvents.com"], // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE","HEAD"],
    credentials: true // Ensure cookies and authentication headers are allowed
  }
});

app.use(cors({
  origin: ["https://www.soulvents.com","https://soulvents.com","http://localhost:5173","wss://api.soulvents.com","https://localhost:5173","https://api.soulvents.com"],
  methods: ['GET', 'POST', 'PUT', 'DELETE','HEAD'],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true // Ensure cookies and authentication headers are allowed
}));

app.use(express.json());
setSocketIO(io);
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_chat', (data) => {
    socket.join(data.roomId);
    console.log(`User ${socket.id} joined room ${data.roomId}`);
  });
  socket.on('register_expert', ({ expertId }) => {
    expertSockets.set(expertId, socket.id);
    console.log(`✅ Expert registered: ${expertId} (Socket ID: ${socket.id})`);
  });
  // Handle disconnection
socket.on('disconnect', () => {
  console.log(`🔴 Client disconnected: ${socket.id}`);
  
  // Remove the expert from the map when they disconnect
  expertSockets.forEach((value, key) => {
    if (value === socket.id) {
      expertSockets.delete(key);
      console.log(`🗑️ Removed expert: ${key}`);
    }
  });
});  

  socket.on('leave_chat', (data) => {
    socket.leave(data.roomId);
    console.log(`User ${socket.id} left room ${data.roomId}`);
  });

  socket.on('send_message', (data) => {
    // Broadcast the message to all clients in the room
    io.to(data.roomId).emit('receive_message', data);
    console.log(`Message sent to room ${data.roomId}:`, data);
  });

  socket.on('call_user', (data) => {
    io.to(data.userToCall).emit('call_user', {
      signal: data.signalData,
      from: data.from,
      name: data.name
    });
    console.log(`Call initiated from ${data.from} to ${data.userToCall}`);
  });

  socket.on('answer_call', (data) => {
    io.to(data.to).emit('call_accepted', data.signal);
    console.log(`Call answered by ${socket.id} to ${data.to}`);
  });

  socket.on('end_call', (data) => {
    io.to(data.to).emit('call_ended', { from: socket.id });
    console.log(`Call ended by ${socket.id} to ${data.to}`);
  });

  socket.on('session_update', (data) => {
    // Broadcast session update to all clients in the room
    const roomId = `session_${data.sessionId}`;
    io.to(roomId).emit('session_update', data);
    console.log(`Session update broadcast to room ${roomId}:`, data);
  });

  socket.on('session_ended', (data) => {
    // Broadcast session end to all clients in the room
    const roomId = `session_${data.sessionId}`;
    io.to(roomId).emit('session_ended', data);
    console.log(`Session end broadcast to room ${roomId}:`, data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// API routes
app.use('/', routes);

const port = parseInt(process.env.PORT || '5000');

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
}
)

// Periodic tasks
setInterval(async () => {
  try {
    // Update inactive experts (already implemented in db.js)
    await dbOps.updateInactiveExperts();

    // End any ongoing sessions that have been inactive for too long
    // This would be implemented if needed
  } catch (error) {
    console.error('Error in periodic tasks:', error);
  }
}, 60000); // Run every minute