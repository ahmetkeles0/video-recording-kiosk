import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const WatchVideo: React.FC = () => {
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

    const shareData = {
      title: 'Video Kiosk Kaydı',
      text: 'Video Kiosk ile kaydedilen videoyu izleyin',
      url: videoUrl,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(videoUrl);
        alert('Video URL kopyalandı!');
      }
    } catch (err) {
      console.error('Share error:', err);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(videoUrl);
        alert('Video URL kopyalandı!');
      } catch (clipboardErr) {
        console.error('Clipboard error:', clipboardErr);
        alert('Paylaşım desteklenmiyor. URL: ' + videoUrl);
      }
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `video-kiosk-${Date.now()}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (error) {
    return (
      <div className="card">
        <h1 className="title">Hata</h1>
        <div className="error">
          {error}
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

  if (!videoUrl) {
    return (
      <div className="card">
        <div className="loading"></div>
        <p>Video yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="title">🎬 Video İzle</h1>
      <p className="subtitle">Video Kiosk Kaydı</p>
      
      <video 
        src={videoUrl} 
        controls 
        className="video-preview"
        style={{ width: '100%', maxWidth: '400px' }}
      />

      <div style={{ marginTop: '1rem' }}>
        <button 
          className="share-button" 
          onClick={handleShare}
        >
          📤 Paylaş
        </button>
        
        <a 
          href={videoUrl} 
          download={`video-kiosk-${Date.now()}.webm`}
          className="download-link"
        >
          💾 İndir
        </a>
      </div>

      <div className="status" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        <strong>Video URL:</strong><br />
        <small style={{ wordBreak: 'break-all' }}>
          {videoUrl}
        </small>
      </div>
    </div>
  );
};

export default WatchVideo;
