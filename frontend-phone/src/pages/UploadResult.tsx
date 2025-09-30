import React from 'react';
import { useLocation } from 'react-router-dom';

const UploadResult: React.FC = () => {
  const location = useLocation();
  const { videoUrl, filename } = location.state || {};

  if (!videoUrl) {
    return (
      <div className="card">
        <h1 className="title">Hata</h1>
        <div className="error">
          Video bilgisi bulunamadı
        </div>
        <button 
          className="button" 
          onClick={() => window.location.href = '/'}
        >
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="title">✅ Video Yüklendi!</h1>
      <p className="subtitle">Video başarıyla Supabase'e yüklendi</p>
      
      <div className="status success">
        <strong>Dosya:</strong> {filename}<br />
        <strong>URL:</strong> <small style={{ wordBreak: 'break-all' }}>{videoUrl}</small>
      </div>

      <video 
        src={videoUrl} 
        controls 
        className="video-preview"
      />

      <button 
        className="button" 
        onClick={() => window.location.href = '/'}
      >
        🏠 Ana Sayfaya Dön
      </button>
    </div>
  );
};

export default UploadResult;
