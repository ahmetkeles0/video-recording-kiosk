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
      
      // Check if permissions are already granted
      try {
        const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const audioPermissions = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        
        // Send permission debug info to backend
        const sendDebugInfo = async (type: string, data: any) => {
          const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
          try {
            await fetch(`${BACKEND_URL}/api/debug`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type,
                deviceId: 'video-recorder',
                data,
                timestamp: new Date().toISOString()
              })
            });
          } catch (e) {
            // Ignore debug logging errors
          }
        };

        sendDebugInfo('CAMERA_PERMISSION_STATUS', { state: permissions.state });
        sendDebugInfo('MICROPHONE_PERMISSION_STATUS', { state: audioPermissions.state });
      } catch (permError) {
        // Send debug info to backend
        const sendDebugInfo = async (type: string, data: any) => {
          const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
          try {
            await fetch(`${BACKEND_URL}/api/debug`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type,
                deviceId: 'video-recorder',
                data,
                timestamp: new Date().toISOString()
              })
            });
          } catch (e) {
            // Ignore debug logging errors
          }
        };

        sendDebugInfo('PERMISSION_QUERY_NOT_SUPPORTED', { error: permError instanceof Error ? permError.message : 'Unknown error' });
      }
      
      // Request camera and microphone access with more specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 }
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
        // Send debug info to backend
        const sendDebugInfo = async (type: string, data: any) => {
          const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
          try {
            await fetch(`${BACKEND_URL}/api/debug`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type,
                deviceId: 'video-recorder',
                data,
                timestamp: new Date().toISOString()
              })
            });
          } catch (e) {
            // Ignore debug logging errors
          }
        };

        sendDebugInfo('MEDIA_RECORDER_ONSTOP_TRIGGERED', { chunks: chunks.length });
        const blob = new Blob(chunks, { type: 'video/webm' });
        sendDebugInfo('VIDEO_BLOB_CREATED', { blobSize: blob.size, chunks: chunks.length });
        setRecordedChunks(chunks);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecording(false);
        setIsPaused(false);
        sendDebugInfo('RECORDING_STOPPED_VIDEO_URL_SET', { url, blobSize: blob.size });
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
        if (err.name === 'NotAllowedError') {
          setError('Camera/microphone access denied. Please allow permissions and refresh the page.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera/microphone found. Please check your device.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera/microphone is already in use by another application.');
        } else {
          setError(`Camera/microphone error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera/microphone. Please check permissions.');
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    // Send debug info to backend
    const sendDebugInfo = async (type: string, data: any) => {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      try {
        await fetch(`${BACKEND_URL}/api/debug`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            deviceId: 'video-recorder',
            data,
            timestamp: new Date().toISOString()
          })
        });
      } catch (e) {
        // Ignore debug logging errors
      }
    };

    sendDebugInfo('STOP_RECORDING_CALLED', { isRecording, hasMediaRecorder: !!mediaRecorderRef.current });
    if (mediaRecorderRef.current && isRecording) {
      sendDebugInfo('STOPPING_MEDIA_RECORDER', { isRecording });
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
