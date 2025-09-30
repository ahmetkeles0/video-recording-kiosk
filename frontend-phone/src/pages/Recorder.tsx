import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { uploadVideo } from '../hooks/useSupabase';
import { StartRecordEvent, RecordingReadyEvent } from '../types';

const Recorder: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isConnected, 
    error: socketError, 
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
    error: recorderError,
    canvasRef,
  } = useVideoRecorder();

  const [deviceId] = useState(() => `phone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isRegistered, setIsRegistered] = useState(false);
  const [status, setStatus] = useState('Bağlanıyor...');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');

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
      // ignore
    }
  }, [deviceId]);

  // Check permissions on mount
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
    if (isUploading) return; // guard
    setIsUploading(true);
    setStatus('Kayıt tamamlandı, yükleniyor...');

    try {
      if (!videoUrl) {
        sendDebugInfo('NO_VIDEO_URL', {});
        throw new Error('No video URL available');
      }

      // Convert URL to file
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const file = new File([blob], 'recording.webm', { type: 'video/webm' });

      sendDebugInfo('FILE_READY_FOR_UPLOAD', { size: file.size });

      // Upload
      const { url, filename } = await uploadVideo(file, deviceId);

      // Notify backend
      const recordingReady: RecordingReadyEvent = {
        videoUrl: url,
        filename,
        deviceId,
        timestamp: Date.now(),
      };
      sendRecordingReady(recordingReady);

      setStatus('Video yüklendi!');
      setIsUploading(false);

      // Navigate to result page
      navigate('/result', { state: { videoUrl: url, filename } });

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      sendDebugInfo('UPLOAD_FAILED', { error: msg });
      setStatus('Yükleme hatası');
      setIsUploading(false);
    }
  }, [videoUrl, isUploading, deviceId, sendRecordingReady, navigate, sendDebugInfo]);

  // Device registration
  useEffect(() => {
    if (isConnected && !isRegistered) {
      registerDevice('phone', deviceId);
      setStatus('Cihaz kaydediliyor...');
    }
  }, [isConnected, isRegistered, deviceId, registerDevice]);

  useEffect(() => {
    return onDeviceRegistered((data) => {
      if (data.success) {
        setIsRegistered(true);
        setStatus('Hazır - Kayıt bekleniyor...');
      } else {
        setStatus('Cihaz kaydı başarısız');
      }
    });
  }, [onDeviceRegistered]);

  // Handle start recording
  useEffect(() => {
    return onStartRecord(async (data: StartRecordEvent) => {
      sendDebugInfo('START_RECORD_RECEIVED', { data });
      setStatus('Kayıt başlatılıyor...');

      try {
        await startRecording();
        setStatus('Kayıt yapılıyor...');

        // Start countdown
        setCountdown(15);
        const intervalId = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(intervalId);
              return null;
            }
            return prev - 1;
          });
        }, 1000);

        // Auto-stop after 15s
        const timeoutId = setTimeout(() => {
          stopRecording();
          performUpload();

          // Backup attempt after 3s
          setTimeout(() => {
            if (!isUploading) {
              performUpload();
            }
          }, 3000);
        }, 15000);

        // Cleanup
        return () => {
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        };

      } catch (error) {
        setStatus('Kayıt hatası');
      }
    });
  }, [onStartRecord, startRecording, stopRecording, performUpload, sendDebugInfo, isUploading]);

  const error = socketError || recorderError;

  if (error) {
    return (
      <div className="card">
        <h1 className="title">📱 Video Kiosk</h1>
        <div className="error">Hata: {error}</div>
        <button className="button" onClick={() => window.location.reload()}>
          Yeniden Dene
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="title">📱 Video Kiosk</h1>
      <p className="subtitle">iPhone Kayıt Cihazı</p>

      <div className={`status ${isRecording ? 'recording' : isUploading ? 'uploading' : isRegistered ? 'ready' : ''}`}>
        {status}
      </div>

      {permissionStatus === 'denied' && (
        <div className="permission-warning">
          ⚠️ Kamera ve mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından izinleri etkinleştirin.
        </div>
      )}

      {permissionStatus === 'prompt' && (
        <div className="permission-info">
          📱 Kayıt başladığında kamera ve mikrofon izni istenecek.
        </div>
      )}

      {countdown !== null && countdown > 0 && (
        <div className="countdown">{countdown}</div>
      )}

      {!isConnected && <div className="loading"></div>}

      <div className="video-container" style={{ display: isRecording ? 'block' : 'none' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: 'auto' }} />
        {isRecording && <div className="recording-indicator">● KAYIT</div>}
      </div>

      {videoUrl && !isRecording && (
        <div>
          <video src={videoUrl} controls className="video-preview" />
          <button className="button" onClick={clearRecording} style={{ marginTop: '1rem' }}>
            Temizle
          </button>
        </div>
      )}

      {isUploading && (
        <div className="status uploading">
          <div className="loading"></div>
          <p>Video yükleniyor...</p>
        </div>
      )}

      {!isUploading && videoUrl && (
        <button
          className="button"
          onClick={() => {
            sendDebugInfo('MANUAL_UPLOAD_TRIGGER', {});
            performUpload();
          }}
          style={{ marginTop: '1rem' }}
        >
          Manuel Yükleme
        </button>
      )}
    </div>
  );
};

export default Recorder;
