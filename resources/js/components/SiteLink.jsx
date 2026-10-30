import React from 'react';
import {Link} from '@inertiajs/react';
export function SiteLink({href,children,...props}){
 const internal=typeof href==='string'&&href.startsWith('/')&&!href.startsWith('//')&&!/^\/(assets|storage|build)\//.test(href);
 return internal?<Link href={href} {...props}>{children}</Link>:<a href={href} {...props}>{children}</a>;
}
