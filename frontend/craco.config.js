module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Ignorer les warnings de dépendances critiques pour @ffmpeg
      webpackConfig.module.rules.push({
        test: /\.m?js/,
        resolve: {
          fullySpecified: false
        }
      });
      
      // Désactiver les warnings pour les expressions dynamiques
      webpackConfig.ignoreWarnings = [
        /Critical dependency/,
      ];
      
      return webpackConfig;
    },
  },
};