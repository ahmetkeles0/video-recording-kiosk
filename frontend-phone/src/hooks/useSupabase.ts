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
  
  console.log('Upload starting:', debugInfo);
  
  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  
  const base64Info = {
    base64Size: base64String.length,
    originalSize: file.size,
    compressionRatio: Math.round((base64String.length / file.size) * 100) / 100
  };
  
  console.log('Base64 conversion complete:', base64Info);
  
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
    console.error('Upload response not ok:', errorDetails);
    
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: 'Could not parse error response' };
    }
    
    console.error('Upload error data:', errorData);
    throw new Error(`Upload failed: ${errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();
  console.log('Upload response data:', data);
  
  if (!data.success) {
    console.error('Upload not successful:', data);
    throw new Error(`Upload failed: ${data.error || 'Unknown error'}`);
  }

  return {
    url: data.videoUrl,
    filename: data.filename,
  };
};
