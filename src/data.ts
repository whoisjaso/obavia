export type VehicleCategory = 'Active Fleet' | 'Currently Rented' | 'Phase-Out Watch';

const ledgerVehicleImage = '/assets/fleet-ledger-sedan.svg';

export const brandDoctrine = {
  oneLine: 'A private rental house with published standards and nothing hidden.',
  trustPromise: 'Published standards. Real availability. No hidden terms.',
  dignityPromise: 'Private rental dignity for Houston weekly mobility.',
  fleetPromise: 'Real availability, visible standards, no hidden terms.',
  accessPromise: 'Review the standard before you request access.',
} as const;

export const confirmedTerms = {
  standardWeeklyRate: 250,
  hardshipBridgeDiscountPercent: 20,
  hardshipBridgeWeeks: 'Weeks 1-2',
  hardshipBridgeRate: 200,
  hardshipBridgeMinimum: 100,
  lossOfUseDailyRate: 40.22,
  customerAddress: '8774 Almeda Genoa Road, Houston, TX 77075',
  customerAddressLabel: 'Almeda 2',
  serviceArea: 'Houston metro',
  tollRoads: ['Sam Houston Tollway', 'Hardy Toll Road', 'Westpark Tollway'],
  fuelPolicy: 'Delivered at recorded level; return at no less than delivered level.',
  fuelPolicyShort: 'Return at delivered fuel level',
  rentalStructure: 'Open-ended continuous weekly rental',
  privateHandoffCopy: 'Confirmed member handoff instructions are sent privately.',
} as const;

export const formatMoney = (value: number) =>
  value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });

export const standardWeeklyRateLabel = `${formatMoney(confirmedTerms.standardWeeklyRate)}/week`;
export const hardshipBridgeRateLabel = `${formatMoney(confirmedTerms.hardshipBridgeRate)}/week`;
export const hardshipBridgeMinimumLabel = formatMoney(confirmedTerms.hardshipBridgeMinimum);
export const lossOfUseRateLabel = `${formatMoney(confirmedTerms.lossOfUseDailyRate)}/day`;

export type FleetLedgerUnit = {
  id: string;
  year: number;
  brand: string;
  name: string;
  trim?: string;
  color?: string;
  category: VehicleCategory;
  status: string;
  publicStatus: string;
  statusDetail: string;
  image: string;
  presentationNote: string;
  rateLabel: string;
  description: string;
};

export const fleetLedger: FleetLedgerUnit[] = [
  {
    id: 'nissan-sentra-sr-special-edition-2012',
    year: 2012,
    brand: 'Nissan',
    name: 'Sentra',
    trim: 'SR Special Edition',
    color: 'Metallic Blue',
    category: 'Currently Rented',
    status: 'Active, rented',
    publicStatus: 'Currently rented',
    statusDetail: 'Returns to fleet when the current open-ended agreement closes.',
    image: ledgerVehicleImage,
    presentationNote: 'Active ledger unit presented with full OBAVIA dignity while in fleet.',
    rateLabel: standardWeeklyRateLabel,
    description:
      'A compact standard-tier sedan for steady weekly mobility, handled with the same restraint and care as every OBAVIA unit.',
  },
  {
    id: 'chevy-malibu-2015',
    year: 2015,
    brand: 'Chevy',
    name: 'Malibu',
    category: 'Active Fleet',
    status: 'Active',
    publicStatus: 'Active',
    statusDetail: 'Proven standard-tier unit for Houston weekly mobility.',
    image: ledgerVehicleImage,
    presentationNote: 'Proven unit in active ledger.',
    rateLabel: standardWeeklyRateLabel,
    description:
      'A composed weekly sedan for members who need reliable local movement without rental-counter noise.',
  },
  {
    id: 'chrysler-200-2015',
    year: 2015,
    brand: 'Chrysler',
    name: '200',
    category: 'Phase-Out Watch',
    status: 'Active, phase-out list',
    publicStatus: 'Active, phase-out list',
    statusDetail: 'Maintained while active; no new acquisitions of this platform.',
    image: ledgerVehicleImage,
    presentationNote: 'Active ledger unit monitored for phase-out.',
    rateLabel: standardWeeklyRateLabel,
    description:
      'A reserved standard-tier sedan kept in the ledger while OBAVIA transitions toward the next backbone units.',
  },
];

export type Vehicle = FleetLedgerUnit & {
  displayName: string;
  shortName: string;
};

export const vehicles: Vehicle[] = fleetLedger.map((unit) => ({
  ...unit,
  displayName: `${unit.year} ${unit.brand} ${unit.name}${unit.trim ? ` ${unit.trim}` : ''}`,
  shortName: `${unit.brand} ${unit.name}`,
}));

export const fleetStats = {
  activeUnits: fleetLedger.length,
  rentedUnits: fleetLedger.filter((unit) => unit.status.includes('rented')).length,
  phaseOutUnits: fleetLedger.filter((unit) => unit.status.includes('phase-out')).length,
} as const;

export const bookings = [
  {
    status: 'Active rental',
    vehicle: vehicles[0].displayName,
    customer: 'Confirmed member',
    location: confirmedTerms.serviceArea,
    control: confirmedTerms.rentalStructure,
  },
] as const;

export const locations = [
  confirmedTerms.customerAddress,
  confirmedTerms.serviceArea,
  'Private handoff instructions after confirmation',
] as const;
