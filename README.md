# Revila Video Editor

Application de montage vidéo avec React et FFmpeg, déployée sur Railway.

## 🚀 Fonctionnalités

- Upload de photos et vidéos
- Timeline drag & drop
- Transitions (Cut, Fade, Slide, Zoom)
- Ajout de musique de fond
- Export vidéo avec FFmpeg
- Prévisualisation en temps réel

## 📂 Structure

```
revila-video-editor-app/
├── frontend/     # React TypeScript - Interface utilisateur
└── backend/      # Express + FFmpeg - Traitement vidéo
```

## 🔧 Déploiement sur Railway

### 1. Créer un projet Railway
- Connecter ce repo GitHub
- Railway détectera automatiquement le monorepo

### 2. Service Backend
- **Root Directory**: `/backend`
- **Variables**: Aucune (optionnel: `FRONTEND_URL` pour CORS)
- **Networking**: Generate Domain
- FFmpeg sera installé automatiquement via Docker

### 3. Service Frontend  
- **Root Directory**: `/frontend`
- **Variables**: 
  ```
  REACT_APP_API_URL=https://[backend-url].railway.app/api
  ```
- **Networking**: Generate Domain

## 💻 Développement Local

### Backend
```bash
cd backend
npm install
npm start
# http://localhost:5000/api/health
```

### Frontend
```bash
cd frontend
npm install
npm start
# http://localhost:3000
```

## 🎥 Utilisation

1. **Uploader** des médias (photos/vidéos)
2. **Glisser** les médias sur la timeline
3. **Configurer** les transitions entre clips
4. **Ajouter** une musique de fond
5. **Exporter** la vidéo finale

## 🛠 Technologies

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, FFmpeg
- **Déploiement**: Railway, Docker
- **Processing**: FFmpeg (installé via Docker sur Railway)

## 📝 Notes

- FFmpeg est installé automatiquement sur Railway via le Dockerfile
- Les fichiers uploadés sont traités côté serveur
- Export en MP4 par défaut