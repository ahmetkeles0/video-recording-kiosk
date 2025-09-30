import { useRef, useCallback } from 'react';

interface UseCanvasCompositingReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  compositeStream: MediaStream | null;
  startCompositing: (videoStream: MediaStream) => Promise<MediaStream>;
  stopCompositing: () => void;
}

export const useCanvasCompositing = (): UseCanvasCompositingReturn => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const compositeStreamRef = useRef<MediaStream | null>(null);

  const loadLogo = useCallback((): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (logoImageRef.current && logoImageRef.current.complete && logoImageRef.current.naturalWidth > 0) {
        resolve(logoImageRef.current);
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('Logo loaded successfully');
        logoImageRef.current = img;
        resolve(img);
      };
      img.onerror = (error) => {
        console.error('Logo load error:', error);
        reject(error);
      };
      img.src = '/overlay-logo.png';
    });
  }, []);

  const drawFrame = useCallback(async () => {
    const canvas = canvasRef.current;
    const video = videoElementRef.current;
    
    if (!canvas || !video) return;

    // Check if video is ready and has dimensions
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      // Video not ready yet, try again next frame
      animationFrameRef.current = requestAnimationFrame(drawFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw logo
    if (logoImageRef.current && logoImageRef.current.complete && logoImageRef.current.naturalWidth > 0) {
      const logo = logoImageRef.current;
      const logoWidth = Math.min(200, canvas.width * 0.25);
      const logoHeight = (logo.height / logo.width) * logoWidth;
      
      const logoX = (canvas.width - logoWidth) / 2;
      const logoY = 20;

      // Add shadow for better visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      // Try to load logo if not already loaded
      if (!logoImageRef.current) {
        loadLogo().catch(error => {
          console.error('Error loading logo:', error);
        });
      }
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(drawFrame);
  }, [loadLogo]);

  const startCompositing = useCallback(async (videoStream: MediaStream): Promise<MediaStream> => {
    // Wait for canvas to be available
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while (!canvasRef.current && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) {
      throw new Error('Canvas not available after waiting');
    }

    // Create video element to play the stream
    const video = document.createElement('video');
    video.srcObject = videoStream;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    
    videoElementRef.current = video;

    // Pre-load logo
    await loadLogo().catch(error => {
      console.error('Error pre-loading logo:', error);
    });

    // Wait for video to be ready and playing
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Wait for video to start playing
        video.oncanplay = () => {
          video.play().then(() => {
            resolve(void 0);
          }).catch(err => {
            console.error('Video play error:', err);
            resolve(void 0);
          });
        };
      };
    });

    // Start drawing loop
    drawFrame();

    // Get canvas stream
    const canvasStream = canvas.captureStream(30); // 30 FPS
    compositeStreamRef.current = canvasStream;

    return canvasStream;
  }, [drawFrame]);

  const stopCompositing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
      videoElementRef.current = null;
    }

    if (compositeStreamRef.current) {
      compositeStreamRef.current.getTracks().forEach(track => track.stop());
      compositeStreamRef.current = null;
    }
  }, []);

  return {
    canvasRef,
    compositeStream: compositeStreamRef.current,
    startCompositing,
    stopCompositing,
  };
};
