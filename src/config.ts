// EXPO_PUBLIC_* vars are inlined at bundle time. Set it in .env.local for
// dev and in the EAS build profile for preview/production builds.
//
// Dev defaults: `localhost` works for the iOS simulator and Expo web. The
// Android emulator needs http://10.0.2.2:8000, and a physical device needs
// your machine's LAN IP (or an `expo start --tunnel` + backend tunnel).
export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'
).replace(/\/+$/, '');
