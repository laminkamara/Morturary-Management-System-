export function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle user authentication and room joining
    socket.on('authenticate', (userData) => {
      if (userData && userData.id) {
        socket.userId = userData.id;
        socket.userRole = userData.role;
        
        // Join user-specific room
        socket.join(userData.id);
        
        // Join role-specific rooms
        socket.join(userData.role);
        
        console.log(`User ${userData.id} (${userData.role}) authenticated and joined rooms`);
        
        // Send confirmation
        socket.emit('authenticated', { 
          message: 'Successfully connected to real-time updates',
          userId: userData.id,
          role: userData.role
        });
      }
    });

    // Handle real-time notifications
    socket.on('markNotificationRead', (notificationId) => {
      if (socket.userId) {
        // Broadcast to user's other sessions
        socket.to(socket.userId).emit('notificationRead', { id: notificationId });
      }
    });

    // Handle typing indicators for collaborative features
    socket.on('typing', (data) => {
      if (socket.userId) {
        socket.to(data.room || 'general').emit('userTyping', {
          userId: socket.userId,
          isTyping: data.isTyping
        });
      }
    });

    // Handle body status updates
    socket.on('bodyStatusUpdate', (data) => {
      if (socket.userRole === 'admin' || socket.userRole === 'staff') {
        io.emit('bodyUpdated', data);
      }
    });

    // Handle storage unit updates
    socket.on('storageUpdate', (data) => {
      if (socket.userRole === 'admin' || socket.userRole === 'staff') {
        io.emit('storageUpdated', data);
      }
    });

    // Handle task updates
    socket.on('taskUpdate', (data) => {
      io.emit('taskUpdated', data);
    });

    // Handle autopsy updates
    socket.on('autopsyUpdate', (data) => {
      io.emit('autopsyUpdated', data);
    });

    // Handle release updates
    socket.on('releaseUpdate', (data) => {
      io.emit('releaseUpdated', data);
    });

    // Handle user presence
    socket.on('updatePresence', (status) => {
      if (socket.userId) {
        socket.to('admin').emit('userPresenceUpdate', {
          userId: socket.userId,
          status: status,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle emergency alerts
    socket.on('emergencyAlert', (data) => {
      if (socket.userRole === 'admin') {
        io.emit('emergencyAlert', {
          ...data,
          timestamp: new Date().toISOString(),
          from: socket.userId
        });
      }
    });

    // Handle system maintenance notifications
    socket.on('systemMaintenance', (data) => {
      if (socket.userRole === 'admin') {
        io.emit('systemMaintenance', {
          ...data,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      
      if (socket.userId) {
        // Notify admin about user going offline
        socket.to('admin').emit('userPresenceUpdate', {
          userId: socket.userId,
          status: 'offline',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', { message: 'Connection error occurred' });
    });
  });

  // Periodic system status broadcast
  setInterval(() => {
    io.emit('systemHeartbeat', {
      timestamp: new Date().toISOString(),
      status: 'online',
      connectedUsers: io.engine.clientsCount
    });
  }, 30000); // Every 30 seconds

  console.log('Socket.IO handlers initialized');
}