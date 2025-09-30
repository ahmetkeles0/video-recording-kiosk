import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const SimpleVideoWatch: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = searchParams.get('url');
    if (url) {
      setVideoUrl(decodeURIComponent(url));
    } else {
      setError('Video URL bulunamadı');
    }
  }, [searchParams]);

  const handleShare = async () => {
    if (!videoUrl) return;

    try {
      // For iOS, create a download link to trigger share sheet
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `video-kiosk-${Date.now()}.webm`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Share error:', err);
      alert('Paylaşım hatası: ' + err);
    }
  };

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Hata</h1>
        <p>{error}</p>
        <button onClick={() => window.location.href = '/'}>
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Video URL bulunuyor...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
      <h1>🎬 Video İzle</h1>
      <p>Video Kiosk Kaydı</p>
      
      <video 
        src={videoUrl} 
        controls 
        style={{ width: '100%', maxWidth: '400px', marginBottom: '20px' }}
        onError={(e) => {
          console.error('Video load error:', e);
          setError('Video yüklenirken hata oluştu');
        }}
      />

      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={handleShare}
          style={{
            background: '#007AFF',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            margin: '0 10px',
            cursor: 'pointer'
          }}
        >
          📤 Paylaş / İndir
        </button>
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <strong>Video URL:</strong><br />
        <small style={{ wordBreak: 'break-all' }}>
          {videoUrl}
        </small>
      </div>
    </div>
  );
};

export default SimpleVideoWatch;
