import React from 'react';
import {photoPosition,photoSrcset} from '../lib/data';
export function PhotoFrame({photo,priority=false,eager=false,sold=false,className=''}){
 if(!photo)return null;const width=photo.srcWidth||photo.width;
 return <span className={'car-image-frame '+className}><picture><source media="(max-width:767px)" srcSet={photoSrcset(photo).split(',').slice(0,2).join(',')} sizes="82vw"/><img src={photo.medium} srcSet={photoSrcset(photo)} sizes="(max-width:767px) calc(100vw - 40px), (max-width:1199px) 45vw, 33vw" width={width} height={Math.round(width*photo.height/photo.width)} alt={photo.alt} loading={priority||eager?'eager':'lazy'} fetchPriority={priority?'high':eager?'low':undefined} decoding="async" style={{objectPosition:photoPosition(photo)}}/></picture><span className="photo-caption" data-photo-caption="" hidden={!photo.representative&&!sold}>{sold?'Sold':'Representative image'}</span></span>;
}
