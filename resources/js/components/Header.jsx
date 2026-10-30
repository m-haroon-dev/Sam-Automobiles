import {SiteLink} from './SiteLink';
import React,{useEffect,useRef,useState} from 'react';
import {Icon,SocialIcon} from './Icon';
import {useShowroom} from '../state/ShowroomContext';
const nav=[['/inventory/','Inventory'],['/sell/','Sell or trade in'],['/about/','About'],['/visit/','Visit']];
export function Header({home=false}){
 const {saved,site}=useShowroom(),[open,setOpen]=useState(false),toggle=useRef(null);
 useEffect(()=>{const key=e=>{if(e.key==='Escape'&&open){setOpen(false);toggle.current?.focus();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[open]);
 const menu=<button ref={toggle} className="menu-toggle" type="button" aria-label={open?'Close menu':'Open menu'} aria-expanded={open} aria-controls="mobile-menu" data-menu-toggle="" onClick={()=>setOpen(v=>!v)}><Icon name="menu"/></button>;
 const navigation=<nav className="desktop-nav" aria-label="Main navigation">{nav.map(([p,n])=><SiteLink href={p} key={p} aria-current={location.pathname.replace(/\/$/,'')===p.replace(/\/$/,'')?'page':undefined}>{n}</SiteLink>)}</nav>;
 const heart=<SiteLink className="saved-cars-link" href="/shortlist/" aria-label="Saved cars"><Icon name="heart"/><span data-saved-count="" className="count" hidden={!saved.length}>{saved.length}</span></SiteLink>;
 return <><SiteLink className="skip-link" href="#main">Skip to content</SiteLink><header className={'site-header'+(home?' home-header':'')}><div className="wrap header-inner"><SiteLink className="brand" href="/" aria-label="SAM Automobiles home"><img src="/assets/branding/sam-logo-transparent.webp" width="168" height="84" alt="SAM Automobiles chrome emblem"/><span>SAM Automobiles</span></SiteLink>{home?<div className="header-browse">{menu}{navigation}</div>:navigation}<div className="nav-tools">{home&&<SiteLink className="header-viewing" href="/visit/">Arrange a viewing<span className="button-icon"><Icon/></span></SiteLink>}{heart}<SiteLink className="header-sell-shortcut" href="/sell/" aria-label="Sell or trade in your car">Sell / Trade</SiteLink>{!home&&menu}</div></div><nav className="mobile-nav" id="mobile-menu" aria-label="Mobile navigation" hidden={!open}>{nav.map(([p,n])=><SiteLink href={p} key={p}>{n}</SiteLink>)}<SiteLink href="/compare/">Compare cars</SiteLink><SiteLink className="instagram-follow" href={site.instagram} target="_blank" rel="noopener"><SocialIcon network="instagram"/>Follow SAM on Instagram</SiteLink></nav></header></>;
}
