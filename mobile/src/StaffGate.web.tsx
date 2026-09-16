import React, { useEffect, useState } from 'react';
import { adminSupabase } from './supabase';
import { checked, staffSession } from './cloudApi';
export function StaffGate({children}: React.PropsWithChildren) {
  const [user,setUser]=useState(''), [email,setEmail]=useState(''), [password,setPassword]=useState('');
  const [busy,setBusy]=useState(true), [error,setError]=useState('');
  useEffect(()=>{
    let alive=true;
    const verify=async()=>{
      try { const u=await staffSession(); if(alive) {setUser(u.id);setError('');} }
      catch {if(alive) setUser('');}
      finally {if(alive) setBusy(false);}
    };
    void verify();
    const sub=adminSupabase?.auth.onAuthStateChange((_event,session)=>{
      if(!session) {setUser('');setBusy(false);}
      else setTimeout(()=>{if(alive) void verify();},0);
    }).data.subscription;
    return ()=>{alive=false;sub?.unsubscribe();};
  },[]);
  async function login(event: React.FormEvent) {
    event.preventDefault();setBusy(true);setError('');
    try {
      if(!adminSupabase) throw Error('Supabase configuration is missing.');
      checked(await adminSupabase.auth.signInWithPassword({email:email.trim(),password}));
      const u=await staffSession();setUser(u.id);setPassword('');
    } catch(e) {setError((e as Error).message);}
    finally {setBusy(false);}
  }
  if(user) return <>
    <div style={{position:'fixed',bottom:16,right:20,zIndex:100}}>
      <button className="btn secondary" onClick={async()=>{
        if(!window.confirm('Sign out? Unsaved edits will be lost.')) return;
        try {checked(await adminSupabase!.auth.signOut());setUser('');} catch(e){setError((e as Error).message);}
      }}>Sign out</button>
      {error && <p role="alert">{error}</p>}
    </div>
    <React.Fragment key={user}>{children}</React.Fragment>
  </>;
  return <main className="admin-shell" style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f2f6f4',padding:24}}>
    <form className="panel form-panel" style={{width:'100%',maxWidth:440,padding:32,display:'grid',gap:18}} onSubmit={login}>
      <div className="eyebrow">ELLADRIA MANAGEMENT</div>
      <h1>Staff sign in</h1>
      <p>Use the account assigned to you by your administrator.</p>
      <label>Email<input aria-label="Staff email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>Password<input aria-label="Staff password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /></label>
      {error && <div className="admin-alert" role="alert">{error}</div>}
      <button className="btn primary" disabled={busy}>{busy?'Please wait�':'Sign in'}</button>
      <a href="/mobile-preview.html">Open candidate app</a>
    </form>
  </main>;
}

