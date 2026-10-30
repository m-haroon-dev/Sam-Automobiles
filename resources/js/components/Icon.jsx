import React from 'react';
const symbols={
"arrow": <><path d={"M5 15 15 5M5 5h10v10"}></path></>,
"left": <><path d={"m12 5-7 7 7 7"}></path></>,
"right": <><path d={"m8 5 7 7-7 7"}></path></>,
"heart": <><path d={"M17.8 3.8a5.3 5.3 0 0 0-7.5 0L10 4l-.3-.2a5.3 5.3 0 0 0-7.5 7.5L10 19l7.8-7.7a5.3 5.3 0 0 0 0-7.5Z"} transform={"translate(2 1) scale(.9)"}></path></>,
"close": <><path d={"m6 6 12 12M6 18 18 6"}></path></>,
"menu": <><path d={"M4 8h16M4 16h16"}></path></>,
"compare": <><path d={"M7 3v18M17 3v18M3 8h8M13 16h8"}></path></>,
"share": <><path d={"M12 16V3m-5 5 5-5 5 5M5 13v7h14v-7"}></path></>,
"phone": <><path d={"m7 3 3 4-2.5 2.5a15 15 0 0 0 7 7L17 14l4 3c-1 5-4 5-7 3A26 26 0 0 1 4 10C2 7 2 4 7 3Z"}></path></>,
"pin": <><path d={"M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0Z"}></path><circle cx={"12"} cy={"9"} r={"2"}></circle></>,
"check": <><path d={"m5 12 4 4L19 6"}></path></>,
"search": <><circle cx={"10"} cy={"10"} r={"6"}></circle><path d={"m15 15 5 5"}></path></>,
"print": <><path d={"M7 8V3h10v5M7 17H4V8h16v9h-3M7 14h10v7H7Z"}></path></>,
"filter": <><path d={"M3 6h18M6 12h12M9 18h6"}></path></>,
};
export function Icon({name="arrow",className="icon",...props}){return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" {...props}>{symbols[name]||symbols.arrow}</svg>;}
export function SocialIcon({network}){return <svg className={'icon social-icon social-icon--'+network} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">{network==='facebook'?<path fill="currentColor" stroke="none" d="M14.2 22v-8.7h2.9l.4-3.4h-3.3V7.7c0-1 .3-1.7 1.7-1.7h1.8V3a23 23 0 0 0-2.6-.1c-2.6 0-4.4 1.6-4.4 4.5v2.5H8v3.4h2.7V22z"/>:<><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none"/></>}</svg>;}
