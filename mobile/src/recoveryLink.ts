export function recoveryCode(raw: string, webOrigin?: string): string | null {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  const native = url.protocol === 'elladria:' && url.hostname === 'reset-password' && (!url.pathname || url.pathname === '/');
  const web = !!webOrigin && url.origin === webOrigin && url.pathname === '/' && url.searchParams.get('recovery') === '1';
  if (!native && !web) return null;
  if (url.searchParams.has('error') || url.hash.includes('error='))
    throw new Error('This recovery link has expired or is invalid. Request a new one.');
  const code = url.searchParams.get('code');
  if (!code) throw new Error('This recovery link is incomplete. Request a new one.');
  return code;
}
