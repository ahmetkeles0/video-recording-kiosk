import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { RecordingReadyEvent } from '../types';
import QRCode from 'qrcode.react';

const TabletInterface: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isConnected, 
    error, 
    registerDevice, 
    startRecording, 
    onVideoUploaded, 
    onDeviceRegistered,
    onError 
  } = useSocket();
  
  const [isRegistered, setIsRegistered] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [deviceId] = useState(() => `tablet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [status, setStatus] = useState('Bağlanıyor...');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && !isRegistered) {
      registerDevice('tablet', deviceId);
      setStatus('Cihaz kaydediliyor...');
    }
  }, [isConnected, isRegistered, deviceId, registerDevice]);

  useEffect(() => {
    const cleanup = onDeviceRegistered((data) => {
      if (data.success) {
        setIsRegistered(true);
        setStatus('Hazır - Kayıt başlatabilirsiniz');
      } else {
        setStatus('Cihaz kaydı başarısız');
      }
    });

    return cleanup;
  }, [onDeviceRegistered]);

  useEffect(() => {
    const cleanup = onVideoUploaded((data: RecordingReadyEvent) => {
      console.log('Video uploaded received:', data);
      setIsRecording(false);
      setStatus('Video hazır!');
      setVideoUrl(data.videoUrl);
    });

    return cleanup;
  }, [onVideoUploaded]);

  useEffect(() => {
    const cleanup = onError((data) => {
      setStatus(`Hata: ${data.message}`);
      setIsRecording(false);
    });

    return cleanup;
  }, [onError]);

  const handleStartRecording = () => {
    if (!isConnected || !isRegistered) return;
    
    setIsRecording(true);
    setStatus('Kayıt başlatılıyor...');
    setVideoUrl(null);
    startRecording(deviceId);
  };

  const handleNewRecording = () => {
    if (!isConnected || !isRegistered) return;
    
    // Reset all states
    setVideoUrl(null);
    setIsRecording(false);
    setStatus('Hazır - Kayıt başlatabilirsiniz');
    
    // Start new recording
    handleStartRecording();
  };

  const handleShowQR = () => {
    if (videoUrl) {
      const watchUrl = `${window.location.origin}/watch?url=${encodeURIComponent(videoUrl)}`;
      // Show QR code in a modal or navigate to QR page
      setStatus('QR kod gösteriliyor...');
    }
  };

  if (error) {
    return (
      <div className="card">
        <h1 className="title">📱 Video Kiosk</h1>
        <div className="error">
          Bağlantı hatası: {error}
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
      <p className="subtitle">iPad Kontrol Paneli</p>
      
      <div className={`status ${isRecording ? 'recording' : isRegistered ? 'ready' : ''}`}>
        {status}
      </div>

      {!isConnected && (
        <div className="loading"></div>
      )}

      {!videoUrl && (
        <button
          className="button"
          onClick={handleStartRecording}
          disabled={!isConnected || !isRegistered || isRecording}
        >
          {isRecording ? 'Kayıt Yapılıyor...' : '🎬 Kayıt Başlat'}
        </button>
      )}

      {isRecording && (
        <div className="status recording">
          <div className="loading"></div>
          <p>Telefon cihazında kayıt başlatıldı. 15 saniye sonra otomatik duracak...</p>
        </div>
      )}

      {videoUrl && (
        <div className="qr-container">
          <h2 className="qr-title">✅ Video Hazır!</h2>
          <p className="qr-instruction">
            Bu QR kodu telefonunuzla okutun veya aşağıdaki URL'yi kullanın
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <QRCode 
              value={`${window.location.origin}/watch?url=${encodeURIComponent(videoUrl)}`}
              size={256}
              level="M"
              includeMargin={true}
            />
          </div>
          
          <div className="status ready">
            <strong>Video URL:</strong><br />
            <small style={{ wordBreak: 'break-all' }}>
              {videoUrl}
            </small>
          </div>

          <div className="watch-url-container">
            <strong>Watch Sayfası URL:</strong>
            <small>
              {`${window.location.origin}/watch?url=${encodeURIComponent(videoUrl)}`}
            </small>
            <div style={{ marginTop: '0.5rem' }}>
              <button 
                className="button"
                onClick={() => {
                  const watchUrl = `${window.location.origin}/watch?url=${encodeURIComponent(videoUrl)}`;
                  navigator.clipboard.writeText(watchUrl).then(() => {
                    alert('Watch URL kopyalandı!');
                  }).catch(() => {
                    // Fallback: show URL in prompt
                    prompt('Watch URL (kopyalayın):', watchUrl);
                  });
                }}
                style={{ 
                  background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                  fontSize: '0.9rem',
                  padding: '8px 16px'
                }}
              >
                📋 URL'yi Kopyala
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              className="button" 
              onClick={handleNewRecording}
              style={{ 
                background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                minWidth: '150px'
              }}
            >
              🎬 Yeni Kayıt Başlat
            </button>
            <button 
              className="button" 
              onClick={() => {
                setVideoUrl(null);
                setStatus('Hazır - Kayıt başlatabilirsiniz');
              }}
              style={{ 
                background: 'linear-gradient(135deg, #4299e1 0%, #3182ce 100%)',
                minWidth: '150px'
              }}
            >
              🔄 Sadece Temizle
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabletInterface;
