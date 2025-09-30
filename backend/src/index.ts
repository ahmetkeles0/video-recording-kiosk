import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import uploadRoutes from './routes/upload';
import { config } from './config/env';
import { SocketEvents, DeviceRegistration, StartRecordEvent, RecordingReadyEvent } from './types';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, error ? JSON.stringify(error, null, 2) : '');
  },
  warn: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  debug: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [config.frontend.tabletUrl, config.frontend.phoneUrl, 'http://localhost:5173', 'https://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: [config.frontend.tabletUrl, config.frontend.phoneUrl, 'http://localhost:5173', 'https://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api', uploadRoutes);

// Health check
app.get('/health', (req, res) => {
  logger.info('Health check requested', { 
    ip: req.ip, 
    userAgent: req.get('User-Agent'),
    connectedDevices: connectedDevices.size 
  });
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Store connected devices
const connectedDevices = new Map<string, { deviceType: string; socketId: string }>();

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected', { 
    socketId: socket.id, 
    ip: socket.handshake.address,
    userAgent: socket.handshake.headers['user-agent'],
    totalConnections: io.sockets.sockets.size 
  });

  // Register device
  socket.on('register-device', (data: DeviceRegistration) => {
    const { deviceType, deviceId } = data;
    connectedDevices.set(deviceId, { deviceType, socketId: socket.id });
    
    logger.info('Device registered', { 
      deviceType, 
      deviceId, 
      socketId: socket.id,
      totalDevices: connectedDevices.size,
      deviceList: Array.from(connectedDevices.keys())
    });
    
    socket.emit('device-registered', { 
      success: true, 
      deviceId 
    });
  });

  // Start recording (tablet -> phone)
  socket.on('start-record', (data: StartRecordEvent) => {
    logger.info('🎬 START RECORD REQUEST RECEIVED', { 
      requestDeviceId: data.deviceId,
      timestamp: data.timestamp,
      requestSocketId: socket.id,
      availableDevices: Array.from(connectedDevices.entries()).map(([id, device]) => ({
        deviceId: id,
        deviceType: device.deviceType,
        socketId: device.socketId
      })),
      receivedAt: new Date().toISOString()
    });
    
    // Find phone device
    const phoneDevice = Array.from(connectedDevices.entries())
      .find(([_, device]) => device.deviceType === 'phone');
    
    if (phoneDevice) {
      const [deviceId, deviceInfo] = phoneDevice;
      const phoneSocket = io.sockets.sockets.get(deviceInfo.socketId);
      
      if (phoneSocket) {
        phoneSocket.emit('start-record', data);
        logger.info('📱 START RECORD COMMAND SENT TO PHONE', { 
          targetDeviceId: deviceId,
          targetSocketId: deviceInfo.socketId,
          commandData: data,
          sentAt: new Date().toISOString()
        });
      } else {
        logger.error('❌ PHONE SOCKET NOT FOUND', { 
          deviceId, 
          socketId: deviceInfo.socketId,
          availableSockets: Array.from(io.sockets.sockets.keys()),
          timestamp: new Date().toISOString()
        });
        socket.emit('error', { message: 'Phone device socket not found' });
      }
    } else {
      logger.warn('⚠️ NO PHONE DEVICE CONNECTED', { 
        availableDevices: Array.from(connectedDevices.entries()),
        totalDevices: connectedDevices.size,
        timestamp: new Date().toISOString()
      });
      socket.emit('error', { message: 'No phone device connected' });
    }
  });

  // Stop recording (tablet -> phone)
  socket.on('stop-record', (data) => {
    logger.info('Stop record request received', { 
      requestDeviceId: data.deviceId,
      requestSocketId: socket.id
    });
    
    // Find phone device
    const phoneDevice = Array.from(connectedDevices.entries())
      .find(([_, device]) => device.deviceType === 'phone');
    
    if (phoneDevice) {
      const [deviceId, deviceInfo] = phoneDevice;
      const phoneSocket = io.sockets.sockets.get(deviceInfo.socketId);
      
      if (phoneSocket) {
        phoneSocket.emit('stop-record', data);
        logger.info('Stop record command sent to phone', { 
          targetDeviceId: deviceId,
          targetSocketId: deviceInfo.socketId,
          commandData: data
        });
      } else {
        logger.error('Phone socket not found for stop command', { 
          deviceId, 
          socketId: deviceInfo.socketId
        });
      }
    } else {
      logger.warn('No phone device connected for stop command');
    }
  });

  // Recording ready (phone -> tablet)
  socket.on('recording-ready', (data: RecordingReadyEvent) => {
    logger.info('📱 RECORDING READY NOTIFICATION RECEIVED', { 
      videoUrl: data.videoUrl,
      deviceId: data.deviceId,
      timestamp: data.timestamp,
      phoneSocketId: socket.id,
      receivedAt: new Date().toISOString()
    });
    
    // Find tablet device
    const tabletDevice = Array.from(connectedDevices.entries())
      .find(([_, device]) => device.deviceType === 'tablet');
    
    if (tabletDevice) {
      const [deviceId, deviceInfo] = tabletDevice;
      const tabletSocket = io.sockets.sockets.get(deviceInfo.socketId);
      
      if (tabletSocket) {
        tabletSocket.emit('video-uploaded', data);
        logger.info('📤 VIDEO URL SENT TO TABLET', { 
          targetDeviceId: deviceId,
          targetSocketId: deviceInfo.socketId,
          videoUrl: data.videoUrl,
          sentAt: new Date().toISOString()
        });
      } else {
        logger.error('❌ TABLET SOCKET NOT FOUND', { 
          deviceId, 
          socketId: deviceInfo.socketId,
          availableSockets: Array.from(io.sockets.sockets.keys()),
          timestamp: new Date().toISOString()
        });
      }
    } else {
      logger.warn('⚠️ NO TABLET DEVICE CONNECTED FOR VIDEO UPLOAD', { 
        availableDevices: Array.from(connectedDevices.entries()),
        videoUrl: data.videoUrl,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    logger.info('Client disconnected', { 
      socketId: socket.id, 
      reason,
      totalConnections: io.sockets.sockets.size,
      connectedDevicesBefore: Array.from(connectedDevices.keys())
    });
    
    // Remove device from connected devices
    for (const [deviceId, device] of connectedDevices.entries()) {
      if (device.socketId === socket.id) {
        connectedDevices.delete(deviceId);
        logger.info('Device removed from registry', { 
          deviceId, 
          deviceType: device.deviceType,
          remainingDevices: Array.from(connectedDevices.keys())
        });
        break;
      }
    }
  });
});

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  logger.info('🚀 Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    tabletUrl: config.frontend.tabletUrl,
    phoneUrl: config.frontend.phoneUrl,
    corsOrigins: [config.frontend.tabletUrl, config.frontend.phoneUrl, 'http://localhost:5173', 'https://localhost:5173']
  });
});

export default app;
