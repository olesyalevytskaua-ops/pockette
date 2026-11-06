import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';
// `npm run phone` serves over HTTPS (self-signed) so a phone on the same Wi-Fi may use the camera.
// BASE_PATH serves the app from a sub-path, e.g. /pockette/ on GitHub Pages; local runs stay at /.
declare const process: { env: Record<string, string | undefined> };
const base = process.env.BASE_PATH || '/';
export default defineConfig(({ mode }) => ({base,plugins:[...(mode === 'https' ? [basicSsl()] : []),react(),VitePWA({registerType:'autoUpdate',injectRegister:null,includeAssets:['icon.svg','apple-touch-icon.png'],manifest:{name:'Pockette — Cards and promo codes',short_name:'Pockette',description:'Loyalty cards and promo codes.',theme_color:'#762D46',background_color:'#F8F6F4',display:'standalone',start_url:base,scope:base,icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'icon-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},workbox:{globPatterns:['**/*.{js,css,html,png,svg,woff2}']}})]}));
