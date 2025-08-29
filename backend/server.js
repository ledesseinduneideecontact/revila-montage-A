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

// Test FFmpeg simple - Génère un fichier audio de test
app.get('/api/test-ffmpeg-simple', async (req, res) => {
  console.log('🎵 Test FFmpeg simple requested');
  
  try {
    // Vérifier d'abord si FFmpeg est disponible
    const ffmpegAvailable = await new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          console.error('FFmpeg not available:', err.message);
          resolve(false);
        } else {
          console.log('FFmpeg is available with', Object.keys(formats).length, 'formats');
          resolve(true);
        }
      });
    });

    if (!ffmpegAvailable) {
      // Solution alternative : créer un fichier WAV simple sans FFmpeg
      console.log('Using fallback: Creating simple WAV file without FFmpeg');
      
      const outputFilename = `test-audio-${Date.now()}.wav`;
      const outputPath = path.join(outputDir, outputFilename);
      
      // Créer un fichier WAV simple (44 bytes header + silence)
      const sampleRate = 44100;
      const numChannels = 2;
      const bitsPerSample = 16;
      const duration = 1; // 1 seconde
      const numSamples = sampleRate * duration;
      const dataSize = numSamples * numChannels * (bitsPerSample / 8);
      
      // WAV header
      const buffer = Buffer.alloc(44 + dataSize);
      
      // RIFF header
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(36 + dataSize, 4);
      buffer.write('WAVE', 8);
      
      // fmt chunk
      buffer.write('fmt ', 12);
      buffer.writeUInt32LE(16, 16); // fmt chunk size
      buffer.writeUInt16LE(1, 20); // PCM format
      buffer.writeUInt16LE(numChannels, 22);
      buffer.writeUInt32LE(sampleRate, 24);
      buffer.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28); // byte rate
      buffer.writeUInt16LE(numChannels * bitsPerSample / 8, 32); // block align
      buffer.writeUInt16LE(bitsPerSample, 34);
      
      // data chunk
      buffer.write('data', 36);
      buffer.writeUInt32LE(dataSize, 40);
      
      // Les données audio (silence = zéros) sont déjà à 0 grâce à Buffer.alloc
      
      await fs.writeFile(outputPath, buffer);
      console.log('✅ Fallback WAV file created:', outputFilename);
      
      res.download(outputPath, outputFilename, (err) => {
        if (err) console.error('Download error:', err);
        setTimeout(async () => {
          try {
            await fs.unlink(outputPath);
            console.log('🧹 Cleaned test file:', outputFilename);
          } catch (e) {}
        }, 5000);
      });
      
      return;
    }
    
    // Si FFmpeg est disponible, utiliser la méthode normale
    const outputFilename = `test-audio-${Date.now()}.mp3`;
    const outputPath = path.join(outputDir, outputFilename);
    
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input('anullsrc=channel_layout=stereo:sample_rate=44100')
        .inputFormat('lavfi')
        .duration(1)
        .audioCodec('mp3')
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .on('start', cmd => console.log('FFmpeg command:', cmd))
        .run();
    });
    
    console.log('✅ Test audio generated with FFmpeg:', outputFilename);
    
    res.download(outputPath, outputFilename, (err) => {
      if (err) console.error('Download error:', err);
      setTimeout(async () => {
        try {
          await fs.unlink(outputPath);
          console.log('🧹 Cleaned test file:', outputFilename);
        } catch (e) {}
      }, 5000);
    });
    
  } catch (error) {
    console.error('❌ FFmpeg test error:', error);
    res.status(500).json({ 
      error: 'FFmpeg test failed', 
      details: error.message 
    });
  }
});

