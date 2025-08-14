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

  // Raise hand event handlers
  socket.on("raise-hand", (userData) => {
    console.log(`Hand raised by ${userData.userName} in room ${userData.roomId}`);
    socket.to(userData.roomId).emit("hand-raised", {
      userId: userData.userId,
      userName: userData.userName
    });
  });

  socket.on("lower-hand", (userData) => {
    console.log(`Hand lowered by ${userData.userName} in room ${userData.roomId}`);
    socket.to(userData.roomId).emit("hand-lowered", {
      userId: userData.userId,
      userName: userData.userName
    });
  });

  socket.on("clear-all-hands", (data) => {
    console.log(`All hands cleared in room ${data.roomId}`);
    socket.to(data.roomId).emit("raised-hands-update", { raisedHands: [] });
  });

  // Breakout rooms event handlers
  socket.on("create-breakout-rooms", (userData) => {
    console.log(`Creating breakout rooms in ${userData.roomId} by ${userData.userName}`);
    
    const settings = userData.settings;
    const numberOfRooms = settings.numberOfRooms;
    const participantsPerRoom = settings.participantsPerRoom;
    const timeLimit = settings.timeLimit;
    
    // Create breakout rooms
    const rooms = [];
    for (let i = 1; i <= numberOfRooms; i++) {
      rooms.push({
        id: `breakout-${userData.roomId}-${i}`,
        name: `Breakout Room ${i}`,
        participants: [],
        isActive: false,
        createdAt: Date.now(),
        timeLimit: timeLimit
      });
    }
    
    // Store breakout rooms in the main room
    if (!global.breakoutRooms) global.breakoutRooms = new Map();
    global.breakoutRooms.set(userData.roomId, {
      rooms,
      settings,
      isActive: true
    });
    
    // Notify all participants in the room
    io.to(userData.roomId).emit("breakout-rooms-created", {
      rooms,
      isHost: userData.userId === (socketUsers.get(socket.id)?.id || userData.userId)
    });
  });

  socket.on("join-breakout-room", (userData) => {
    console.log(`User ${userData.userName} joining breakout room ${userData.breakoutRoomId}`);
    
    const breakoutData = global.breakoutRooms?.get(userData.roomId);
    if (!breakoutData) return;
    
    const room = breakoutData.rooms.find(r => r.id === userData.breakoutRoomId);
    if (!room) return;
    
    // Add participant to breakout room
    const participant = {
      id: userData.userId,
      name: userData.userName,
      role: socketUsers.get(socket.id)?.role || 'participant',
      socketId: socket.id
    };
    
    room.participants.push(participant);
    room.isActive = true;
    
    // Join the breakout room socket room
    socket.join(userData.breakoutRoomId);
    
    // Notify the user they joined
    socket.emit("breakout-room-joined", {
      roomId: userData.breakoutRoomId,
      timeLimit: room.timeLimit
    });
    
    // Notify all participants in the main room about the update
    io.to(userData.roomId).emit("breakout-room-participant-update", {
      roomId: userData.breakoutRoomId,
      participants: room.participants
    });
  });

  socket.on("leave-breakout-room", (userData) => {
    console.log(`User ${userData.userName} leaving breakout room ${userData.breakoutRoomId}`);
    
    const breakoutData = global.breakoutRooms?.get(userData.roomId);
    if (!breakoutData) return;
    
    const room = breakoutData.rooms.find(r => r.id === userData.breakoutRoomId);
    if (!room) return;
    
    // Remove participant from breakout room
    room.participants = room.participants.filter(p => p.id !== userData.userId);
    
    // Leave the breakout room socket room
    socket.leave(userData.breakoutRoomId);
    
    // Notify the user they left
    socket.emit("breakout-room-left", {
      roomId: userData.breakoutRoomId
    });
    
    // Notify all participants in the main room about the update
    io.to(userData.roomId).emit("breakout-room-participant-update", {
      roomId: userData.breakoutRoomId,
      participants: room.participants
    });
  });

  socket.on("close-breakout-rooms", (userData) => {
    console.log(`Closing breakout rooms in ${userData.roomId} by ${userData.userName}`);
    
    // Remove breakout rooms data
    if (global.breakoutRooms) {
      global.breakoutRooms.delete(userData.roomId);
    }
    
    // Notify all participants
    io.to(userData.roomId).emit("breakout-rooms-closed");
  });

  socket.on("move-participant-to-room", (userData) => {
    console.log(`Moving participant ${userData.participantId} to room ${userData.targetRoomId}`);
    
    const breakoutData = global.breakoutRooms?.get(userData.roomId);
    if (!breakoutData) return;
    
    // Find the participant in their current room
    let participant = null;
    let sourceRoom = null;
    
    for (const room of breakoutData.rooms) {
      const found = room.participants.find(p => p.id === userData.participantId);
      if (found) {
        participant = found;
        sourceRoom = room;
        break;
      }
    }
    
    if (!participant || !sourceRoom) return;
    
    // Remove from source room
    sourceRoom.participants = sourceRoom.participants.filter(p => p.id !== userData.participantId);
    
    // Add to target room
    if (userData.targetRoomId === 'main') {
      // Return to main room - no action needed for socket rooms
    } else {
      const targetRoom = breakoutData.rooms.find(r => r.id === userData.targetRoomId);
      if (targetRoom) {
        targetRoom.participants.push(participant);
      }
    }
    
    // Notify all participants about the updates
    io.to(userData.roomId).emit("breakout-room-participant-update", {
      roomId: sourceRoom.id,
      participants: sourceRoom.participants
    });
    
    if (userData.targetRoomId !== 'main') {
      const targetRoom = breakoutData.rooms.find(r => r.id === userData.targetRoomId);
      if (targetRoom) {
        io.to(userData.roomId).emit("breakout-room-participant-update", {
          roomId: targetRoom.id,
          participants: targetRoom.participants
        });
      }
    }
  });

  // Whiteboard event handlers
  socket.on("join-whiteboard", (userData) => {
    console.log(`User ${userData.userName} joining whiteboard in room ${userData.roomId}`);
    
    // Join the whiteboard room
    socket.join(`whiteboard-${userData.roomId}`);
    
    // Initialize whiteboard data if not exists
    if (!global.whiteboards) global.whiteboards = new Map();
    if (!global.whiteboards.has(userData.roomId)) {
      global.whiteboards.set(userData.roomId, {
        collaborators: [],
        permissions: 'all',
        history: []
      });
    }
    
    const whiteboardData = global.whiteboards.get(userData.roomId);
    
    // Add collaborator
    const collaborator = {
      id: userData.userId,
      name: userData.userName,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    
    const existingIndex = whiteboardData.collaborators.findIndex(c => c.id === userData.userId);
    if (existingIndex === -1) {
      whiteboardData.collaborators.push(collaborator);
    }
    
    // Notify the user they joined
    socket.emit("whiteboard-joined", {
      collaborators: whiteboardData.collaborators,
      isHost: userData.userId === (socketUsers.get(socket.id)?.id || userData.userId),
      permissions: whiteboardData.permissions
    });
    
    // Notify all collaborators about the update
    io.to(`whiteboard-${userData.roomId}`).emit("whiteboard-collaborator-update", {
      collaborators: whiteboardData.collaborators
    });
  });

  socket.on("leave-whiteboard", (userData) => {
    console.log(`User ${userData.userName} leaving whiteboard in room ${userData.roomId}`);
    
    // Leave the whiteboard room
    socket.leave(`whiteboard-${userData.roomId}`);
    
    // Remove collaborator
    if (global.whiteboards && global.whiteboards.has(userData.roomId)) {
      const whiteboardData = global.whiteboards.get(userData.roomId);
      whiteboardData.collaborators = whiteboardData.collaborators.filter(c => c.id !== userData.userId);
      
      // Notify remaining collaborators
      io.to(`whiteboard-${userData.roomId}`).emit("whiteboard-collaborator-update", {
        collaborators: whiteboardData.collaborators
      });
    }
  });

  socket.on("whiteboard-draw", (data) => {
    console.log(`Whiteboard draw in room ${data.roomId}`);
    socket.to(`whiteboard-${data.roomId}`).emit("whiteboard-draw", data);
  });

  socket.on("whiteboard-clear", (data) => {
    console.log(`Whiteboard clear in room ${data.roomId}`);
    socket.to(`whiteboard-${data.roomId}`).emit("whiteboard-clear", data);
  });

  socket.on("whiteboard-text", (data) => {
    console.log(`Whiteboard text in room ${data.roomId}`);
    socket.to(`whiteboard-${data.roomId}`).emit("whiteboard-text", data);
  });

  socket.on("whiteboard-shape", (data) => {
    console.log(`Whiteboard shape in room ${data.roomId}`);
    socket.to(`whiteboard-${data.roomId}`).emit("whiteboard-shape", data);
  });

  socket.on("whiteboard-undo", (data) => {
    console.log(`Whiteboard undo in room ${data.roomId}`);
    socket.to(`whiteboard-${data.roomId}`).emit("whiteboard-undo", data);
  });

  socket.on("whiteboard-redo", (data) => {
    console.log(`Whiteboard redo in room ${data.roomId}`);
    socket.to(`whiteboard-${data.roomId}`).emit("whiteboard-redo", data);
  });

  socket.on("update-whiteboard-permissions", (userData) => {
    console.log(`Updating whiteboard permissions in room ${userData.roomId}`);
    
    if (global.whiteboards && global.whiteboards.has(userData.roomId)) {
      const whiteboardData = global.whiteboards.get(userData.roomId);
      whiteboardData.permissions = userData.permissions;
      
      // Notify all collaborators about permission change
      io.to(`whiteboard-${userData.roomId}`).emit("whiteboard-permissions-update", {
        permissions: userData.permissions
      });
    }
  });

  // Polls/Quizzes event handlers
  socket.on("create-poll", (userData) => {
    console.log(`Creating poll in room ${userData.roomId} by ${userData.userName}`);
    
    // Initialize polls data if not exists
    if (!global.polls) global.polls = new Map();
    if (!global.polls.has(userData.roomId)) {
      global.polls.set(userData.roomId, []);
    }
    
    const pollsData = global.polls.get(userData.roomId);
    pollsData.push(userData.poll);
    
    // Notify all participants about the new poll
    io.to(userData.roomId).emit("poll-created", {
      poll: userData.poll
    });
  });

  socket.on("activate-poll", (userData) => {
    console.log(`Activating poll ${userData.pollId} in room ${userData.roomId}`);
    
    const pollsData = global.polls?.get(userData.roomId);
    if (!pollsData) return;
    
    const poll = pollsData.find(p => p.id === userData.pollId);
    if (!poll) return;
    
    poll.isActive = true;
    
    // Notify all participants
    io.to(userData.roomId).emit("poll-activated", {
      pollId: userData.pollId,
      timeLimit: poll.timeLimit
    });
    
    // Start timer if time limit is set
    if (poll.timeLimit && poll.timeLimit > 0) {
      let timeRemaining = poll.timeLimit;
      const timer = setInterval(() => {
        timeRemaining--;
        io.to(userData.roomId).emit("poll-timer-update", {
          pollId: userData.pollId,
          timeRemaining
        });
        
        if (timeRemaining <= 0) {
          clearInterval(timer);
          // Auto-deactivate poll when time runs out
          socket.emit("deactivate-poll", { pollId: userData.pollId, roomId: userData.roomId });
        }
      }, 1000);
    }
  });

  socket.on("deactivate-poll", (userData) => {
    console.log(`Deactivating poll ${userData.pollId} in room ${userData.roomId}`);
    
    const pollsData = global.polls?.get(userData.roomId);
    if (!pollsData) return;
    
    const poll = pollsData.find(p => p.id === userData.pollId);
    if (!poll) return;
    
    poll.isActive = false;
    
    // Calculate results
    const totalVotes = poll.totalVotes || 0;
    const results = poll.options.map(option => ({
      optionId: option.id,
      percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0,
      votes: option.votes
    }));
    
    poll.results = results;
    
    // Notify all participants
    io.to(userData.roomId).emit("poll-deactivated", {
      pollId: userData.pollId
    });
    
    io.to(userData.roomId).emit("poll-results", {
      pollId: userData.pollId,
      results
    });
  });

  socket.on("vote-poll", (userData) => {
    console.log(`Vote received for poll ${userData.pollId} in room ${userData.roomId}`);
    
    const pollsData = global.polls?.get(userData.roomId);
    if (!pollsData) return;
    
    const poll = pollsData.find(p => p.id === userData.pollId);
    if (!poll || !poll.isActive) return;
    
    const option = poll.options.find(o => o.id === userData.optionId);
    if (!option) return;
    
    // Add vote
    option.votes++;
    poll.totalVotes = (poll.totalVotes || 0) + 1;
    
    // Add voter if not anonymous
    if (!poll.isAnonymous) {
      option.voters.push(userData.userId);
    }
    
    // Notify all participants about the vote
    io.to(userData.roomId).emit("poll-vote", {
      pollId: userData.pollId,
      optionId: userData.optionId,
      userId: userData.userId,
      poll: poll
    });
  });

  socket.on("add-poll-comment", (userData) => {
    console.log(`Adding comment to poll ${userData.pollId} in room ${userData.roomId}`);
    
    const commentId = `comment-${Date.now()}`;
    const comment = {
      id: commentId,
      text: userData.text,
      author: {
        id: userData.userId,
        name: userData.userName
      },
      timestamp: Date.now()
    };
    
    // Notify all participants about the comment
    io.to(userData.roomId).emit("poll-comment", {
      pollId: userData.pollId,
      commentId,
      text: userData.text,
      author: comment.author,
      timestamp: comment.timestamp
    });
  });

  socket.on("delete-poll", (userData) => {
    console.log(`Deleting poll ${userData.pollId} in room ${userData.roomId}`);
    
    const pollsData = global.polls?.get(userData.roomId);
    if (!pollsData) return;
    
    const pollIndex = pollsData.findIndex(p => p.id === userData.pollId);
    if (pollIndex === -1) return;
    
    pollsData.splice(pollIndex, 1);
    
    // Notify all participants about the deletion
    io.to(userData.roomId).emit("poll-deleted", {
      pollId: userData.pollId
    });
  });

  // Recording timestamp event handlers
  socket.on("recording-timestamp-added", (userData) => {
    console.log(`Recording timestamp added in room ${userData.roomId} by ${userData.userName}`);
    
    // Notify all participants about the new timestamp
    io.to(userData.roomId).emit("recording-timestamp-added", {
      timestamp: userData.timestamp
    });
  });

  socket.on("recording-timestamp-removed", (userData) => {
    console.log(`Recording timestamp removed in room ${userData.roomId} by ${userData.userName}`);
    
    // Notify all participants about the timestamp removal
    io.to(userData.roomId).emit("recording-timestamp-removed", {
      timestampId: userData.timestampId
    });
  });

  socket.on("recording-timestamp-updated", (userData) => {
    console.log(`Recording timestamp updated in room ${userData.roomId} by ${userData.userName}`);
    
    // Notify all participants about the timestamp update
    io.to(userData.roomId).emit("recording-timestamp-updated", {
      timestampId: userData.timestampId,
      updates: userData.updates
    });
  });

  // Captions event handlers
  socket.on("caption-added", (userData) => {
    console.log(`Caption added in room ${userData.roomId} by ${userData.userName}`);
    
    // Notify all participants about the new caption
    io.to(userData.roomId).emit("caption-added", {
      caption: userData.caption
    });
  });

  socket.on("captions-started", (userData) => {
    console.log(`Captions started in room ${userData.roomId} by ${userData.userName}`);
    
    // Notify all participants about captions starting
    io.to(userData.roomId).emit("captions-started", {
      userId: userData.userId,
      userName: userData.userName,
      language: userData.language
    });
  });

  socket.on("captions-stopped", (userData) => {
    console.log(`Captions stopped in room ${userData.roomId} by ${userData.userName}`);
    
    // Notify all participants about captions stopping
    io.to(userData.roomId).emit("captions-stopped", {
      userId: userData.userId,
      userName: userData.userName
    });
  });

  // Notes event handlers
  socket.on("note-created", (userData) => {
    console.log(`Note created in room ${userData.roomId} by ${userData.userName}`);
    
    // Notify all participants about the new note
    io.to(userData.roomId).emit("note-created", {
      note: userData.note
    });
  });

  socket.on("note-updated", (userData) => {
    console.log(`Note updated in room ${userData.roomId} by ${userData.userName}`);
    
    // Notify all participants about the note update
    io.to(userData.roomId).emit("note-updated", {
      noteId: userData.noteId,
      updates: userData.updates
    });
  });

  socket.on("note-deleted", (userData) => {
    console.log(`Note deleted in room ${userData.roomId} by ${userData.userName}`);
    
    // Notify all participants about the note deletion
    io.to(userData.roomId).emit("note-deleted", {
      noteId: userData.noteId
    });
  });

  socket.on("note-shared", (userData) => {
    console.log(`Note shared in room ${userData.roomId} by ${userData.userName}`);
    
    // Notify all participants about the note sharing
    io.to(userData.roomId).emit("note-shared", {
      noteId: userData.noteId,
      collaboratorIds: userData.collaboratorIds
    });
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