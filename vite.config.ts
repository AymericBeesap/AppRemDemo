import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Configuration Vite — Développement local avec proxy AppRouter simulé.
 *
 * En production BTP, les routes /s4hana, /cap, /bpa sont résolues par l'AppRouter
 * (xs-app.json). En développement local, ce proxy simule ce comportement.
 *
 * A FAIRE — Développement local avec SAP CAP :
 *   1. Installer SAP CAP CLI : npm install -g @sap/cds-dk
 *   2. Lancer le service CAP : cd cap && cds watch --port 4004
 *   3. Le proxy /cap → http://localhost:4004 s'active automatiquement
 *
 * A FAIRE — Développement local avec S/4HANA (optionnel) :
 *   Utiliser SAP Business Application Studio ou un tunnel VPN vers le système S/4HANA de DEV.
 *   Ou utiliser la sandbox API Business Hub : https://api.sap.com
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // A FAIRE — Connexion CAP Service (local) : démarrer `cds watch` dans /cap
      '/cap': {
        target: 'http://localhost:4004',
        rewrite: path => path.replace(/^\/cap/, ''),
        changeOrigin: true,
      },

      // A FAIRE — Connexion S/4HANA (local via tunnel / BAS) :
      // Remplacer target par l'URL de votre système S/4HANA de développement
      // ou par https://sandbox.api.sap.com pour les APIs publiques SAP
      '/s4hana': {
        target: 'https://sandbox.api.sap.com',
        rewrite: path => path.replace(/^\/s4hana/, ''),
        changeOrigin: true,
        secure: true,
        // A FAIRE — Ajouter l'APIKey SAP Business Hub si vous utilisez la sandbox
        // headers: { 'APIKey': 'votre-api-key-sandbox' },
      },

      // A FAIRE — Connexion BPA Workflow (local via BTP trial ou tunnel) :
      '/bpa': {
        target: 'https://<votre-subaccount>.api.workflowmanagement.cfapps.<region>.hana.ondemand.com',
        rewrite: path => path.replace(/^\/bpa/, ''),
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Optimisation pour HTML5 App Repository : chunks nommés de façon stable
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          pdf: ['jspdf', 'html2canvas'],
        },
      },
    },
  },
  // Permet d'importer les variables d'environnement VITE_ dans le code
  // A FAIRE — Créer .env.production avec VITE_API_BASE_URL si besoin
  envPrefix: 'VITE_',
});
