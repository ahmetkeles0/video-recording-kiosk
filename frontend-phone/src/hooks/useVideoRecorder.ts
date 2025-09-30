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
      
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });

      streamRef.current = stream;

      // Start canvas compositing with logo
      const compositeStream = await startCompositing(stream);

      // Create MediaRecorder with composite stream (includes logo)
      const mediaRecorder = new MediaRecorder(compositeStream, {
        mimeType: 'video/webm;codecs=vp8,opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedChunks(chunks);
        setVideoUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        setIsPaused(false);
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
      setError('Failed to access camera/microphone. Please check permissions.');
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
    canvasRef,
  };
};
