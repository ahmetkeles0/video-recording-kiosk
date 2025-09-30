import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { uploadVideo } from '../hooks/useSupabase';
import { RecordingReadyEvent } from '../types';

const Recorder: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isConnected, 
    registerDevice, 
    onStartRecord, 
    sendRecordingReady,
    onDeviceRegistered 
  } = useSocket();
  
  const {
    isRecording,
    videoUrl,
    startRecording,
    stopRecording,
    clearRecording,
    canvasRef,
  } = useVideoRecorder();

  const [deviceId] = useState(() => `phone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isRegistered, setIsRegistered] = useState(false);
  const [status, setStatus] = useState('Bağlanıyor...');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');

  // Debug logger
  const sendDebugInfo = useCallback(async (type: string, data: any) => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    try {
      await fetch(`${BACKEND_URL}/api/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          deviceId,
          data,
          timestamp: new Date().toISOString()
        })
      });
    } catch {
      // Ignore debug logging errors
    }
  }, [deviceId]);

  // Permissions check
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        if (cameraPermission.state === 'granted' && micPermission.state === 'granted') {
          setPermissionStatus('granted');
        } else if (cameraPermission.state === 'denied' || micPermission.state === 'denied') {
          setPermissionStatus('denied');
        } else {
          setPermissionStatus('prompt');
        }
      } catch (error) {
        sendDebugInfo('PERMISSION_API_NOT_SUPPORTED', { error: error instanceof Error ? error.message : 'Unknown error' });
        setPermissionStatus('unknown');
      }
    };
    
    checkPermissions();
  }, [sendDebugInfo]);

  // Upload logic
  const performUpload = useCallback(async () => {
    if (isUploading || !videoUrl) return;

    setIsUploading(true);
    setStatus('Kayıt tamamlandı, yükleniyor...');
    sendDebugInfo('HANDLE_VIDEO_UPLOAD_CALLED', { videoUrl: !!videoUrl });

    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const file = new File([blob], 'recording.webm', { type: 'video/webm' });

      sendDebugInfo('FILE_CREATED', { fileSize: file.size, fileName: file.name });

      const { url, filename } = await uploadVideo(file, deviceId);

      sendDebugInfo('UPLOAD_SUCCESS', { url, filename });

      const readyEvent: RecordingReadyEvent = {
        deviceId,
        videoUrl: url,
        filename, // from upload response
        timestamp: Date.now()
      };
      sendRecordingReady(readyEvent);

      setStatus('Yükleme tamamlandı');
      navigate(`/preview/${encodeURIComponent(url)}`);
    } catch (error: any) {
      sendDebugInfo('UPLOAD_FAILED', { error: error.message || error });
      setStatus('Yükleme hatası');
    } finally {
      setIsUploading(false);
    }
  }, [videoUrl, deviceId, sendDebugInfo, sendRecordingReady, navigate, isUploading]);

  // 🔑 Watch for videoUrl becoming available after stopRecording
  useEffect(() => {
    if (videoUrl && !isRecording && !isUploading) {
      sendDebugInfo('VIDEO_URL_READY', { videoUrl });
      performUpload();
    }
  }, [videoUrl, isRecording, isUploading, performUpload, sendDebugInfo]);

  // Start record handler from socket
  useEffect(() => {
    if (!isRegistered) return;

    onStartRecord(async () => {
      setStatus('Kayda hazırlanıyor...');
      setCountdown(3);

      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            startRecording();
            setCountdown(null);
            setStatus('Kayıt başladı');

            // Stop recording after 15s
            setTimeout(() => {
              stopRecording();
              setStatus('Kayıt tamamlandı');
            }, 15000);

            return null;
          }
          return prev - 1;
        });
      }, 1000);
    });
  }, [isRegistered, onStartRecord, startRecording, stopRecording]);

  // Register device once connected
  useEffect(() => {
    if (isConnected && !isRegistered) {
      registerDevice('phone', deviceId);
      onDeviceRegistered(() => {
      setIsRegistered(true);
      setStatus('Hazır');
      });
    }
  }, [isConnected, isRegistered, registerDevice, onDeviceRegistered, deviceId]);

  return (
    <div className="recorder">
      <h1>Recorder</h1>
      <p>{status}</p>

      {countdown !== null && <p>Başlangıç: {countdown}</p>}
      {isRecording && <p>Kaydediliyor...</p>}
      {isUploading && <p>Yükleniyor...</p>}

      <canvas ref={canvasRef} className="preview" />

      <div className="actions">
        <button onClick={startRecording} disabled={isRecording || isUploading}>Başlat</button>
        <button onClick={stopRecording} disabled={!isRecording}>Durdur</button>
        <button onClick={clearRecording}>Temizle</button>
        <button onClick={performUpload} disabled={!videoUrl || isUploading}>Manuel Yükle</button>
      </div>
    </div>
  );
};

export default Recorder;
