// Production public entry has no account or loopback destination.
export function waitlistEndpoint(config,currentOrigin){if(config?.marketingOrigin!==currentOrigin||config?.waitlistPath!=='/api/waitlist')return null;return new URL('/api/waitlist',currentOrigin).href;}
for(const link of document.querySelectorAll('[data-app-entry],[data-app-signup]')){link.href='./waitlist';link.textContent='Join the Waitlist';}
