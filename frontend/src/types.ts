export type DeviceType = 'tablet' | 'phone';

export interface DeviceRegistration {
  deviceType: DeviceType;
  deviceId: string;
}

export interface StartRecordEvent {
  deviceId: string;
  timestamp: number;
}

export interface StopRecordEvent {
  deviceId: string;
  timestamp: number;
}

export interface RecordingReadyEvent {
  videoUrl: string;
  filename: string;
  deviceId: string;
  timestamp: number;
}

export interface SocketEvents {
  // Client to Server
  'register-device': DeviceRegistration;
  'start-record': StartRecordEvent;
  'stop-record': StopRecordEvent;
  'recording-ready': RecordingReadyEvent;
  
  // Server to Client
  'device-registered': { success: boolean; deviceId: string };
  'record-started': { deviceId: string; timestamp: number };
  'record-stopped': { deviceId: string; timestamp: number };
  'video-uploaded': RecordingReadyEvent;
}

export interface VideoMetadata {
  id: string;
  filename: string;
  url: string;
  size: number;
  duration: number;
  createdAt: string;
  deviceId: string;
}

export interface UploadResponse {
  success: boolean;
  videoUrl?: string;
  filename?: string;
  error?: string;
}
