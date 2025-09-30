import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import uploadRoutes from './routes/upload';
import { config } from './config/env';
import { SocketEvents, DeviceRegistration, StartRecordEvent, RecordingReadyEvent } from './types';

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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Store connected devices
const connectedDevices = new Map<string, { deviceType: string; socketId: string }>();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Register device
  socket.on('register-device', (data: DeviceRegistration) => {
    const { deviceType, deviceId } = data;
    connectedDevices.set(deviceId, { deviceType, socketId: socket.id });
    
    console.log(`Device registered: ${deviceType} (${deviceId})`);
    
    socket.emit('device-registered', { 
      success: true, 
      deviceId 
    });
  });

  // Start recording (tablet -> phone)
  socket.on('start-record', (data: StartRecordEvent) => {
    console.log(`Start record request: ${data.deviceId}`);
    
    // Find phone device
    const phoneDevice = Array.from(connectedDevices.entries())
      .find(([_, device]) => device.deviceType === 'phone');
    
    if (phoneDevice) {
      const [deviceId, deviceInfo] = phoneDevice;
      const phoneSocket = io.sockets.sockets.get(deviceInfo.socketId);
      
      if (phoneSocket) {
        phoneSocket.emit('start-record', data);
        console.log(`Start record sent to phone: ${deviceId}`);
      }
    } else {
      console.log('No phone device connected');
      socket.emit('error', { message: 'No phone device connected' });
    }
  });

  // Stop recording (tablet -> phone)
  socket.on('stop-record', (data) => {
    console.log(`Stop record request: ${data.deviceId}`);
    
    // Find phone device
    const phoneDevice = Array.from(connectedDevices.entries())
      .find(([_, device]) => device.deviceType === 'phone');
    
    if (phoneDevice) {
      const [deviceId, deviceInfo] = phoneDevice;
      const phoneSocket = io.sockets.sockets.get(deviceInfo.socketId);
      
      if (phoneSocket) {
        phoneSocket.emit('stop-record', data);
        console.log(`Stop record sent to phone: ${deviceId}`);
      }
    }
  });

  // Recording ready (phone -> tablet)
  socket.on('recording-ready', (data: RecordingReadyEvent) => {
    console.log(`Recording ready: ${data.videoUrl}`);
    
    // Find tablet device
    const tabletDevice = Array.from(connectedDevices.entries())
      .find(([_, device]) => device.deviceType === 'tablet');
    
    if (tabletDevice) {
      const [deviceId, deviceInfo] = tabletDevice;
      const tabletSocket = io.sockets.sockets.get(deviceInfo.socketId);
      
      if (tabletSocket) {
        tabletSocket.emit('video-uploaded', data);
        console.log(`Video URL sent to tablet: ${deviceId}`);
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    // Remove device from connected devices
    for (const [deviceId, device] of connectedDevices.entries()) {
      if (device.socketId === socket.id) {
        connectedDevices.delete(deviceId);
        console.log(`Device removed: ${deviceId}`);
        break;
      }
    }
  });
});

// Start server
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Tablet URL: ${config.frontend.tabletUrl}`);
  console.log(`📱 Phone URL: ${config.frontend.phoneUrl}`);
});

export default app;
