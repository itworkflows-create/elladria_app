import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppNotification } from './notifications';
export function useNotificationReads(owner: string, items: AppNotification[]) {
  const key='elladria.notifications.read.v1.'+owner;
  const [saved,setSaved]=useState<{key:string;ids:string[]}>({key:'',ids:[]});
  const [error,setError]=useState('');
  const queue=useRef(Promise.resolve());
  useEffect(()=>{
    let alive=true;
    setError('');
    AsyncStorage.getItem(key).then(raw=>{
      const ids=raw ? JSON.parse(raw) : [];
      if(alive) setSaved({key,ids:Array.isArray(ids)?ids.filter(x=>typeof x==='string'):[]});
    }).catch(()=>{if(alive){setSaved({key,ids:[]});setError('Read notifications could not be restored on this device.');}});
    return ()=>{alive=false;};
  },[key]);
  const ready=saved.key===key;
  const unread=ready?items.filter(item=>!saved.ids.includes(item.id)):[];
  function markRead(ids:string[]) {
    if(!ready)return;
    setSaved(previous=>({key,ids:[...new Set([...previous.ids,...ids])].slice(-300)}));
  }
  useEffect(()=>{
    if(saved.key!==key)return;
    let alive=true;
    queue.current=queue.current.then(()=>AsyncStorage.setItem(saved.key,JSON.stringify(saved.ids)))
      .catch(()=>{if(alive)setError('Read notifications could not be saved on this device.');});
    return ()=>{alive=false;};
  },[saved,key]);
  return {unread,markRead,ready,error};
}
