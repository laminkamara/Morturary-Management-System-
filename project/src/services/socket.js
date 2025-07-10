import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(user) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
      
      // Authenticate user
      if (user) {
        this.socket.emit('authenticate', user);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Set up real-time event listeners
    this.setupEventListeners();

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Body events
    this.socket.on('bodyCreated', (body) => {
      this.emit('bodyCreated', body);
    });

    this.socket.on('bodyUpdated', (body) => {
      this.emit('bodyUpdated', body);
    });

    this.socket.on('bodyDeleted', (data) => {
      this.emit('bodyDeleted', data);
    });

    // Storage events
    this.socket.on('storageUpdated', (storage) => {
      this.emit('storageUpdated', storage);
    });

    // Autopsy events
    this.socket.on('autopsyCreated', (autopsy) => {
      this.emit('autopsyCreated', autopsy);
    });

    this.socket.on('autopsyUpdated', (autopsy) => {
      this.emit('autopsyUpdated', autopsy);
    });

    this.socket.on('autopsyDeleted', (data) => {
      this.emit('autopsyDeleted', data);
    });

    // Task events
    this.socket.on('taskCreated', (task) => {
      this.emit('taskCreated', task);
    });

    this.socket.on('taskUpdated', (task) => {
      this.emit('taskUpdated', task);
    });

    this.socket.on('taskDeleted', (data) => {
      this.emit('taskDeleted', data);
    });

    // Release events
    this.socket.on('releaseCreated', (release) => {
      this.emit('releaseCreated', release);
    });

    this.socket.on('releaseUpdated', (release) => {
      this.emit('releaseUpdated', release);
    });

    this.socket.on('releaseDeleted', (data) => {
      this.emit('releaseDeleted', data);
    });

    // User events
    this.socket.on('userCreated', (user) => {
      this.emit('userCreated', user);
    });

    this.socket.on('userUpdated', (user) => {
      this.emit('userUpdated', user);
    });

    this.socket.on('userDeleted', (data) => {
      this.emit('userDeleted', data);
    });

    // Notification events
    this.socket.on('newNotification', (notification) => {
      this.emit('newNotification', notification);
    });

    this.socket.on('notificationRead', (data) => {
      this.emit('notificationRead', data);
    });

    this.socket.on('allNotificationsRead', () => {
      this.emit('allNotificationsRead');
    });

    this.socket.on('notificationDeleted', (data) => {
      this.emit('notificationDeleted', data);
    });

    // System events
    this.socket.on('systemHeartbeat', (data) => {
      this.emit('systemHeartbeat', data);
    });

    this.socket.on('emergencyAlert', (alert) => {
      this.emit('emergencyAlert', alert);
    });

    this.socket.on('systemMaintenance', (data) => {
      this.emit('systemMaintenance', data);
    });

    // User presence events
    this.socket.on('userPresenceUpdate', (data) => {
      this.emit('userPresenceUpdate', data);
    });
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in socket event callback:', error);
        }
      });
    }
  }

  // Socket emission methods
  markNotificationRead(notificationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('markNotificationRead', notificationId);
    }
  }

  updatePresence(status) {
    if (this.socket && this.isConnected) {
      this.socket.emit('updatePresence', status);
    }
  }

  sendEmergencyAlert(alert) {
    if (this.socket && this.isConnected) {
      this.socket.emit('emergencyAlert', alert);
    }
  }

  sendSystemMaintenance(data) {
    if (this.socket && this.isConnected) {
      this.socket.emit('systemMaintenance', data);
    }
  }

  // Typing indicators
  setTyping(room, isTyping) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', { room, isTyping });
    }
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;