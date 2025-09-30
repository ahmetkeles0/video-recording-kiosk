import { Router } from 'express';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';
import { UploadResponse } from '../types';

const router = Router();

// Upload video to Supabase Storage
router.post('/upload', async (req, res) => {
  try {
    const { videoBlob, filename, deviceId } = req.body;

    if (!videoBlob || !filename || !deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: videoBlob, filename, deviceId',
      } as UploadResponse);
    }

    // Generate unique filename
    const uniqueFilename = `${uuidv4()}_${filename}`;
    const filePath = `videos/${uniqueFilename}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(videoBlob, 'base64');

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('video-kiosk')
      .upload(filePath, buffer, {
        contentType: 'video/webm',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({
        success: false,
        error: `Upload failed: ${error.message}`,
      } as UploadResponse);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('video-kiosk')
      .getPublicUrl(filePath);

    const videoUrl = urlData.publicUrl;

    console.log(`Video uploaded successfully: ${videoUrl}`);

    res.json({
      success: true,
      videoUrl,
      filename: uniqueFilename,
    } as UploadResponse);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as UploadResponse);
  }
});

// Get video metadata
router.get('/video/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = `videos/${filename}`;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('video-kiosk')
      .getPublicUrl(filePath);

    res.json({
      success: true,
      videoUrl: urlData.publicUrl,
      filename,
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get video',
    });
  }
});

export default router;
