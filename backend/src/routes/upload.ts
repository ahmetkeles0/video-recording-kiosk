import { Router } from 'express';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';
import { UploadResponse } from '../types';

// Enhanced logging utility
const logger = {
  info: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [UPLOAD-INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [UPLOAD-ERROR] ${message}`, error ? JSON.stringify(error, null, 2) : '');
  },
  warn: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [UPLOAD-WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  debug: (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [UPLOAD-DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
};

const router = Router();

// Upload video to Supabase Storage
router.post('/upload', async (req, res) => {
  const startTime = Date.now();
  const requestId = uuidv4();
  
  logger.info('📥 UPLOAD REQUEST RECEIVED', {
    requestId,
    deviceId: req.body?.deviceId,
    filename: req.body?.filename,
    videoBlobSize: req.body?.videoBlob?.length || 0,
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    debugInfo: req.body?.debugInfo,
    base64Info: req.body?.base64Info,
    timestamp: new Date().toISOString()
  });

  try {
    const { videoBlob, filename, deviceId } = req.body;

    if (!videoBlob || !filename || !deviceId) {
      logger.warn('❌ MISSING REQUIRED FIELDS', {
        requestId,
        hasVideoBlob: !!videoBlob,
        hasFilename: !!filename,
        hasDeviceId: !!deviceId,
        videoBlobSize: videoBlob?.length || 0,
        requestBody: req.body,
        timestamp: new Date().toISOString()
      });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: videoBlob, filename, deviceId',
      } as UploadResponse);
    }

    // Generate unique filename
    const uniqueFilename = `${uuidv4()}_${filename}`;
    const filePath = `videos/${uniqueFilename}`;

    logger.info('🔄 PROCESSING VIDEO UPLOAD', {
      requestId,
      deviceId,
      originalFilename: filename,
      uniqueFilename,
      filePath,
      videoBlobSize: videoBlob.length,
      estimatedSizeMB: Math.round(videoBlob.length / 1024 / 1024 * 100) / 100,
      timestamp: new Date().toISOString()
    });

    // Convert base64 to buffer
    const buffer = Buffer.from(videoBlob, 'base64');
    
    logger.info('📦 BUFFER CONVERSION COMPLETED', {
      requestId,
      bufferSize: buffer.length,
      bufferSizeMB: Math.round(buffer.length / 1024 / 1024 * 100) / 100,
      timestamp: new Date().toISOString()
    });

    // Upload to Supabase Storage
    logger.info('☁️ STARTING SUPABASE UPLOAD', {
      requestId,
      filePath,
      bufferSize: buffer.length,
      contentType: 'video/webm',
      timestamp: new Date().toISOString()
    });

    const uploadStartTime = Date.now();
    const { data, error } = await supabase.storage
      .from('video-kiosk')
      .upload(filePath, buffer, {
        contentType: 'video/webm',
        upsert: false,
      });

    const uploadDuration = Date.now() - uploadStartTime;

    if (error) {
      logger.error('❌ SUPABASE UPLOAD FAILED', {
        requestId,
        error: error.message,
        uploadDuration,
        filePath,
        bufferSize: buffer.length,
        timestamp: new Date().toISOString()
      });
      return res.status(500).json({
        success: false,
        error: `Upload failed: ${error.message}`,
      } as UploadResponse);
    }

    logger.info('✅ SUPABASE UPLOAD SUCCESSFUL', {
      requestId,
      uploadDuration,
      supabaseData: data,
      filePath,
      timestamp: new Date().toISOString()
    });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('video-kiosk')
      .getPublicUrl(filePath);

    const videoUrl = urlData.publicUrl;

    const totalDuration = Date.now() - startTime;

    logger.info('🎉 VIDEO UPLOAD COMPLETED SUCCESSFULLY', {
      requestId,
      videoUrl,
      filename: uniqueFilename,
      totalDuration,
      uploadDuration,
      fileSize: buffer.length,
      fileSizeMB: Math.round(buffer.length / 1024 / 1024 * 100) / 100,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      videoUrl,
      filename: uniqueFilename,
    } as UploadResponse);
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error('💥 UPLOAD PROCESS FAILED', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      totalDuration,
      deviceId: req.body?.deviceId,
      filename: req.body?.filename,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as UploadResponse);
  }
});

// Get video metadata
router.get('/video/:filename', async (req, res) => {
  const requestId = uuidv4();
  
  logger.info('Get video request received', {
    requestId,
    filename: req.params.filename,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const { filename } = req.params;
    const filePath = `videos/${filename}`;

    logger.debug('Getting video URL from Supabase', {
      requestId,
      filename,
      filePath
    });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('video-kiosk')
      .getPublicUrl(filePath);

    logger.info('Video URL retrieved successfully', {
      requestId,
      filename,
      videoUrl: urlData.publicUrl
    });

    res.json({
      success: true,
      videoUrl: urlData.publicUrl,
      filename,
    });
  } catch (error) {
    logger.error('Get video failed', {
      requestId,
      filename: req.params.filename,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get video',
    });
  }
});

// Debug endpoint for frontend logging
router.post('/debug', async (req, res) => {
  const { type, deviceId, data, timestamp } = req.body;
  
  logger.info(`🔍 FRONTEND DEBUG: ${type}`, {
    deviceId,
    data,
    timestamp,
    receivedAt: new Date().toISOString()
  });
  
  res.json({ success: true });
});

export default router;
