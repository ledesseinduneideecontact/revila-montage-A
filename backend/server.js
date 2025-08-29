const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');

// Configuration FFmpeg - sur Railway, FFmpeg sera dans le PATH
if (process.platform === 'win32') {
  // Configuration Windows locale (pour dev)
  const ffmpegPath = 'C:\\ffmpeg\\bin\\ffmpeg.exe';
  const ffprobePath = 'C:\\ffmpeg\\bin\\ffprobe.exe';
  try {
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
    console.log('FFmpeg paths set for Windows');
  } catch (error) {
    console.error('Error setting FFmpeg paths:', error);
  }
} else {
  // Sur Railway/Linux, FFmpeg est dans le PATH
  console.log('Using system FFmpeg');
}
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://patient-education-production-7b56.up.railway.app',
  'https://patient-education-production.up.railway.app',
  'https://revila-montage-frontend-b.up.railway.app',
  process.env.FRONTEND_URL // URL du frontend sur Railway
].filter(Boolean);

console.log('🌐 CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log('✅ CORS allowed (explicit):', origin);
      return callback(null, true);
    }
    
    // Check if origin matches Railway pattern
    if (origin.match(/^https:\/\/.*\.up\.railway\.app$/)) {
      console.log('✅ CORS allowed (Railway pattern):', origin);
      return callback(null, true);
    }
    
    console.log('❌ CORS blocked origin:', origin);
    return callback(new Error('CORS policy violation'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

// Créer les dossiers nécessaires
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');

async function ensureDirectories() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

ensureDirectories();

// Configuration multer pour l'upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// Test endpoint for CORS
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint called from:', req.headers.origin);
  res.json({ 
    status: 'success',
    message: 'Test endpoint working',
    origin: req.headers.origin || 'no origin',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/test', (req, res) => {
  console.log('🧪 Test POST endpoint called from:', req.headers.origin);
  res.json({ 
    status: 'success',
    message: 'Test POST endpoint working',
    data: req.body,
    origin: req.headers.origin || 'no origin',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de test
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check requested from:', req.headers.origin);
  res.json({ status: 'OK', message: 'Video editor backend is running' });
});

// Endpoint pour vérifier si FFmpeg est installé
app.get('/api/ffmpeg-status', (req, res) => {
  ffmpeg.getAvailableFormats((err, formats) => {
    if (err) {
      return res.json({ 
        available: false, 
        error: 'FFmpeg not found. Please install FFmpeg on your system.' 
      });
    }
    res.json({ 
      available: true, 
      message: 'FFmpeg is available',
      formats: Object.keys(formats).slice(0, 10) // Retourner quelques formats supportés
    });
  });
});

// Endpoint pour uploader les fichiers média
app.post('/api/upload', upload.array('media', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const fileInfos = req.files.map(file => ({
      id: crypto.randomBytes(8).toString('hex'),
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.json({ 
      success: true, 
      files: fileInfos 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Test endpoint to verify route registration
app.get('/api/test-route', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Endpoint de test simple sans FFmpeg
console.log('Registering /api/simple-export endpoint');
app.post('/api/simple-export', upload.array('files'), async (req, res) => {
  console.log('Simple export endpoint called');
  try {
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Pour l'instant, juste retourner le premier fichier
    const firstFile = files[0];
    
    // Nettoyer les autres fichiers
    for (let i = 1; i < files.length; i++) {
      try {
        await fs.unlink(files[i].path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }
    
    // Retourner le fichier
    res.download(firstFile.path, firstFile.originalname, async (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Nettoyer après téléchargement
      setTimeout(async () => {
        try {
          await fs.unlink(firstFile.path);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }, 5000);
    });
  } catch (error) {
    console.error('Simple export error:', error);
    res.status(500).json({ error: 'Simple export failed', details: error.message });
  }
});

// Endpoint pour traiter et exporter la vidéo
app.post('/api/export', upload.array('files'), async (req, res) => {
  let commandStarted = false;
  try {
    const { timeline, audioSettings, exportSettings } = req.body;
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const outputFilename = `export-${Date.now()}.${exportSettings?.format || 'mp4'}`;
    const outputPath = path.join(outputDir, outputFilename);

    // Parse les données JSON si elles sont en string
    const timelineData = typeof timeline === 'string' ? JSON.parse(timeline) : timeline;
    const audioData = typeof audioSettings === 'string' ? JSON.parse(audioSettings) : audioSettings;
    const exportData = typeof exportSettings === 'string' ? JSON.parse(exportSettings) : exportSettings;

    // Créer la commande FFmpeg de manière sécurisée
    let command;
    try {
      command = ffmpeg();
    } catch (ffmpegError) {
      console.error('Failed to create FFmpeg command:', ffmpegError);
      return res.status(500).json({ error: 'FFmpeg not available', details: ffmpegError.message });
    }

    // Ajouter les fichiers d'entrée
    const mediaFiles = files.filter(f => !f.mimetype.startsWith('audio/'));
    const audioFile = files.find(f => f.mimetype.startsWith('audio/'));

    if (mediaFiles.length === 0) {
      return res.status(400).json({ error: 'No media files to process' });
    }

    // Pour simplifier, on va concat les vidéos/images
    if (mediaFiles.length === 1 && mediaFiles[0].mimetype.startsWith('image/')) {
      // Si c'est une seule image, créer une vidéo à partir de l'image
      command
        .input(mediaFiles[0].path)
        .loop(exportData?.duration || 3)
        .fps(30);
    } else {
      // Ajouter chaque fichier média
      mediaFiles.forEach(file => {
        command.input(file.path);
      });
    }

    // Ajouter l'audio si présent
    if (audioFile) {
      command.input(audioFile.path);
    }

    // Configuration de sortie
    const width = exportData?.resolution?.width || 1280;
    const height = exportData?.resolution?.height || 720;
    
    command
      .size(`${width}x${height}`)
      .videoCodec('libx264')
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-pix_fmt yuv420p'
      ]);

    if (audioFile) {
      command
        .audioCodec('aac')
        .audioBitrate('128k');
    } else {
      command.noAudio();
    }

    command.output(outputPath);

    // Events
    command.on('start', (commandLine) => {
      console.log('FFmpeg process started:', commandLine);
    });

    command.on('progress', (progress) => {
      console.log('Processing: ' + progress.percent + '% done');
      // On pourrait envoyer la progression via WebSocket
    });

    command.on('error', (err) => {
      console.error('FFmpeg error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Video processing failed', details: err.message });
      }
    });

    command.on('end', async () => {
      console.log('Video processing completed');
      
      // Nettoyer les fichiers uploadés
      for (const file of files) {
        try {
          await fs.unlink(file.path);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }

      // Envoyer le fichier au client
      res.download(outputPath, outputFilename, async (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Nettoyer le fichier de sortie après téléchargement
        setTimeout(async () => {
          try {
            await fs.unlink(outputPath);
          } catch (err) {
            console.error('Error deleting output file:', err);
          }
        }, 5000);
      });
    });

    // Lancer le traitement
    try {
      commandStarted = true;
      command.run();
    } catch (runError) {
      console.error('Failed to run FFmpeg command:', runError);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Failed to start video processing', details: runError.message });
      }
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed', details: error.message });
  }
});

// Endpoint simple pour combiner des fichiers
app.post('/api/combine', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const outputFilename = `output-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFilename);

    let command;
    try {
      command = ffmpeg();
    } catch (ffmpegError) {
      console.error('Failed to create FFmpeg command in combine:', ffmpegError);
      return res.status(500).json({ error: 'FFmpeg not available', details: ffmpegError.message });
    }

    // Si c'est une image, créer une vidéo de 3 secondes
    if (files[0].mimetype.startsWith('image/')) {
      command
        .input(files[0].path)
        .inputOptions(['-loop 1', '-t 3'])
        .fps(30)
        .size('1280x720')
        .videoCodec('libx264')
        .outputOptions(['-pix_fmt yuv420p'])
        .noAudio()
        .output(outputPath);
    } else {
      // Si c'est une vidéo, la traiter simplement
      command
        .input(files[0].path)
        .size('1280x720')
        .videoCodec('libx264')
        .outputOptions(['-preset fast', '-crf 23'])
        .output(outputPath);
    }

    command.on('end', async () => {
      console.log('Processing completed');
      
      // Nettoyer les fichiers uploadés
      for (const file of files) {
        try {
          await fs.unlink(file.path);
        } catch (err) {
          console.error('Error deleting file:', err);
        }
      }

      // Envoyer le fichier
      res.download(outputPath, outputFilename, async (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        setTimeout(async () => {
          try {
            await fs.unlink(outputPath);
          } catch (err) {
            console.error('Error deleting output:', err);
          }
        }, 5000);
      });
    });

    command.on('error', (err) => {
      console.error('FFmpeg error:', err);
      res.status(500).json({ error: 'Processing failed', details: err.message });
    });

    command.run();

  } catch (error) {
    console.error('Combine error:', error);
    res.status(500).json({ error: 'Combine failed', details: error.message });
  }
});

// Nettoyer les anciens fichiers (optionnel)
async function cleanOldFiles() {
  try {
    const files = await fs.readdir(outputDir);
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 heure

    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const stats = await fs.stat(filePath);
      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        console.log('Deleted old file:', file);
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Nettoyer les vieux fichiers toutes les heures
setInterval(cleanOldFiles, 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Video editor backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`FFmpeg status: http://localhost:${PORT}/api/ffmpeg-status`);
});