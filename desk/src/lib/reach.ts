/* Reach: every place a dealer's car can show up, and the honest way each one
   is reached. Researched October 1, 2026 from each company's own pages:
   - Facebook stopped taking dealer vehicle listings on Marketplace from Pages
     and feeds (January 30, 2023), so Marketplace is posted from the dealer's
     own phone, after they accept our terms.
   - Google, CarGurus, Cars.com, Autotrader and Carsforsale.com take an
     inventory feed; most charge a monthly listing package.
   - Craigslist charges dealers about $5 a vehicle and has no dealer feed.
   - Instagram, Facebook Pages, TikTok and YouTube publish through each
     platform's official API with the dealer's own account connected. */

export type How = 'phone' | 'feed' | 'api' | 'site';
export type Channel = {
  id: string; name: string; logo: string; wide?: boolean; group: 'phone' | 'social' | 'listings' | 'yours';
  how: How; what: string; cost: string; price: string; need: string;
  terms?: 'marketplace';            // needs a signed agreement before it turns on
};

export const GROUP_TITLE: Record<Channel['group'], string> = { phone: 'From Your Phone', social: 'Social', listings: 'Car Sites', yours: 'Your Website' };
export const HOW_LABEL: Record<How, string> = { phone: 'From your phone', feed: 'Inventory feed', api: 'Official API', site: 'Built by Obavia' };

export const CHANNELS: Channel[] = [
  { id: 'marketplace', price: 'Free', name: 'Facebook Marketplace', logo: './systems/facebook.png', group: 'phone', how: 'phone', terms: 'marketplace',
    what: 'We get each car’s listing ready and fill it into Marketplace on your phone, signed in as you. You look it over and post it.',
    cost: 'Free to post.', need: 'Your own Facebook account, and the Marketplace terms signed.' },
  { id: 'offerup', price: 'Free', name: 'OfferUp', logo: './reach/offerup.svg', wide: true, group: 'phone', how: 'phone',
    what: 'The same ready-made listing, filled into OfferUp on your phone for you to post.',
    cost: 'Free to post; OfferUp sells optional promotion.', need: 'Your OfferUp account, and terms like Marketplace’s before it turns on.' },
  { id: 'craigslist', price: 'About $5 a car', name: 'Craigslist', logo: './reach/craigslist.svg', wide: true, group: 'phone', how: 'phone',
    what: 'Title, price, photos and description filled into Craigslist’s cars-and-trucks-by-dealer form on your phone.',
    cost: 'Craigslist charges dealers about $5 a car.', need: 'Your Craigslist account with a card on file.' },
  { id: 'facebook-page', price: 'Free', name: 'Facebook Page', logo: './systems/facebook.png', group: 'social', how: 'api',
    what: 'Each new car posts to your dealership’s Facebook Page with its photos and price.',
    cost: 'Free.', need: 'Your Facebook Page connected through Meta’s official login.' },
  { id: 'instagram', price: 'Free', name: 'Instagram', logo: './reach/instagram.svg', group: 'social', how: 'api',
    what: 'A photo post or reel for each car on your dealership’s Instagram.',
    cost: 'Free.', need: 'An Instagram business account linked to your Facebook Page.' },
  { id: 'tiktok', price: 'Free', name: 'TikTok', logo: './reach/tiktok.svg', group: 'social', how: 'api',
    what: 'A short walkaround video for each car, posted to your TikTok.',
    cost: 'Free.', need: 'Your TikTok account connected, and a walkaround video of the car.' },
  { id: 'youtube', price: 'Free', name: 'YouTube', logo: './reach/youtube.svg', group: 'social', how: 'api',
    what: 'Walkarounds as YouTube Shorts, titled and described from the car’s record.',
    cost: 'Free.', need: 'Your YouTube channel connected.' },
  { id: 'google', price: 'Free listings, paid ads', name: 'Google', logo: './reach/google.svg', group: 'listings', how: 'feed',
    what: 'Your cars in Google’s vehicle listings, sent as a daily inventory feed.',
    cost: 'Listings can be free; Google vehicle ads are paid by click.', need: 'A Google Merchant Center account and a website for each car.' },
  { id: 'cargurus', price: 'Free or paid package', name: 'CarGurus', logo: './systems/cargurus.png', wide: true, group: 'listings', how: 'feed',
    what: 'Your whole lot sent to CarGurus every night: price, mileage, photos and VIN.',
    cost: 'Basic listings or a paid package with CarGurus.', need: 'A CarGurus dealer account.' },
  { id: 'carscom', price: 'Paid package', name: 'Cars.com', logo: './systems/carscom.png', wide: true, group: 'listings', how: 'feed',
    what: 'Your lot sent to Cars.com every night.', cost: 'A monthly package with Cars.com.', need: 'A Cars.com dealer account.' },
  { id: 'autotrader', price: 'Paid package', name: 'Autotrader', logo: './systems/autotrader.png', wide: true, group: 'listings', how: 'feed',
    what: 'Your lot sent to Autotrader every night.', cost: 'A monthly package with Autotrader.', need: 'An Autotrader dealer account.' },
  { id: 'carsforsale', price: 'Paid package', name: 'Carsforsale.com', logo: './systems/carsforsale.png', wide: true, group: 'listings', how: 'feed',
    what: 'Your lot sent to Carsforsale.com every night.', cost: 'A monthly package with Carsforsale.com.', need: 'A Carsforsale.com dealer account.' },
  { id: 'website', price: 'Part of Reach', name: 'Your Website', logo: '', group: 'yours', how: 'site',
    what: 'A page for every car, built from the Desk: real photos, the real price, your licence number. A sold car becomes “Sold, see similar”.',
    cost: 'Part of Reach, or on its own.', need: 'Your domain, or one we set up for you.' },
];

export const channelById = (id: string) => CHANNELS.find(c => c.id === id);
