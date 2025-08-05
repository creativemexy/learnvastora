const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Track room participants with enhanced user data
const rooms = new Map();
// Track socket to user mapping
const socketUsers = new Map();

function getRoomParticipants(roomId) {
  const participants = rooms.get(roomId) || new Map();
  return Array.from(participants.values()).map(userData => ({
    id: userData.socketId,
    name: userData.name,
    avatar: userData.avatar,
    role: userData.role,
    joinedAt: userData.joinedAt,
    isOnline: true
  }));
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-room", (roomId, userData) => {
    console.log(`Socket ${socket.id} joining room: ${roomId} with user data:`, userData);
    
    // Store user data for this socket
    socketUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      joinedAt: Date.now()
    });
    
    // Leave any previous rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
        const roomParticipants = rooms.get(room) || new Map();
        roomParticipants.delete(socket.id);
        if (roomParticipants.size === 0) {
          rooms.delete(room);
        } else {
          rooms.set(room, roomParticipants);
          // Notify remaining participants
          socket.to(room).emit("peer-left", { socketId: socket.id });
        }
      }
    });
    
    // Join the new room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    const participants = rooms.get(roomId);
    
    // If room is full and user is not already in it, deny join
    if (participants.size >= 4 && !participants.has(socket.id)) {
      socket.emit("room-full", roomId);
      console.log(`Room ${roomId} is full. Denying join for ${socket.id}`);
      return;
    }
    
    socket.join(roomId);
    participants.set(socket.id, socketUsers.get(socket.id));
    
    // Notify the joining client
    socket.emit("room-joined", roomId);
    
    // Notify other participants in the room (only if there are others)
    if (participants.size > 1) {
      socket.to(roomId).emit("peer-joined", {
        socketId: socket.id,
        name: userData.name,
        avatar: userData.avatar,
        role: userData.role
      });
      console.log(`Notifying peers in room ${roomId} that ${userData.name} (${socket.id}) joined`);
    }
    
    console.log(`Room ${roomId} now has ${participants.size} participants`);
    // After join, emit updated participant list to all in room
    const participantsList = getRoomParticipants(roomId);
    io.to(roomId).emit("participants-update", participantsList);
  });

  socket.on("signal", ({ roomId, data }) => {
    console.log(`Signal from ${socket.id} in room ${roomId}`);
    socket.to(roomId).emit("signal", data);
  });

  socket.on("chat-message", ({ roomId, msg }) => {
    console.log(`Chat message in room ${roomId}`);
    socket.to(roomId).emit("chat-message", msg);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    
    // Get user data before removing
    const userData = socketUsers.get(socket.id);
    
    // Remove from all rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        const roomParticipants = rooms.get(room) || new Map();
        roomParticipants.delete(socket.id);
        if (roomParticipants.size === 0) {
          rooms.delete(room);
          console.log(`Room ${room} deleted - no more participants`);
        } else {
          rooms.set(room, roomParticipants);
          // Notify remaining participants
          socket.to(room).emit("peer-left", { 
            socketId: socket.id,
            name: userData?.name,
            role: userData?.role
          });
          console.log(`Room ${room} now has ${roomParticipants.size} participants after disconnect`);
        }
      }
    });
    
    // For each room, emit updated participant list
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        const participants = getRoomParticipants(room);
        io.to(room).emit("participants-update", participants);
      }
    });
    
    // Remove from socket users
    socketUsers.delete(socket.id);
  });

  socket.on("get-participants", (roomId) => {
    const participants = getRoomParticipants(roomId);
    socket.emit("participants-update", participants);
  });

  // Handle client errors
  socket.on("error", (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

const PORT = process.env.SIGNAL_PORT || 4000;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
}); 