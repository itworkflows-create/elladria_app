import React, { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Text, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cloudEnabled, supabase } from './supabase';
import { recoveryCode } from './recoveryLink';
import { Button, Card, Field, s } from './ui';

export async function requestPasswordReset(email: string) {
  if (!supabase) throw new Error('Account recovery is unavailable. Please contact support.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Enter your email address first.');
  const redirectTo = Platform.OS === 'web' ? window.location.origin + '/?recovery=1' : 'elladria://reset-password';
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw error;
}

export function PasswordRecoveryGate({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<'closed' | 'checking' | 'password' | 'error' | 'done'>('closed');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const lastCode = useRef('');
  useEffect(() => {
    if (!cloudEnabled || !supabase) return;
    let alive = true;
    let attempt = 0;
    async function receive(raw: string) {
      let code: string | null;
      try { code = recoveryCode(raw, Platform.OS === 'web' ? window.location.origin : undefined); }
      catch (e) { if (alive) {setError((e as Error).message); setStage('error');} return; }
      if (!code || code === lastCode.current) return;
      lastCode.current = code;
      const version = ++attempt;
      setStage('checking'); setError(''); setPassword(''); setConfirm('');
      // Remove the one-use code from browser history before the user navigates.
      if (Platform.OS === 'web') window.history.replaceState({}, '', '/');
      try {
        const { error } = await supabase!.auth.exchangeCodeForSession(code);
        if (error) throw error;
        if (alive && version === attempt) setStage('password');
      } catch {
        if (alive && version === attempt) {
          setError('Unable to verify this link. Open it on the device where you requested it, or request a new link.');
          setStage('error');
        }
      }
    }
    const sub = Linking.addEventListener('url', event => { void receive(event.url); });
    void Linking.getInitialURL().then(url => {if (url && alive) void receive(url);}).catch(() => {});
    return () => {alive = false; sub.remove();};
  }, []);
  async function save() {
    if (busy) return;
    if (password.length < 8) {setError('Use at least 8 characters.'); return;}
    if (password !== confirm) {setError('The passwords do not match.'); return;}
    setBusy(true); setError('');
    try {
      const { error } = await supabase!.auth.updateUser({password});
      if (error) throw error;
      setPassword(''); setConfirm(''); setStage('done');
    } catch (e) {setError((e as Error).message || 'Unable to update your password. Try again.');}
    finally {setBusy(false);}
  }
  if (stage === 'closed') return <>{children}</>;
  return <SafeAreaView style={s.root}>
    <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={{padding:24, gap:16}} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>Reset your password</Text>
        <Card>
          {stage === 'checking' && <Text style={s.body}>Verifying your recovery link...</Text>}
          {stage === 'password' && <>
            <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={128} />
            <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={128} />
            <Button title={busy ? 'Saving...' : 'Save new password'} disabled={busy} onPress={() => void save()} />
          </>}
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
          {stage === 'done' && <Text style={s.body}>Your password has been updated.</Text>}
          {stage !== 'checking' && <Button secondary title="Return to app" disabled={busy} onPress={() => {setPassword('');setConfirm('');setStage('closed');}} />}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
