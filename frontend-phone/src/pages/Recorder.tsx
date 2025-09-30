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
  const [shouldUpload, setShouldUpload] = useState(false);

  // Send debug info to backend - use useCallback to prevent recreation
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
    } catch (e) {
      // Ignore debug logging errors
    }
  }, [deviceId]);

  // Check camera/microphone permissions on mount
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
  }, []);

  // Simple upload function with useCallback to prevent recreation
  const performUpload = useCallback(async () => {
    sendDebugInfo('HANDLE_VIDEO_UPLOAD_CALLED', { videoUrl: !!videoUrl });
    if (!videoUrl) {
      sendDebugInfo('NO_VIDEO_URL_WAITING', { videoUrl: !!videoUrl });
      // Wait a bit more for video to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!videoUrl) {
        sendDebugInfo('NO_VIDEO_URL_AFTER_WAIT', { videoUrl: !!videoUrl });
        throw new Error('No video to upload - video URL not available');
      }
    }

    try {
      sendDebugInfo('CONVERTING_VIDEO_URL_TO_FILE', { videoUrl: !!videoUrl });
      // Convert video URL to File
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const file = new File([blob], 'recording.webm', { type: 'video/webm' });
      sendDebugInfo('FILE_CREATED', { fileSize: file.size, fileName: file.name });

      sendDebugInfo('UPLOADING_TO_BACKEND_API', { deviceId });
      // Upload to backend API
      const { url, filename } = await uploadVideo(file, deviceId);
      sendDebugInfo('UPLOAD_SUCCESSFUL', { url, filename });

      // Send recording ready event
      const recordingReady: RecordingReadyEvent = {
        videoUrl: url,
        filename,
        deviceId,
        timestamp: Date.now(),
      };

      sendDebugInfo('SENDING_RECORDING_READY_EVENT', { videoUrl: url, filename });
      sendRecordingReady(recordingReady);
      setStatus('Video yüklendi!');
      setIsUploading(false);
      setShouldUpload(false);

      // Navigate to result page
      navigate('/result', { state: { videoUrl: url, filename } });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      sendDebugInfo('UPLOAD_ERROR_IN_HANDLE_VIDEO_UPLOAD', { error: errorMessage, stack: errorStack });
      setStatus('Yükleme hatası');
      setIsUploading(false);
      setShouldUpload(false);
    }
  }, [videoUrl, deviceId, sendRecordingReady, navigate, sendDebugInfo]);

  // Handle upload when video is ready and shouldUpload is true
  useEffect(() => {
    if (shouldUpload && videoUrl && !isUploading) {
      setIsUploading(true);
      setStatus('Kayıt tamamlandı, yükleniyor...');
      
      // Call the upload function directly
      performUpload().catch(() => {
        setStatus('Yükleme hatası');
        setIsUploading(false);
        setShouldUpload(false);
      });
    }
  }, [shouldUpload, videoUrl, isUploading]);

  useEffect(() => {
    if (isConnected && !isRegistered) {
      registerDevice('phone', deviceId);
      setStatus('Cihaz kaydediliyor...');
    }
  }, [isConnected, isRegistered, deviceId, registerDevice]);

  useEffect(() => {
    const cleanup = onDeviceRegistered((data) => {
      if (data.success) {
        setIsRegistered(true);
        setStatus('Hazır - Kayıt bekleniyor...');
      } else {
        setStatus('Cihaz kaydı başarısız');
      }
    });

    return cleanup;
  }, [onDeviceRegistered]);

  useEffect(() => {
    const cleanup = onStartRecord(async (data: StartRecordEvent) => {
      sendDebugInfo('START_RECORD_RECEIVED', { data });
      setStatus('Kayıt başlatılıyor...');
      
      try {
        await startRecording();
        setStatus('Kayıt yapılıyor...');
        
        // Start 15-second countdown
        setCountdown(15);
        const countdownInterval = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(countdownInterval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);

        // Auto-stop after 15 seconds
        const timeoutId = setTimeout(() => {
          sendDebugInfo('15_SECOND_TIMEOUT_REACHED', { isRecording, videoUrl: !!videoUrl });
          stopRecording();
          setStatus('Kayıt tamamlandı, yükleniyor...');
          setShouldUpload(true); // Trigger upload when video is ready
          sendDebugInfo('SHOULD_UPLOAD_SET_TO_TRUE', { shouldUpload: true });
          
          // Backup timer - try upload even if video URL not ready
          setTimeout(() => {
            sendDebugInfo('BACKUP_UPLOAD_TIMER_TRIGGERED', { shouldUpload, isUploading });
            if (shouldUpload && !isUploading) {
              sendDebugInfo('ATTEMPTING_BACKUP_UPLOAD', { shouldUpload, isUploading });
              // Call performUpload directly instead of setting state
              performUpload().catch(() => {
                setStatus('Yükleme hatası');
                setIsUploading(false);
                setShouldUpload(false);
              });
            }
          }, 3000);
        }, 15000);

        // Store timeout ID for cleanup
        return () => {
          clearTimeout(timeoutId);
        };

      } catch (error) {
        console.error('Recording error:', error);
        setStatus('Kayıt hatası');
      }
    });

    return cleanup;
  }, [onStartRecord, startRecording, stopRecording, isRecording]);

  const error = socketError || recorderError;

  if (error) {
    return (
      <div className="card">
        <h1 className="title">📱 Video Kiosk</h1>
        <div className="error">
          Hata: {error}
        </div>
        <button 
          className="button" 
          onClick={() => window.location.reload()}
        >
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
          <p>⚠️ Kamera ve mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından izinleri etkinleştirin.</p>
        </div>
      )}

      {permissionStatus === 'prompt' && (
        <div className="permission-info">
          <p>📱 Kayıt başladığında kamera ve mikrofon izni istenecek.</p>
        </div>
      )}

      {countdown !== null && countdown > 0 && (
        <div className="countdown">
          {countdown}
        </div>
      )}

      {!isConnected && (
        <div className="loading"></div>
      )}

      <div className="video-container" style={{ display: isRecording ? 'block' : 'none' }}>
        <canvas 
          ref={canvasRef}
          style={{ width: '100%', height: 'auto' }}
        />
        {isRecording && (
          <div className="recording-indicator">
            ● KAYIT
          </div>
        )}
      </div>

      {videoUrl && !isRecording && (
        <div>
          <video 
            src={videoUrl} 
            controls 
            className="video-preview"
          />
          <button 
            className="button" 
            onClick={clearRecording}
            style={{ marginTop: '1rem' }}
          >
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

      {shouldUpload && !videoUrl && !isUploading && (
        <div className="permission-warning">
          <p>⚠️ Video işleniyor, lütfen bekleyin...</p>
          <button 
            className="button" 
            onClick={() => {
              sendDebugInfo('MANUAL_UPLOAD_TRIGGER_CLICKED', { shouldUpload, videoUrl: !!videoUrl, isUploading });
              setShouldUpload(true);
            }}
            style={{ marginTop: '1rem' }}
          >
            Manuel Yükleme
          </button>
        </div>
      )}
    </div>
  );
};

export default Recorder;
