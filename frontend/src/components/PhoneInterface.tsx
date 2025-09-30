import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useVideoRecorder } from '../hooks/useVideoRecorder';
import { uploadVideo } from '../hooks/useSupabase';
import { StartRecordEvent, RecordingReadyEvent } from '../types';

const PhoneInterface: React.FC = () => {
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
    streamRef
  } = useVideoRecorder();

  const [deviceId] = useState(() => `phone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [isRegistered, setIsRegistered] = useState(false);
  const [status, setStatus] = useState('Bağlanıyor...');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Use ref to track video URL for upload process
  const videoUrlRef = useRef<string | null>(null);
  
  // Track video URL changes
  useEffect(() => {
    console.log('Video URL changed:', videoUrl);
    videoUrlRef.current = videoUrl;
    if (videoUrl) {
      console.log('Video URL is now available for upload');
    }
  }, [videoUrl]);

  // Track video stream changes
  useEffect(() => {
    console.log('Stream ref changed:', streamRef.current);
    if (streamRef.current) {
      console.log('Video stream is available');
    }
  }, [streamRef.current]);

  // Listen for new recording requests
  useEffect(() => {
    const cleanup = onStartRecord(async (data: StartRecordEvent) => {
      console.log('New recording request received:', data);
      
      // Clear previous recording if exists
      if (videoUrl) {
        clearRecording();
        videoUrlRef.current = null; // Clear ref as well
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for cleanup
      }
      
      setStatus('Yeni kayıt başlatılıyor...');
      
      try {
        // Retry mechanism for camera access
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            await startRecording();
            setStatus('Kayıt yapılıyor...');
            break;
          } catch (error) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw error;
            }
            console.log(`Retry ${retryCount}/${maxRetries} for camera access`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          }
        }
        
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
          console.log('Auto-stop triggered, isRecording:', isRecording);
          stopRecording();
          setStatus('Kayıt tamamlandı, yükleniyor...');
          setIsUploading(true);
          
          // Wait for video to be ready - use a more reliable approach
          const waitForVideoAndUpload = async () => {
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds max wait
            
            while (!videoUrlRef.current && attempts < maxAttempts) {
              console.log(`Waiting for video URL in upload process, attempt ${attempts + 1}/${maxAttempts}`);
              console.log('Current videoUrlRef.current:', videoUrlRef.current);
              await new Promise(resolve => setTimeout(resolve, 1000));
              attempts++;
            }
            
            if (videoUrlRef.current) {
              try {
                console.log('Starting upload process with URL:', videoUrlRef.current);
                await handleVideoUpload();
              } catch (error) {
                console.error('Upload error:', error);
                setStatus('Yükleme hatası');
                setIsUploading(false);
              }
            } else {
              console.error('Video URL not available after waiting in upload process');
              setStatus('Video hazır değil');
              setIsUploading(false);
            }
          };
          
          // Start the wait process
          waitForVideoAndUpload();
        }, 15000);

      } catch (error) {
        console.error('Recording error:', error);
        setStatus('Kayıt hatası');
      }
    });

    return cleanup;
  }, [onStartRecord, startRecording, stopRecording, isRecording, videoUrl, clearRecording]);

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


  const handleVideoUpload = async () => {
    console.log('Starting video upload process...');
    console.log('Current videoUrl:', videoUrl);
    console.log('Current videoUrlRef.current:', videoUrlRef.current);
    
    const currentVideoUrl = videoUrlRef.current || videoUrl;
    
    if (!currentVideoUrl) {
      throw new Error('Video URL not available');
    }

    console.log('Video URL ready:', currentVideoUrl);

    try {
      // Convert video URL to File
      const response = await fetch(currentVideoUrl);
      const blob = await response.blob();
      
      // Determine file extension based on blob type
      const fileExtension = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const fileName = `recording.${fileExtension}`;
      
      const file = new File([blob], fileName, { type: blob.type });

      console.log('Video file created, size:', file.size);

      // Upload to Supabase
      const { url, filename } = await uploadVideo(file);

      // Send recording ready event
      const recordingReady: RecordingReadyEvent = {
        videoUrl: url,
        filename,
        deviceId,
        timestamp: Date.now(),
      };

      sendRecordingReady(recordingReady);
      setStatus('Video yüklendi!');
      setIsUploading(false);

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

      {countdown !== null && countdown > 0 && (
        <div className="countdown">
          {countdown}
        </div>
      )}

      {!isConnected && (
        <div className="loading"></div>
      )}

      {isRecording && (
        <div className="video-container">
          <video 
            ref={(video) => {
              if (video && streamRef.current) {
                console.log('Setting video srcObject:', streamRef.current);
                video.srcObject = streamRef.current;
                video.play().catch(err => console.error('Video play error:', err));
              }
            }}
            autoPlay 
            muted 
            playsInline 
            style={{ width: '100%', height: 'auto', backgroundColor: '#000' }}
          />
          <div className="recording-indicator">
            ● KAYIT
          </div>
        </div>
      )}

      {videoUrl && !isRecording && (
        <div className="video-preview-container">
          <h3 style={{ marginBottom: '1rem', color: '#2d3748' }}>📹 Kayıt Önizlemesi</h3>
          <video 
            src={videoUrl} 
            controls 
            className="video-preview"
            style={{ 
              width: '100%', 
              maxWidth: '400px', 
              borderRadius: '12px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
            }}
          />
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

export default PhoneInterface;
