import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lostcolony.roanoke',
  appName: 'Roanoke Island',
  webDir: 'www/browser',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#111914'
    },
    StatusBar: {
      style: 'DARK'
    }
  }
};

export default config;
