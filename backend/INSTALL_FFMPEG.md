# Installation de FFmpeg pour le Backend Video Editor

## Windows

### Option 1: Installation avec Chocolatey (Recommandé)
Si vous avez Chocolatey installé :
```bash
choco install ffmpeg
```

### Option 2: Installation manuelle
1. Téléchargez FFmpeg depuis : https://www.gyan.dev/ffmpeg/builds/
2. Choisissez "release full" 
3. Extrayez le fichier ZIP
4. Ajoutez le dossier `bin` au PATH de Windows :
   - Copiez le dossier extrait dans `C:\ffmpeg`
   - Ajoutez `C:\ffmpeg\bin` au PATH système
   - Redémarrez le terminal

### Option 3: Installation avec winget
```bash
winget install FFmpeg
```

## Vérification de l'installation
Après installation, vérifiez avec :
```bash
ffmpeg -version
```

## Alternative sans installation FFmpeg

Si vous ne pouvez pas installer FFmpeg, le backend inclut un mode de fallback qui :
- Accepte les fichiers uploadés
- Retourne le premier fichier sans traitement
- Permet de tester l'application sans conversion vidéo

Pour utiliser le backend sans FFmpeg, l'application détectera automatiquement son absence.