import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadVideo = async (file: File, deviceId: string): Promise<{ url: string; filename: string }> => {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  
  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  
  const response = await fetch(`${BACKEND_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      videoBlob: base64String,
      filename: file.name,
      deviceId: deviceId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Upload failed: ${errorData.error || 'Unknown error'}`);
  }

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(`Upload failed: ${data.error || 'Unknown error'}`);
  }

  return {
    url: data.videoUrl,
    filename: data.filename,
  };
};
