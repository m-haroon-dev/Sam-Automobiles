import {SiteLink} from '../components/SiteLink';
import React,{useEffect,useRef} from 'react';
import {Head,usePage} from '@inertiajs/react';
import {gsap} from 'gsap';
import {useGSAP} from '@gsap/react';
import {ShowroomProvider,useShowroom} from '../state/ShowroomContext';
import {Header} from '../components/Header';
import {Dialogs} from '../components/Dialogs';
import {ShowroomHero} from '../components/ShowroomHero';
import {FeaturedCarousel} from '../components/FeaturedCarousel';
import {Showroom3D} from '../components/Showroom3D';
import {PhotoFrame} from '../components/PhotoFrame';
import {Icon} from '../components/Icon';
import {Footer,TrustSection,BuyingSteps,SellFeature,ShowroomStory,InstagramSection,VisitBand,AboutContent,PrivacyContent,VisitInfo,MapFrame,TradeIntro} from '../components/BrandSections';
import {LeadForm} from '../components/LeadForm';
import {InventoryPage} from './InventoryPage';
import {VehiclePage} from './VehiclePage';
import {ShortlistPage,ComparisonPage} from './SelectionsPage';
import {enquiryURL,mileage} from '../lib/data';
import {initContactButton} from '../lib/contact';
import {initReveal} from '../motion/reveal';
import {initAnalytics} from '../lib/analytics';
import {registerInventoryTools} from '../lib/webmcp';
gsap.registerPlugin(useGSAP);
function SoldStrip(){const {soldCars}=useShowroom();if(!soldCars.length)return null;return <section className="paper section recently-sold" data-recently-sold=""><div className="wrap"><div className="section-heading"><div><h2>Recently sold</h2><p>A few cars that have found their next home.</p></div></div><div className="sold-strip">{soldCars.map(c=><article key={c.id}><SiteLink href={'/cars/'+c.id+'/'} className="sold-photo"><PhotoFrame photo={c.photos[0]} sold/></SiteLink><p className="stock-status">Sold</p><h3><SiteLink href={'/cars/'+c.id+'/'}>{c.name}</SiteLink></h3><p className="car-meta">{c.year} · {mileage(c)}</p><p className="car-extra">{c.trim||'Trim on request'}</p></article>)}</div></div></section>;}
function HomeContent(){return <><section className="paper section" id="catalogue"><div className="wrap"><div className="section-heading"><div><p className="eyebrow">From the SAM collection</p><h2 data-reveal="">In the showroom now</h2><p data-reveal="">Imported luxury and executive cars, photographed at our Karachi showroom.</p></div><SiteLink className="text-link" href="/inventory/" data-reveal="">View full inventory ↗</SiteLink></div><div className="category-links" data-reveal=""><SiteLink className="category-link" href="/inventory/?body=Saloon">Executive</SiteLink><SiteLink className="category-link" href="/inventory/?body=SUV">SUVs</SiteLink><SiteLink className="category-link" href="/inventory/?fuel=Electric">Electric</SiteLink><SiteLink className="category-link" href="/inventory/?body=Pickup">Pickups</SiteLink></div><FeaturedCarousel/></div></section><Showroom3D/><SellFeature/><SoldStrip/><ShowroomStory/><BuyingSteps/><TrustSection/><InstagramSection/><VisitBand/></>;}
function ModelPage({model}){return <><section className="page-intro wrap"><p className="eyebrow">Representative model enquiry</p><h1>{model.name}</h1><p>{model.availabilityNote}</p></section><section className="catalogue-section wrap"><div className="model-reference"><img src={model.showroom?.preview||model.showroom?.src} width="1000" height="667" alt={model.name+' — representative model image'} style={{width:'100%',maxWidth:800,height:'auto',objectFit:'contain'}}/><p className="source-note">Representative model image. Ask SAM about current availability and specifications.</p><SiteLink className="button ink" href={'/visit/?model='+model.id}>Enquire about this model<span className="button-icon"><Icon/></span></SiteLink></div></section></>;}
function Page({data}){switch(data.page){case'Home':return <><ShowroomHero/><HomeContent/></>;case'Wheel':return <><ShowroomHero orbit/><HomeContent/></>;case'Inventory':return <InventoryPage/>;case'Vehicle':return <VehiclePage car={data.car} key={data.car.id}/>;case'Shortlist':return <ShortlistPage/>;case'Compare':return <ComparisonPage/>;case'About':return <AboutContent/>;case'Privacy':return <PrivacyContent/>;case'Model':return <ModelPage model={data.model}/>;
case'Visit':return <><section className="page-intro wrap"><h1 data-reveal="">See it in person</h1><p data-reveal="">Choose a car, tell us what you would like to know, and continue the conversation with the showroom.</p></section><section className="catalogue-section wrap"><div className="visit-grid"><VisitInfo/><div className="visit-form" data-reveal=""><h2>Book a viewing</h2><LeadForm/><p className="form-note">Looking to sell? <SiteLink className="text-link" href="/sell/">Sell or trade in your car.</SiteLink></p></div></div><MapFrame/></section></>;
case'Sell':return <><section className="page-intro wrap"><h1>Ready for your next car?</h1><p>Tell SAM about the car you drive today.</p></section><section className="catalogue-section wrap trade-grid"><TradeIntro/><div className="trade-form"><LeadForm kind="trade"/></div></section></>;
default:return <section className="section wrap"><h1>{data.page==='Offline'?'A moment offline.':'This road ends here.'}</h1><p style={{marginTop:28}}>{data.page==='Offline'?'Reconnect to refresh the collection or contact the showroom.':'The page could not be found. The collection is waiting in the catalogue.'}</p><SiteLink className="button ink" style={{marginTop:32}} href="/inventory/">View inventory<span className="button-icon"><Icon/></span></SiteLink></section>;}}
function Layout({data}){
 const ctx=useShowroom(),root=useRef(null),car=data.car,home=['Home','Wheel'].includes(data.page),tray=['Inventory','Shortlist'].includes(data.page)&&ctx.compare.length>0;
 useEffect(()=>{document.body.className=(home?'dark':'paper')+(tray?' has-comparison':'');},[home,tray]);
 useEffect(()=>{const cleanup=initContactButton();return cleanup;},[data.page,car?.id]);
 useEffect(()=>initAnalytics({carId:car?.id||null}),[car?.id]);
 useEffect(()=>{const destroy=registerInventoryTools(data.cars,data.site);return typeof destroy==='function'?destroy:undefined;},[data.cars,data.site]);
 useEffect(()=>{const videos=[...document.querySelectorAll('[data-showroom-film]')],pause=v=>{if(!v.paused&&document.pictureInPictureElement!==v&&document.fullscreenElement!==v&&!['picture-in-picture','fullscreen'].includes(v.webkitPresentationMode))v.pause();},observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)pause(e.target);}));videos.forEach(v=>observer.observe(v));const visibility=()=>{if(document.hidden)videos.forEach(pause);};document.addEventListener('visibilitychange',visibility);return()=>{observer.disconnect();document.removeEventListener('visibilitychange',visibility);videos.forEach(pause);};},[data.page]);
 useGSAP(()=>{if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;const parts=root.current.querySelectorAll('[data-hero-part]');if(parts.length&&!matchMedia('(pointer:coarse)').matches)gsap.from(parts,{y:20,opacity:0,duration:.65,stagger:.08,ease:'power3.out',clearProps:'all'});return initReveal(root.current);},{scope:root,dependencies:[data.page,car?.id],revertOnUpdate:true});
 return <div ref={root} className="contents" data-frontend="react-tailwind"><Head title={data.seo?.title}>
 <meta head-key="description" name="description" content={data.seo?.description}/>
 <link head-key="canonical" rel="canonical" href={data.seo?.url}/>
 <meta head-key="og-title" property="og:title" content={data.seo?.title}/>
 <meta head-key="og-description" property="og:description" content={data.seo?.description}/>
 <meta head-key="og-image" property="og:image" content={data.seo?.image}/>
 <meta head-key="og-url" property="og:url" content={data.seo?.url}/>
 <meta head-key="robots" name="robots" content={data.seo?.noindex?'noindex,follow':'index,follow'}/>
 <script head-key="schema" type="application/ld+json">{JSON.stringify(data.seo?.schema).replaceAll('<','\\u003c')}</script>
 </Head><Header home={home}/><main id="main"><Page data={data}/></main><Footer showMap={data.page!=='Visit'}/><Dialogs/><aside className="compare-tray dark" data-compare-tray="" hidden={!tray} aria-label="Your comparison"><p><span data-compare-count="">{ctx.compare.length}</span> cars to compare</p><SiteLink className="button" href={'/compare/?cars='+ctx.compare.join(',')} data-compare-link="">Compare cars</SiteLink></aside>{car&&<aside className="mobile-enquiry-bar" data-mobile-enquiry="" aria-label={'Enquire about '+car.name}><button className="button ink" type="button" data-enquire={car.status==='sold'?'':car.id} onClick={()=>ctx.setEnquiry(car.status==='sold'?'':car.id)}>{car.status==='sold'?'Ask about similar cars':'Book a viewing'}</button><SiteLink className="button secondary" href={'tel:'+data.site.phone}>Call SAM</SiteLink></aside>}<SiteLink className="whatsapp-float" data-whatsapp-float="" href={enquiryURL(data.site,car)} target="_blank" rel="noopener" aria-label={car?'Enquire on WhatsApp about '+car.name:'Chat with SAM on WhatsApp'}><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 .8A15.1 15.1 0 0 0 3 23.5L.8 31.2l7.9-2.1A15.2 15.2 0 1 0 16 .8Zm0 27.5c-2.3 0-4.4-.6-6.3-1.8l-.5-.3-4.7 1.3 1.3-4.6-.3-.5A12.5 12.5 0 1 1 16 28.3Zm6.9-9.4c-.4-.2-2.2-1.1-2.6-1.2-.3-.1-.6-.2-.8.2l-1.2 1.4c-.2.2-.4.3-.8.1a10.2 10.2 0 0 1-4.9-4.3c-.4-.6.4-.6 1.1-2 .1-.3.1-.5 0-.7l-1.2-2.9c-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .5a4 4 0 0 0-1.3 3c0 1.8 1.3 3.5 1.5 3.7.2.3 2.6 4 6.3 5.6 2.3 1 3.3 1.1 4.5.9.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.4-.3-.8-.5Z"/></svg><span>WhatsApp SAM</span></SiteLink></div>;
}
export default function PublicApp(){const data=usePage().props;return <ShowroomProvider data={data}><Layout data={data}/></ShowroomProvider>;}
