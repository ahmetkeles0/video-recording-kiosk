import React, { useState, useEffect } from 'react';
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
        console.log('Permission API not supported');
        setPermissionStatus('unknown');
      }
    };
    
    checkPermissions();
  }, []);

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
      console.log('Start record received:', data);
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
        setTimeout(async () => {
          console.log('15-second timeout reached, stopping recording...');
          stopRecording();
          setStatus('Kayıt tamamlandı, yükleniyor...');
          setIsUploading(true);
          
          // Wait for video to be ready
          setTimeout(async () => {
            try {
              await handleVideoUpload();
            } catch (error) {
              console.error('Upload error:', error);
              setStatus('Yükleme hatası');
              setIsUploading(false);
            }
          }, 1000);
        }, 15000);

      } catch (error) {
        console.error('Recording error:', error);
        setStatus('Kayıt hatası');
      }
    });

    return cleanup;
  }, [onStartRecord, startRecording, stopRecording, isRecording]);

  const handleVideoUpload = async () => {
    console.log('handleVideoUpload called, videoUrl:', videoUrl);
    if (!videoUrl) {
      throw new Error('No video to upload');
    }

    try {
      console.log('Converting video URL to File...');
      // Convert video URL to File
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const file = new File([blob], 'recording.webm', { type: 'video/webm' });
      console.log('File created, size:', file.size);

      console.log('Uploading to backend API...');
      // Upload to backend API
      const { url, filename } = await uploadVideo(file, deviceId);
      console.log('Upload successful, URL:', url, 'filename:', filename);

      // Send recording ready event
      const recordingReady: RecordingReadyEvent = {
        videoUrl: url,
        filename,
        deviceId,
        timestamp: Date.now(),
      };

      console.log('Sending recording-ready event...');
      sendRecordingReady(recordingReady);
      setStatus('Video yüklendi!');
      setIsUploading(false);

      // Navigate to result page
      navigate('/result', { state: { videoUrl: url, filename } });

    } catch (error) {
      console.error('Upload error:', error);
      setStatus('Yükleme hatası');
      setIsUploading(false);
    }
  };

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
    </div>
  );
};

export default Recorder;
