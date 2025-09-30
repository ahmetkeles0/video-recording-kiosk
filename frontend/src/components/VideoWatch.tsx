import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const VideoWatch: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      // Check if Web Share API is available and can share URLs
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // For iOS Safari, try to trigger the share sheet with a direct link
        if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
          // Create a temporary link and trigger download/share
          const link = document.createElement('a');
          link.href = videoUrl;
          link.download = `video-kiosk-${Date.now()}.webm`;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(videoUrl);
          alert('Video URL kopyalandı!');
        }
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

  const handleDownload = async () => {
    if (!videoUrl) return;
    
    try {
      // Fetch the video with proper headers
      const response = await fetch(videoUrl, {
        method: 'GET',
        headers: {
          'Accept': 'video/*',
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `video-kiosk-${Date.now()}.webm`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: direct link
      window.open(videoUrl, '_blank');
    }
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
        <p>Video URL bulunuyor...</p>
      </div>
    );
  }

  if (isLoading) {
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
        crossOrigin="anonymous"
        className="video-preview"
        style={{ width: '100%', maxWidth: '400px' }}
        onError={(e) => {
          console.error('Video load error:', e);
          setError('Video yüklenirken hata oluştu. Lütfen tekrar deneyin.');
          setIsLoading(false);
        }}
        onLoadStart={() => {
          console.log('Video loading started');
          setIsLoading(true);
        }}
        onCanPlay={() => {
          console.log('Video can play');
          setIsLoading(false);
        }}
        preload="metadata"
      />

      <div style={{ marginTop: '1rem' }}>
        <button 
          className="share-button" 
          onClick={handleShare}
        >
          📤 Paylaş
        </button>
        
        <button 
          className="download-button" 
          onClick={handleDownload}
        >
          💾 İndir
        </button>
      </div>

      <div className="status" style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
        <strong>Video URL:</strong><br />
        <small style={{ wordBreak: 'break-all' }}>
          {videoUrl}
        </small>
        <br /><br />
        <strong>Debug Info:</strong><br />
        <small>
          User Agent: {navigator.userAgent.includes('iPhone') ? 'iPhone' : navigator.userAgent.includes('iPad') ? 'iPad' : 'Other'}<br />
          Share API: {typeof navigator.share === 'function' ? 'Available' : 'Not Available'}<br />
          Clipboard API: {navigator.clipboard ? 'Available' : 'Not Available'}
        </small>
      </div>
    </div>
  );
};

export default VideoWatch;
