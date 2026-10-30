import React from 'react';
import {createRoot} from 'react-dom/client';
import {createInertiaApp} from '@inertiajs/react';
createInertiaApp({title:title=>title||'SAM Automobiles',resolve:async name=>name.startsWith('Admin/')?(await import('./pages/AdminApp')).default:(await import('./pages/PublicApp')).default,setup({el,App,props}){createRoot(el).render(<App {...props}/>);},progress:{color:'#62745b',showSpinner:false}});
if('serviceWorker' in navigator)window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});
