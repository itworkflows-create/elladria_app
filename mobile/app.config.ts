import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  if (process.env.ELLADRIA_RELEASE === '1') {
    if (process.env.EXPO_PUBLIC_BACKEND !== 'supabase')
      throw new Error('Release builds require the Supabase backend.');
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url) || url.includes('YOUR_PROJECT'))
      throw new Error('Set the real HTTPS Supabase project URL in the EAS environment.');
    if (!key || !key.startsWith('sb_publishable_') || key.includes('YOUR_KEY'))
      throw new Error('Set a Supabase publishable key in the EAS environment. Never use a secret/service-role key.');
  }
  return { ...config, name: config.name ?? 'Elladria', slug: config.slug ?? 'elladria-mobile' };
};
