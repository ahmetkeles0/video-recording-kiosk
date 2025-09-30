import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hifdnjclwrkpxqmcnkya.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhpZmRuamNsd3JrcHhxbWNua3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNTIwODMsImV4cCI6MjA3NDcyODA4M30.WsSKUGEMFukrrqKlkaiYqSyYFNrmrsgP_S2UAq1ymt0';

console.log('Environment variables:', {
  supabaseUrl,
  supabaseAnonKey,
  allEnv: import.meta.env
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadVideo = async (file: File): Promise<{ url: string; filename: string }> => {
  const timestamp = Date.now();
  const filename = `video_${timestamp}.webm`;
  const filePath = `videos/${filename}`;

  const { error } = await supabase.storage
    .from('video-kiosk')
    .upload(filePath, file, {
      contentType: 'video/webm',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('video-kiosk')
    .getPublicUrl(filePath);

  return {
    url: urlData.publicUrl,
    filename,
  };
};
