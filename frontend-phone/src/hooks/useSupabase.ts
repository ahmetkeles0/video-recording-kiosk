import { createClient } from '@supabase/supabase-js';

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
  
  // Send debug info to backend
  try {
    await fetch(`${BACKEND_URL}/api/debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'UPLOAD_START',
        deviceId,
        data: debugInfo,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    // Ignore debug logging errors
  }
  
  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  
  const base64Info = {
    base64Size: base64String.length,
    originalSize: file.size,
    compressionRatio: Math.round((base64String.length / file.size) * 100) / 100
  };
  
  // Send base64 conversion debug info to backend
  try {
    await fetch(`${BACKEND_URL}/api/debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'BASE64_CONVERSION',
        deviceId,
        data: base64Info,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    // Ignore debug logging errors
  }
  
  const response = await fetch(`${BACKEND_URL}/api/upload`, {
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