// Test FFmpeg conversion - Convertit un fichier uploadé
app.post('/api/test-ffmpeg-conversion', upload.single('file'), async (req, res) => {
  console.log('🔄 Test FFmpeg conversion requested');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const inputFile = req.file;
    console.log('📁 Input file:', inputFile.originalname, inputFile.mimetype);
    
    let outputExt, outputCodec;
    
    // Déterminer le type de conversion
    if (inputFile.mimetype.startsWith('video/')) {
      // Video -> Audio (MP3)
      outputExt = 'mp3';
      outputCodec = 'mp3';
      console.log('🎬➡️🎵 Converting video to audio');
    } else if (inputFile.mimetype.startsWith('audio/')) {
      // Audio -> Video (MP4 avec image noire)
      outputExt = 'mp4';
      outputCodec = 'libx264';
      console.log('🎵➡️🎬 Converting audio to video');
    } else {
      await fs.unlink(inputFile.path);
      return res.status(400).json({ error: 'File must be audio or video' });
    }
    
    const outputFilename = `converted-${Date.now()}.${outputExt}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    await new Promise((resolve, reject) => {
      let command = ffmpeg(inputFile.path);
      
      if (inputFile.mimetype.startsWith('video/')) {
        // Extraire l'audio seulement
        command
          .noVideo()
          .audioCodec(outputCodec)
          .audioBitrate('192k');
      } else {
        // Créer une vidéo avec image noire
        command
          .input('color=c=black:s=1280x720:d=10')
          .inputFormat('lavfi')
          .complexFilter('[1:a][0:v]shortest=1[out]')
          .map('[out]')
          .videoCodec(outputCodec)
          .audioCodec('aac');
      }
      
      command
        .output(outputPath)
        .on('start', cmd => console.log('FFmpeg command:', cmd))
        .on('progress', progress => {
          console.log('Progress:', Math.round(progress.percent || 0) + '%');
        })
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
    
    console.log('✅ Conversion completed:', outputFilename);
    
    // Nettoyer le fichier d'entrée
    await fs.unlink(inputFile.path);
    
    // Envoyer le fichier converti
    res.download(outputPath, outputFilename, (err) => {
      if (err) console.error('Download error:', err);
      // Nettoyer après 5 secondes
      setTimeout(async () => {
        try {
          await fs.unlink(outputPath);
          console.log('🧹 Cleaned converted file:', outputFilename);
        } catch (e) {}
      }, 5000);
    });
    
  } catch (error) {
    console.error('❌ Conversion error:', error);
    
    // Nettoyer le fichier uploadé en cas d'erreur
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {}
    }
    
    res.status(500).json({ 
      error: 'Conversion failed', 
      details: error.message 
    });
  }
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

// Endpoint GET pour générer un fichier audio de test (1 seconde de silence)
app.get('/api/test-ffmpeg-simple', async (req, res) => {
  try {
    console.log('🎵 Test FFmpeg simple endpoint called');
    
    const outputFilename = `test-audio-${Date.now()}.mp3`;
    const outputPath = path.join(outputDir, outputFilename);

    let command;
    try {
      command = ffmpeg();
    } catch (ffmpegError) {
      console.error('Failed to create FFmpeg command for test:', ffmpegError);
      return res.status(500).json({ 
        error: 'FFmpeg not available', 
        details: ffmpegError.message 
      });
    }

    // Générer 1 seconde de silence
    command
      .input('anullsrc=channel_layout=stereo:sample_rate=44100')
      .inputOptions(['-f lavfi', '-t 1'])
      .audioCodec('mp3')
      .audioBitrate('128k')
      .output(outputPath);

    command.on('start', (commandLine) => {
      console.log('FFmpeg test command started:', commandLine);
    });

    command.on('error', (err) => {
      console.error('FFmpeg test error:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Test audio generation failed', 
          details: err.message 
        });
      }
    });

    command.on('end', async () => {
      console.log('Test audio generation completed');
      
      // Envoyer le fichier au client
      res.download(outputPath, outputFilename, async (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Nettoyer le fichier après téléchargement
        setTimeout(async () => {
          try {
            await fs.unlink(outputPath);
            console.log('Test audio file cleaned up:', outputFilename);
          } catch (err) {
            console.error('Error deleting test audio file:', err);
          }
        }, 5000);
      });
    });

    command.run();

  } catch (error) {
    console.error('Test FFmpeg simple error:', error);
    res.status(500).json({ 
      error: 'Test failed', 
      details: error.message 
    });
  }
});

// Endpoint POST pour convertir un fichier (vidéo vers MP3 ou audio vers MP4)
app.post('/api/test-ffmpeg-conversion', upload.single('file'), async (req, res) => {
  try {
    console.log('🔄 Test FFmpeg conversion endpoint called');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const inputFile = req.file;
    console.log('Processing file:', {
      originalName: inputFile.originalname,
      mimetype: inputFile.mimetype,
      size: inputFile.size
    });

    // Déterminer le format de sortie basé sur le type d'entrée
    let outputExtension, outputCodec, isAudioOutput;
    
    if (inputFile.mimetype.startsWith('video/')) {
      // Vidéo vers MP3 (audio)
      outputExtension = 'mp3';
      outputCodec = 'mp3';
      isAudioOutput = true;
    } else if (inputFile.mimetype.startsWith('audio/')) {
      // Audio vers MP4 (vidéo avec image statique)
      outputExtension = 'mp4';
      outputCodec = 'libx264';
      isAudioOutput = false;
    } else {
      return res.status(400).json({ 
        error: 'Unsupported file type. Please upload a video or audio file.' 
      });
    }

    const outputFilename = `converted-${Date.now()}.${outputExtension}`;
    const outputPath = path.join(outputDir, outputFilename);

    let command;
    try {
      command = ffmpeg();
    } catch (ffmpegError) {
      console.error('Failed to create FFmpeg command for conversion:', ffmpegError);
      return res.status(500).json({ 
        error: 'FFmpeg not available', 
        details: ffmpegError.message 
      });
    }

    command.input(inputFile.path);

    if (isAudioOutput) {
      // Conversion vidéo vers MP3
      command
        .noVideo()
        .audioCodec('mp3')
        .audioBitrate('128k')
        .audioFrequency(44100);
    } else {
      // Conversion audio vers MP4 avec une image statique noire
      command
        .input('color=black:size=640x480:duration=0')
        .inputOptions(['-f lavfi'])
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-pix_fmt yuv420p',
          '-shortest' // Arrêter quand l'audio se termine
        ]);
    }

    command.output(outputPath);

    command.on('start', (commandLine) => {
      console.log('FFmpeg conversion command started:', commandLine);
    });

    command.on('progress', (progress) => {
      console.log('Conversion progress: ' + Math.round(progress.percent || 0) + '% done');
    });

    command.on('error', async (err) => {
      console.error('FFmpeg conversion error:', err);
      
      // Nettoyer le fichier d'entrée
      try {
        await fs.unlink(inputFile.path);
      } catch (cleanupErr) {
        console.error('Error cleaning up input file:', cleanupErr);
      }
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'File conversion failed', 
          details: err.message 
        });
      }
    });

    command.on('end', async () => {
      console.log('File conversion completed');
      
      // Nettoyer le fichier d'entrée
      try {
        await fs.unlink(inputFile.path);
      } catch (err) {
        console.error('Error deleting input file:', err);
      }

      // Envoyer le fichier converti
      res.download(outputPath, outputFilename, async (err) => {
        if (err) {
          console.error('Download error:', err);
        }
        // Nettoyer le fichier de sortie après téléchargement
        setTimeout(async () => {
          try {
            await fs.unlink(outputPath);
            console.log('Converted file cleaned up:', outputFilename);
          } catch (err) {
            console.error('Error deleting converted file:', err);
          }
        }, 5000);
      });
    });

    command.run();

  } catch (error) {
    console.error('Test FFmpeg conversion error:', error);
    
    // Nettoyer le fichier d'entrée si il existe
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupErr) {
        console.error('Error cleaning up input file after error:', cleanupErr);
      }
    }
    
    res.status(500).json({ 
      error: 'Conversion test failed', 
      details: error.message 
    });
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