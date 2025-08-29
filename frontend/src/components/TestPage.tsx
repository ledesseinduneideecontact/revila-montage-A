import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader, Wifi, WifiOff, Download, Upload, Music, FileVideo } from 'lucide-react';
import backendService from '../services/backend.service';

const TestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<{
    connection: 'idle' | 'testing' | 'success' | 'error';
    message: string;
    details?: any;
  }>({
    connection: 'idle',
    message: 'Pas encore testé'
  });

  const [ffmpegTests, setFFmpegTests] = useState<{
    audioGeneration: 'idle' | 'testing' | 'success' | 'error';
    conversion: 'idle' | 'testing' | 'success' | 'error';
    message: string;
    downloadUrl?: string;
  }>({
    audioGeneration: 'idle',
    conversion: 'idle',
    message: 'Pas encore testé'
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const testBackendConnection = async () => {
    setTestResults({
      connection: 'testing',
      message: 'Test de connexion en cours...'
    });

    try {
      // Test simple avec fetch
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      console.log('Testing API URL:', apiUrl);
      
      const response = await fetch(`${apiUrl}/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTestResults({
          connection: 'success',
          message: 'Connexion réussie !',
          details: data
        });
      } else {
        setTestResults({
          connection: 'error',
          message: `Erreur HTTP: ${response.status} - ${response.statusText}`,
          details: { status: response.status, statusText: response.statusText }
        });
      }
    } catch (error) {
      console.error('Backend connection test failed:', error);
      setTestResults({
        connection: 'error',
        message: `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        details: error
      });
    }
  };

  const testFileUpload = async () => {
    try {
      // Créer un fichier de test simple
      const testBlob = new Blob(['test content'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });

      const result = await backendService.simpleExport([{
        id: 'test-1',
        name: 'test.txt',
        type: 'audio' as any, // Type temporaire pour le test
        file: testFile,
        url: '',
        duration: 0
      }], [{
        id: 'timeline-1',
        mediaId: 'test-1',
        startTime: 0,
        endTime: 5,
        duration: 5,
        transition: 'none' as const
      }]);

      console.log('Upload test result:', result);
      alert('Test d\'upload réussi !');
    } catch (error) {
      console.error('Upload test failed:', error);
      alert(`Erreur d'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  const testFFmpegAudioGeneration = async () => {
    setFFmpegTests(prev => ({
      ...prev,
      audioGeneration: 'testing',
      message: 'Génération d\'un audio de test en cours...'
    }));

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      
      // Essayer d'abord l'endpoint simple qui ne nécessite pas FFmpeg
      let response = await fetch(`${apiUrl}/test-simple-audio`, {
        method: 'GET'
      });

      if (response.ok) {
        // Créer un blob à partir de la réponse
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        setFFmpegTests(prev => ({
          ...prev,
          audioGeneration: 'success',
          message: 'Audio de test généré avec succès !',
          downloadUrl
        }));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        setFFmpegTests(prev => ({
          ...prev,
          audioGeneration: 'error',
          message: `Erreur: ${errorData.error || 'Erreur HTTP ' + response.status}`
        }));
      }
    } catch (error) {
      console.error('FFmpeg audio generation test failed:', error);
      setFFmpegTests(prev => ({
        ...prev,
        audioGeneration: 'error',
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      }));
    }
  };

  const testFFmpegConversion = async () => {
    if (!selectedFile) {
      alert('Veuillez d\'abord sélectionner un fichier');
      return;
    }

    setFFmpegTests(prev => ({
      ...prev,
      conversion: 'testing',
      message: `Conversion de ${selectedFile.name} en cours...`
    }));

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${apiUrl}/test-ffmpeg-conversion`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        // Créer un blob à partir de la réponse
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        
        // Déterminer le type de conversion
        const isVideoToAudio = selectedFile.type.startsWith('video/');
        const conversionType = isVideoToAudio ? 'MP3 (audio)' : 'MP4 (vidéo)';
        
        setFFmpegTests(prev => ({
          ...prev,
          conversion: 'success',
          message: `Conversion vers ${conversionType} réussie !`,
          downloadUrl
        }));
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        setFFmpegTests(prev => ({
          ...prev,
          conversion: 'error',
          message: `Erreur: ${errorData.error || 'Erreur HTTP ' + response.status}`
        }));
      }
    } catch (error) {
      console.error('FFmpeg conversion test failed:', error);
      setFFmpegTests(prev => ({
        ...prev,
        conversion: 'error',
        message: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      }));
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    
    // Reset conversion status when new file is selected
    if (file) {
      setFFmpegTests(prev => ({
        ...prev,
        conversion: 'idle',
        message: `Fichier sélectionné: ${file.name}`
      }));
    }
  };

  const downloadResult = () => {
    if (ffmpegTests.downloadUrl) {
      const link = document.createElement('a');
      link.href = ffmpegTests.downloadUrl;
      link.download = ffmpegTests.audioGeneration === 'success' ? 'test-audio.mp3' : 
                    selectedFile?.type.startsWith('video/') ? 'converted.mp3' : 'converted.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
            🧪 Page de Test - Connexion Backend
          </h1>

          {/* Informations de configuration */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h2 className="text-lg font-semibold mb-4 text-blue-800">📋 Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>API URL:</strong> 
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded">
                  {process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}
                </code>
              </div>
              <div>
                <strong>Environment:</strong> 
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded">
                  {process.env.NODE_ENV || 'development'}
                </code>
              </div>
            </div>
          </div>

          {/* Test de connexion */}
          <div className="mb-8 p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">🔌 Test de Connexion Backend</h2>
            
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={testBackendConnection}
                disabled={testResults.connection === 'testing'}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {testResults.connection === 'testing' ? (
                  <Loader className="animate-spin w-4 h-4" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                Tester la connexion
              </button>

              <button
                onClick={testFileUpload}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Test Upload
              </button>
            </div>

            {/* Résultats du test */}
            <div className={`p-4 rounded-lg ${
              testResults.connection === 'success' ? 'bg-green-50 border-green-200' :
              testResults.connection === 'error' ? 'bg-red-50 border-red-200' :
              testResults.connection === 'testing' ? 'bg-yellow-50 border-yellow-200' :
              'bg-gray-50 border-gray-200'
            } border`}>
              <div className="flex items-center gap-2 mb-2">
                {testResults.connection === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {testResults.connection === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                {testResults.connection === 'testing' && <Loader className="w-5 h-5 animate-spin text-yellow-600" />}
                {testResults.connection === 'idle' && <WifiOff className="w-5 h-5 text-gray-600" />}
                
                <span className="font-medium">{testResults.message}</span>
              </div>

              {testResults.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-gray-600">Voir les détails</summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(testResults.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>

          {/* Test FFmpeg Frontend */}
          <div className="mb-8 p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">⚡ Test FFmpeg Frontend</h2>
            <div className="text-sm text-gray-600 mb-2">
              FFmpeg Status: <span id="ffmpeg-status">Non testé</span>
            </div>
            <button
              onClick={async () => {
                const statusEl = document.getElementById('ffmpeg-status');
                if (statusEl) statusEl.textContent = 'Chargement...';
                
                try {
                  const ffmpegService = await import('../services/ffmpeg.service');
                  await ffmpegService.default.load();
                  if (statusEl) statusEl.textContent = '✅ FFmpeg chargé avec succès';
                } catch (error) {
                  console.error('FFmpeg load error:', error);
                  if (statusEl) statusEl.textContent = `❌ Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
                }
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Tester FFmpeg Frontend
            </button>
          </div>

          {/* Test de Conversion FFmpeg Backend */}
          <div className="mb-8 p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">🎬 Test de Conversion FFmpeg Backend</h2>
            <p className="text-sm text-gray-600 mb-4">
              Cette section teste les capacités FFmpeg du backend pour la génération d'audio et la conversion de fichiers.
            </p>

            {/* Génération Audio Test */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2 text-gray-700">Génération d'Audio de Test</h3>
              <button
                onClick={testFFmpegAudioGeneration}
                disabled={ffmpegTests.audioGeneration === 'testing'}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {ffmpegTests.audioGeneration === 'testing' ? (
                  <Loader className="animate-spin w-4 h-4" />
                ) : (
                  <Music className="w-4 h-4" />
                )}
                Générer Audio Test
              </button>
            </div>

            {/* Upload et Conversion */}
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2 text-gray-700">Test de Conversion</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="video/*,audio/*"
                    onChange={handleFileSelect}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {selectedFile && (
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      {selectedFile.type.startsWith('video/') ? <FileVideo className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-gray-500">
                  • Vidéos → converti vers MP3 (audio seulement)<br/>
                  • Audio → converti vers MP4 (avec image noire)
                </div>
                
                <button
                  onClick={testFFmpegConversion}
                  disabled={!selectedFile || ffmpegTests.conversion === 'testing'}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2 w-fit"
                >
                  {ffmpegTests.conversion === 'testing' ? (
                    <Loader className="animate-spin w-4 h-4" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Tester Conversion
                </button>
              </div>
            </div>

            {/* Résultats du test FFmpeg */}
            <div className={`p-4 rounded-lg ${
              ffmpegTests.audioGeneration === 'success' || ffmpegTests.conversion === 'success' ? 'bg-green-50 border-green-200' :
              ffmpegTests.audioGeneration === 'error' || ffmpegTests.conversion === 'error' ? 'bg-red-50 border-red-200' :
              ffmpegTests.audioGeneration === 'testing' || ffmpegTests.conversion === 'testing' ? 'bg-yellow-50 border-yellow-200' :
              'bg-gray-50 border-gray-200'
            } border`}>
              <div className="flex items-center gap-2 mb-2">
                {(ffmpegTests.audioGeneration === 'success' || ffmpegTests.conversion === 'success') && 
                  <CheckCircle className="w-5 h-5 text-green-600" />}
                {(ffmpegTests.audioGeneration === 'error' || ffmpegTests.conversion === 'error') && 
                  <AlertCircle className="w-5 h-5 text-red-600" />}
                {(ffmpegTests.audioGeneration === 'testing' || ffmpegTests.conversion === 'testing') && 
                  <Loader className="w-5 h-5 animate-spin text-yellow-600" />}
                
                <span className="font-medium">{ffmpegTests.message}</span>
              </div>

              {ffmpegTests.downloadUrl && (
                <button
                  onClick={downloadResult}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Télécharger le résultat
                </button>
              )}
            </div>
          </div>

          {/* Retour à l'app */}
          <div className="text-center">
            <button
              onClick={() => window.location.hash = '#app'}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              ← Retour à l'Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;