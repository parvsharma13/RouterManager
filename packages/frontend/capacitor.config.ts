import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parvsharma.routermanager',
  appName: 'Router Manager',
  webDir: 'dist',
  backgroundColor: '#f7f8fb',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#f7f8fb',
  },
  plugins: {
    CapacitorSQLite: {
      androidIsEncryption: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f7f8fb',
    },
  },
};

export default config;
