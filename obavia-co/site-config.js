// Public same-origin waitlist configuration. No credentials or account access.
window.OBAVIA_SITE_CONFIG=Object.freeze({marketingOrigin:['https://obavia.co','https://www.obavia.co'].includes(location.origin)?location.origin:null,waitlistPath:'/api/waitlist'});
