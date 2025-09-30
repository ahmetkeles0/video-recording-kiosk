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

    // Generate a backend URL instead of direct Supabase URL
    // This ensures proper CORS and authentication handling
    const videoUrl = `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/video/${uniqueFilename}`;

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

// Stream video from Supabase Storage
router.get('/video/:filename', async (req, res) => {
  const requestId = uuidv4();
  
  logger.info('📹 VIDEO STREAM REQUEST', {
    requestId,
    filename: req.params.filename,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const { filename } = req.params;
    const filePath = `videos/${filename}`;

    logger.debug('🔍 FETCHING VIDEO FROM SUPABASE', {
      requestId,
      filename,
      filePath
    });

    // Download the file from Supabase Storage
    const { data, error } = await supabase.storage
      .from('video-kiosk')
      .download(filePath);

    if (error) {
      logger.error('❌ SUPABASE DOWNLOAD FAILED', {
        requestId,
        error: error.message,
        filename,
        filePath
      });
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    if (!data) {
      logger.error('❌ NO VIDEO DATA', {
        requestId,
        filename,
        filePath
      });
      return res.status(404).json({
        success: false,
        error: 'Video data not available'
      });
    }

    // Convert blob to buffer
    const buffer = await data.arrayBuffer();
    
    logger.info('✅ VIDEO STREAMING SUCCESSFUL', {
      requestId,
      filename,
      fileSize: buffer.byteLength,
      fileSizeMB: Math.round(buffer.byteLength / 1024 / 1024 * 100) / 100
    });

    // Set appropriate headers for video streaming
    res.setHeader('Content-Type', 'video/webm');
    res.setHeader('Content-Length', buffer.byteLength);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Range');

    // Handle range requests for video seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : buffer.byteLength - 1;
      const chunksize = (end - start) + 1;
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${buffer.byteLength}`);
      res.setHeader('Content-Length', chunksize);
      
      res.end(Buffer.from(buffer.slice(start, end + 1)));
    } else {
      res.end(Buffer.from(buffer));
    }

  } catch (error) {
    logger.error('💥 VIDEO STREAM ERROR', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      filename: req.params.filename
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to stream video'
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
