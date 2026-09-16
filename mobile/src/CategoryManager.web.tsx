import React,{useState} from 'react';
import type {Catalog} from './catalog';
import {adminRequest} from './cloudApi';
export function CategoryManager({catalog,onSaved}:{catalog:Catalog;onSaved:(value:Catalog)=>void}) {
 const [name,setName]=useState(''),[editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(operation:'create'|'rename'|'delete',value=name) {
  setBusy(true);setError('');
  try {
   const result=await adminRequest('/api/admin/categories',{method:'POST',body:JSON.stringify({operation,name:value.trim(),previousName:editing,revision:catalog.revision})});
   onSaved(result);setName('');setEditing(null);
  } catch(e){setError((e as Error).message);} finally {setBusy(false);}
 }
 return <section className="panel form-panel" style={{marginBottom:20}}>
  <h2>Job categories</h2>
  <p>Create the choices used in vacancy forms and customer job filters.</p>
  {!catalog.categories ? <p role="status">Apply the category setup SQL to enable category management.</p> : <>
   <form onSubmit={e=>{e.preventDefault();void save(editing?'rename':'create');}} style={{display:'flex',gap:12,alignItems:'end',flexWrap:'wrap'}}>
    <label style={{flex:1}}>Category name<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} /></label>
    <button className="btn primary" disabled={busy}>{editing?'Save category name':'Add category'}</button>
    {editing && <button type="button" className="btn secondary" disabled={busy} onClick={()=>{setEditing(null);setName('');}}>Cancel rename</button>}
   </form>
   <ul style={{paddingLeft:20}}>{catalog.categories.map(category=><li key={category} style={{marginTop:12}}>
    <strong>{category}</strong>{' '}
    <button className="text-link" disabled={busy} onClick={()=>{setEditing(category);setName(category);}}>Rename {category}</button>{' '}
    <button className="text-link danger-text" disabled={busy||catalog.jobs.some(j=>j.category===category)} onClick={()=>{
     if(window.confirm('Remove category '+category+'?')) void save('delete',category);
    }}>Remove {category}</button>
   </li>)}</ul>
   <p className="helper-text">Categories used by jobs cannot be removed. Renaming a category also updates its jobs.</p>
  </>}
  {error&&<div className="admin-alert" role="alert">{error}</div>}
 </section>;
}
