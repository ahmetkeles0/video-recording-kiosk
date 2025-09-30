import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadVideo = async (file: File): Promise<{ url: string; filename: string }> => {
  const timestamp = Date.now();
  const filename = `video_${timestamp}.webm`;
  const filePath = `videos/${filename}`;

  const { data, error } = await supabase.storage
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
