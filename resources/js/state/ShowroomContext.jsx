import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {parseSelection} from '../lib/data';
const Context=createContext(null);
function read(key,ids){try{const a=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(a)?a.filter(x=>ids.has(x)):[];}catch{return [];}}
export function ShowroomProvider({data,children}){
 const ids=useMemo(()=>new Set(data.cars.map(c=>c.id)),[data.cars]);
 const [saved,setSaved]=useState(()=>read('sam:saved',ids)),[compare,setCompare]=useState(()=>read('sam:compare',ids).slice(0,3));
 const [enquiry,setEnquiry]=useState(null),[lightbox,setLightbox]=useState(null),[toast,setToast]=useState(''),[share,setShare]=useState('');
 useEffect(()=>{setSaved(a=>a.filter(id=>ids.has(id)));setCompare(a=>a.filter(id=>ids.has(id)));},[ids]);
 useEffect(()=>{try{localStorage.setItem('sam:saved',JSON.stringify(saved));localStorage.setItem('sam:compare',JSON.stringify(compare));}catch{}},[saved,compare]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(t);},[toast]);
 const toggleSaved=useCallback(id=>{if(!ids.has(id))return;setSaved(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id]);},[ids]);
 const toggleCompare=useCallback(id=>{if(!ids.has(id))return;setCompare(a=>a.includes(id)?a.filter(x=>x!==id):a.length<3?[...a,id]:(setToast('Compare up to three cars. Remove one to add another.'),a));},[ids]);
 const shareURL=useCallback(async(title,url)=>{if(navigator.share){try{await navigator.share({title,url});return;}catch(e){if(e.name==='AbortError')return;}}try{await navigator.clipboard.writeText(url);setToast('Link copied');}catch{setShare(url);}},[]);
 const fromURL=useCallback(()=>parseSelection(location.search,ids),[ids]);
 const value={...data,ids,saved,compare,setCompare,toggleSaved,toggleCompare,enquiry,setEnquiry,lightbox,setLightbox,toast,setToast,share,setShare,shareURL,fromURL};
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useShowroom=()=>useContext(Context);
