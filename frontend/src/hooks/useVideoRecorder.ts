import React, { useState, useRef, useCallback } from 'react';
import { useCanvasCompositing } from './useCanvasCompositing';

interface UseVideoRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  recordedChunks: Blob[];
  videoUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  clearRecording: () => void;
  error: string | null;
  streamRef: React.MutableRefObject<MediaStream | null>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export const useVideoRecorder = (): UseVideoRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { canvasRef, startCompositing, stopCompositing } = useCanvasCompositing();

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Check if camera is already in use
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('Available devices:', devices);
      
      // Request camera and microphone access with fallback options
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
      });

      streamRef.current = stream;

      // Start canvas compositing with logo
      const compositeStream = await startCompositing(stream);

      // Check supported MIME types - MP4 first for better compatibility
      const supportedTypes = [
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm'
      ];
      
      let mimeType = 'video/mp4'; // Default to MP4
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      console.log('Using MIME type:', mimeType);

      // Create MediaRecorder with composite stream (includes logo)
      const mediaRecorder = new MediaRecorder(compositeStream, {
        mimeType: mimeType,
      });

      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped, chunks:', chunks.length);
        
        // Ensure we have chunks before creating blob
        if (chunks.length === 0) {
          console.error('No video chunks available');
          setError('No video data recorded');
          setIsRecording(false);
          setIsPaused(false);
          return;
        }
        
        try {
          // Use the same MIME type as MediaRecorder
          const blob = new Blob(chunks, { type: mimeType });
          console.log('Video blob created, size:', blob.size, 'type:', mimeType);
          
          if (blob.size === 0) {
            console.error('Video blob is empty');
            setError('Video recording failed - empty file');
            setIsRecording(false);
            setIsPaused(false);
            return;
          }
          
          setRecordedChunks(chunks);
          const url = URL.createObjectURL(blob);
          console.log('Video URL created:', url);
          setVideoUrl(url);
          setIsRecording(false);
          setIsPaused(false);
        } catch (error) {
          console.error('Error creating video URL:', error);
          setError('Failed to create video file');
          setIsRecording(false);
          setIsPaused(false);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setIsRecording(false);
        setIsPaused(false);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordedChunks([]);
      setVideoUrl(null);

    } catch (err) {
      console.error('Error starting recording:', err);
      
      if (err instanceof DOMException) {
        if (err.name === 'NotReadableError') {
          setError('Kamera/mikrofon kullanımda. Lütfen diğer uygulamaları (Zoom, Teams, Skype, vb.) kapatın ve sayfayı yenileyin.');
        } else if (err.name === 'NotAllowedError') {
          setError('Kamera/mikrofon izni reddedildi. Lütfen tarayıcı ayarlarından izin verin ve sayfayı yenileyin.');
        } else if (err.name === 'NotFoundError') {
          setError('Kamera/mikrofon bulunamadı. Lütfen cihazınızda kamera olduğundan emin olun.');
        } else if (err.name === 'OverconstrainedError') {
          setError('Kamera ayarları desteklenmiyor. Lütfen farklı bir kamera deneyin.');
        } else {
          setError(`Kamera erişim hatası: ${err.message}`);
        }
      } else {
        setError('Kamera/mikrofon erişimi başarısız. Lütfen HTTPS kullandığınızdan emin olun.');
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    // Stop canvas compositing
    stopCompositing();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, [isRecording, stopCompositing]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isRecording, isPaused]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  }, [isRecording, isPaused]);

  const clearRecording = useCallback(() => {
    setRecordedChunks([]);
    setVideoUrl(null);
    setError(null);
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  return {
    isRecording,
    isPaused,
    recordedChunks,
    videoUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    error,
    streamRef,
    canvasRef,
  };
};
