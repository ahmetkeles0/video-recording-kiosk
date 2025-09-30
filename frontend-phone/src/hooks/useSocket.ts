import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { DeviceRegistration, StartRecordEvent, StopRecordEvent, RecordingReadyEvent } from '../types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setError(null);
      // Expose socket to window for debugging
      (window as any).socket = newSocket;
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const registerDevice = (deviceType: 'tablet' | 'phone', deviceId: string) => {
    if (!socket) return;

    const registration: DeviceRegistration = {
      deviceType,
      deviceId,
    };

    socket.emit('register-device', registration);
  };

  const onStartRecord = (callback: (data: StartRecordEvent) => void) => {
    if (!socket) return;

    socket.on('start-record', callback);

    return () => {
      socket.off('start-record', callback);
    };
  };

  const onStopRecord = (callback: (data: StopRecordEvent) => void) => {
    if (!socket) return;

    socket.on('stop-record', callback);

    return () => {
      socket.off('stop-record', callback);
    };
  };

  const sendRecordingReady = (data: RecordingReadyEvent) => {
    if (!socket) return;

    socket.emit('recording-ready', data);
  };

  const onDeviceRegistered = (callback: (data: { success: boolean; deviceId: string }) => void) => {
    if (!socket) return;

    socket.on('device-registered', callback);

    return () => {
      socket.off('device-registered', callback);
    };
  };

  const onError = (callback: (data: { message: string }) => void) => {
    if (!socket) return;

    socket.on('error', callback);

    return () => {
      socket.off('error', callback);
    };
  };

  return {
    socket,
    isConnected,
    error,
    registerDevice,
    onStartRecord,
    onStopRecord,
    sendRecordingReady,
    onDeviceRegistered,
    onError,
  };
};
