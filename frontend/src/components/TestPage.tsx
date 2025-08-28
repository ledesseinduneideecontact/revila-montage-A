import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Loader, Wifi, WifiOff } from 'lucide-react';
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
        duration: 5,
        transition: 'none'
      }]);

      console.log('Upload test result:', result);
      alert('Test d\'upload réussi !');
    } catch (error) {
      console.error('Upload test failed:', error);
      alert(`Erreur d'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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

          {/* Test FFmpeg */}
          <div className="mb-8 p-4 border rounded-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">⚡ Test FFmpeg</h2>
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
              Tester FFmpeg
            </button>
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