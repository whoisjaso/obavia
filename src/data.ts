export type VehicleCategory = 'Sedans' | 'SUVs' | 'Vans' | 'Coupes';

export type Vehicle = {
  id: string;
  brand: string;
  name: string;
  category: VehicleCategory;
  image: string;
  seats: number;
  bags: number;
  gearbox: string;
  price: number;
  engine: string;
  power: string;
  acceleration: string;
  description: string;
};

export const vehicles: Vehicle[] = [
  {
    id: 's-class',
    brand: 'Mercedes-Benz',
    name: 'S-Class',
    category: 'Sedans',
    image: '/assets/vehicle-sclass.jpg',
    seats: 4,
    bags: 3,
    gearbox: 'Automatic',
    price: 250,
    engine: '3.0L inline 6 turbo',
    power: '367 hp',
    acceleration: '5.4 s',
    description:
      'The benchmark for executive travel. Refined performance, absolute comfort, and timeless design.',
  },
  {
    id: '7-series',
    brand: 'BMW',
    name: '7 Series',
    category: 'Sedans',
    image: '/assets/vehicle-sedan-side.jpg',
    seats: 4,
    bags: 3,
    gearbox: 'Automatic',
    price: 235,
    engine: '3.0L twinpower turbo',
    power: '375 hp',
    acceleration: '5.2 s',
    description:
      'A reserved executive sedan with a quiet cabin, precise ride, and private rear-seat comfort.',
  },
  {
    id: 'autobiography',
    brand: 'Range Rover',
    name: 'Autobiography',
    category: 'SUVs',
    image: '/assets/vehicle-noir.jpg',
    seats: 4,
    bags: 4,
    gearbox: 'Automatic',
    price: 310,
    engine: '4.4L V8 twin turbo',
    power: '523 hp',
    acceleration: '4.6 s',
    description:
      'A composed luxury SUV for clients who need presence, luggage capacity, and a silent cabin.',
  },
  {
    id: 'v-class',
    brand: 'Mercedes-Benz',
    name: 'V-Class',
    category: 'Vans',
    image: '/assets/vehicle-van.jpg',
    seats: 6,
    bags: 6,
    gearbox: 'Automatic',
    price: 285,
    engine: '2.0L diesel turbo',
    power: '237 hp',
    acceleration: '8.8 s',
    description:
      'A discreet people carrier for airport arrivals, private events, and group executive travel.',
  },
];

export const bookings = [
  {
    date: 'May 24, 2025',
    time: '10:00 AM',
    vehicle: 'Mercedes-Benz S-Class',
    customer: 'James Anderson',
    location: 'Downtown Office, New York',
    status: 'Confirmed',
  },
  {
    date: 'May 24, 2025',
    time: '4:00 PM',
    vehicle: 'Range Rover Autobiography',
    customer: 'Sarah Williams',
    location: 'Teterboro Arrival',
    status: 'Driver Assigned',
  },
  {
    date: 'May 21, 2025',
    time: '9:00 AM',
    vehicle: 'BMW 7 Series',
    customer: 'Michael Brown',
    location: 'SoHo House, Manhattan',
    status: 'Completed',
  },
  {
    date: 'May 21, 2025',
    time: '2:00 PM',
    vehicle: 'Mercedes-Benz V-Class',
    customer: 'David Lee',
    location: 'Private Terminal',
    status: 'Confirmed',
  },
];

export const locations = [
  'Downtown Office',
  'Private Terminal',
  'Home Address',
  'Hotel Entrance',
  'Member Lounge',
];
