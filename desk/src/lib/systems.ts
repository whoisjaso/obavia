/* What a dealer runs today, so we can move their cars and deals over.
   Logos are each vendor's own, taken from its site (desk/public/systems).
   A logo drawn in white sits on the vendor's own header colour. */

export type SystemKind = 'independent' | 'franchise' | 'powersports' | 'inventory' | 'crm' | 'listings' | 'books';
export type System = { id: string; name: string; kind: SystemKind; logo?: string; bg?: string; alias?: string[]; wide?: boolean };

/** Logos that are wordmarks, not square marks: they get a wide tile so they read at full size. */
const WIDE = new Set(['autoraptor', 'autotrader', 'carscom', 'carsforsale', 'dealercarsearch', 'dealerclick', 'dealrcloud', 'dominion', 'elead', 'frazer', 'keyloop', 'quickbooks', 'reconvelocity', 'selly', 'vauto', 'automanager', 'pbs', 'cargurus']);

export const KIND_TITLE: Record<SystemKind, string> = {
  independent: 'Used Car And Buy Here Pay Here',
  franchise: 'Franchise Dealer Software',
  powersports: 'Powersports, RV And Trailers',
  inventory: 'Inventory, Pricing And Recon',
  crm: 'Customer Follow-Up (CRM)',
  listings: 'Websites And Listings',
  books: 'Books And Sheets',
};

const s = (id: string, name: string, kind: SystemKind, extra: Partial<System> = {}): System => ({ id, name, kind, logo: `./systems/${id}.png`, wide: WIDE.has(id), ...extra });

export const SYSTEMS: System[] = [
  s('frazer', 'Frazer', 'independent', { bg: '#1268B3' }),
  s('dealercenter', 'DealerCenter', 'independent'),
  s('waynereaves', 'Wayne Reaves', 'independent'),
  s('automanager', 'AutoManager', 'independent', { alias: ['DeskManager'] }),
  s('dealersocket', 'DealerSocket', 'independent', { alias: ['IDMS', 'FEX'] }),
  s('dealerclick', 'DealerClick', 'independent'),
  s('dealerscloud', 'DealersCloud', 'independent'),
  s('lotwizard', 'Lot Wizard', 'independent'),
  s('zeus', 'Zeus Concepts', 'independent'),
  s('dealrcloud', 'dealr.cloud', 'independent'),
  s('carsforsale', 'Carsforsale.com', 'independent'),
  s('promax', 'ProMax', 'independent'),
  s('dealercarsearch', 'Dealer Car Search', 'independent'),

  s('cdk', 'CDK Global', 'franchise', { alias: ['CDK Drive'] }),
  s('reynolds', 'Reynolds And Reynolds', 'franchise', { alias: ['ERA-IGNITE', 'Reynolds'] }),
  s('dealertrack', 'Dealertrack', 'franchise'),
  s('tekion', 'Tekion', 'franchise'),
  s('pbs', 'PBS Systems', 'franchise'),
  s('autosoft', 'Autosoft', 'franchise'),
  s('dominion', 'Dominion', 'franchise', { bg: '#1D2B45' }),
  s('dealerbuilt', 'DealerBuilt', 'franchise'),
  s('keyloop', 'Keyloop', 'franchise'),

  s('lightspeed', 'Lightspeed DMS', 'powersports'),
  s('blackpurl', 'Blackpurl', 'powersports'),
  s('bitdms', 'BiT DMS', 'powersports'),
  s('dealerspike', 'Dealer Spike', 'powersports', { alias: ['Trailer Central'] }),

  s('vauto', 'vAuto', 'inventory', { alias: ['Provision'] }),
  s('lotlinx', 'LotLinx', 'inventory'),
  s('homenet', 'HomeNet', 'inventory'),
  s('rapidrecon', 'Rapid Recon', 'inventory'),
  s('carketa', 'Carketa', 'inventory'),
  s('reconvelocity', 'Velocity Automotive', 'inventory', { alias: ['Recon Velocity'] }),
  s('dealerslink', 'Dealerslink', 'inventory'),

  s('vinsolutions', 'VinSolutions', 'crm'),
  s('elead', 'Elead', 'crm', { alias: ['CDK CRM'] }),
  s('drivecentric', 'DriveCentric', 'crm'),
  s('autoraptor', 'AutoRaptor', 'crm'),
  s('selly', 'Selly Automotive', 'crm', { bg: '#213246' }),
  s('fullpath', 'Fullpath', 'crm'),

  s('dealercom', 'Dealer.com', 'listings'),
  s('dealeron', 'DealerOn', 'listings'),
  s('dealerinspire', 'Dealer Inspire', 'listings'),
  s('cargurus', 'CarGurus', 'listings'),
  s('autotrader', 'Autotrader', 'listings'),
  s('carscom', 'Cars.com', 'listings'),

  s('quickbooks', 'QuickBooks', 'books'),
  s('excel', 'Excel', 'books'),
  s('sheets', 'Google Sheets', 'books'),
  { id: 'paper', name: 'Pen And Paper', kind: 'books' },
];

/** The ones most lots name first. Everything else is a search away. */
export const COMMON = ['frazer', 'dealercenter', 'waynereaves', 'automanager', 'dealersocket', 'cdk', 'reynolds', 'dealertrack', 'tekion', 'excel', 'sheets', 'paper'];

export function searchSystems(q: string): System[] {
  const t = q.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!t) return [];
  return SYSTEMS.filter(x => [x.name, ...(x.alias ?? [])].some(n => n.toLowerCase().replace(/[^a-z0-9]/g, '').includes(t)));
}

export const systemById = (id: string) => SYSTEMS.find(x => x.id === id);
