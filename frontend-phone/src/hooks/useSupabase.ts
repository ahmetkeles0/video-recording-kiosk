import { createClient } from '@supabase/supabase-js';
import { withRetry, retryConditions } from '../utils/retryUtils';
import { sendDebugInfo } from '../utils/debugLogger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadVideo = async (file: File, deviceId: string): Promise<{ url: string; filename: string }> => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  
  const debugInfo = {
    backendUrl: BACKEND_URL,
    fileName: file.name,
    fileSize: file.size,
    deviceId: deviceId,
    timestamp: new Date().toISOString()
  };
  
  // Send debug info to backend using optimized logger
  await sendDebugInfo('UPLOAD_START', deviceId, debugInfo);
  
  // Convert file to base64 using a more memory-efficient approach
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  let binaryString = '';
  const chunkSize = 8192; // Process in chunks to avoid stack overflow
  
  // Use a more memory-efficient approach for very large files
  if (uint8Array.length > 50 * 1024 * 1024) { // 50MB threshold
    // For very large files, use a different approach
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        // Continue with upload...
        try {
          const response = await fetch(`${BACKEND_URL}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              videoBlob: base64String,
              filename: file.name,
              deviceId: deviceId,
              debugInfo: debugInfo,
              base64Info: { base64Size: base64String.length, originalSize: file.size }
            }),
          });
          // Handle response...
          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }
          const data = await response.json();
          resolve({ url: data.videoUrl, filename: data.filename });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  // For smaller files, use chunked processing
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, i + chunkSize);
    binaryString += String.fromCharCode(...chunk);
  }
  
  const base64String = btoa(binaryString);
  
  const base64Info = {
    base64Size: base64String.length,
    originalSize: file.size,
    compressionRatio: Math.round((base64String.length / file.size) * 100) / 100
  };
  
  // Send base64 conversion debug info to backend
  await sendDebugInfo('BASE64_CONVERSION', deviceId, base64Info);
  
  const response = await withRetry(
    async () => {
      return await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoBlob: base64String,
          filename: file.name,
          deviceId: deviceId,
          debugInfo: debugInfo,
          base64Info: base64Info
        }),
      });
    },
    {
      maxAttempts: 3,
      baseDelay: 1000,
      retryCondition: retryConditions.uploadError
    }
  );

  if (!response.ok) {
    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    };
    
    // Send error debug info to backend
    try {
      await fetch(`${BACKEND_URL}/api/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UPLOAD_ERROR',
          deviceId,
          data: errorDetails,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      // Ignore debug logging errors
    }
    
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: 'Could not parse error response' };
    }
    
    // Send error data to backend
    try {
      await fetch(`${BACKEND_URL}/api/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UPLOAD_ERROR_DATA',
          deviceId,
          data: errorData,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      // Ignore debug logging errors
    }
    
    throw new Error(`Upload failed: ${errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();
  
  // Send success debug info to backend
  try {
    await fetch(`${BACKEND_URL}/api/debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'UPLOAD_SUCCESS',
        deviceId,
        data: data,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    // Ignore debug logging errors
  }
  
  if (!data.success) {
    // Send failure debug info to backend
    try {
      await fetch(`${BACKEND_URL}/api/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'UPLOAD_FAILED',
          deviceId,
          data: data,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      // Ignore debug logging errors
    }
    
    throw new Error(`Upload failed: ${data.error || 'Unknown error'}`);
  }

  return {
    url: data.videoUrl,
    filename: data.filename,
  };
};
