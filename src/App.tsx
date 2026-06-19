import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarDays,
  CalendarCheck,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleUserRound,
  CircleX,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  Gauge,
  Headphones,
  Heart,
  Home as HomeIcon,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldAlert,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  WalletCards,
  Wrench,
  X,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BrandMark } from './components/BrandMark';
import { VehicleCard } from './components/VehicleCard';
import {
  brandDoctrine,
  bookings,
  confirmedStandardRows,
  confirmedTerms,
  fleetStats,
  hardshipBridgeMinimumLabel,
  hardshipBridgeRateLabel,
  locations,
  lossOfUseRateLabel,
  publicStandards,
  standardWeeklyRateLabel,
  vehicles,
  type VehicleCategory,
} from './data';

const MENU_AMBIENCE_VIDEO_ID = 'NW8Cxc3uh5E';
const MENU_AMBIENCE_TARGET_RATE = 0.77;
const MENU_INTERACTION_SOUND_VIDEO_ID = 'NiMJ6FChRfw';
const MENU_INTERACTION_SOUND_EVENT = 'obavia:menu-interaction-sound';

type MenuInteractionSoundKind = 'hover' | 'click';

type YouTubePlayerEvent = {
  target: YouTubePlayer;
};

type YouTubePlayer = {
  destroy: () => void;
  getAvailablePlaybackRates?: () => number[];
  getIframe?: () => HTMLIFrameElement;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackRate?: (rate: number) => void;
  stopVideo: () => void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement | string,
    options: {
      height?: string;
      host?: string;
      playerVars?: Record<string, number | string>;
      videoId: string;
      width?: string;
      events?: {
        onReady?: (event: YouTubePlayerEvent) => void;
        onStateChange?: (event: YouTubePlayerEvent & { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState?: {
    PLAYING: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const existingReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        existingReady?.();
        resolve();
      };

      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      }
    });
  }

  return youtubeApiPromise;
}

function getClosestPlaybackRate(player: YouTubePlayer) {
  const availableRates = player.getAvailablePlaybackRates?.();

  if (!availableRates?.length) {
    return 0.75;
  }

  return availableRates.reduce((closest, rate) => {
    const currentDelta = Math.abs(rate - MENU_AMBIENCE_TARGET_RATE);
    const closestDelta = Math.abs(closest - MENU_AMBIENCE_TARGET_RATE);
    return currentDelta < closestDelta ? rate : closest;
  }, availableRates[0]);
}

function playMenuAmbience(player: YouTubePlayer) {
  try {
    player.seekTo?.(0, true);
  } catch {
    // The YouTube player may not accept seeks until metadata is ready.
  }

  try {
    player.playVideo();
  } catch {
    return;
  }

  const applyRate = () => {
    try {
      player.setPlaybackRate?.(getClosestPlaybackRate(player));
    } catch {
      // Some embeds restrict playback-rate changes; normal speed is the fallback.
    }
  };

  applyRate();
  window.setTimeout(applyRate, 700);
}

function emitMenuInteractionSound(kind: MenuInteractionSoundKind) {
  window.dispatchEvent(new CustomEvent<MenuInteractionSoundKind>(MENU_INTERACTION_SOUND_EVENT, { detail: kind }));
}

function MenuInteractionSoundLayer() {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const pendingPlayRef = useRef<MenuInteractionSoundKind | null>(null);
  const lastHoverAtRef = useRef(0);

  const playInteractionSound = (kind: MenuInteractionSoundKind) => {
    if (kind === 'hover') {
      const now = window.performance.now();
      if (now - lastHoverAtRef.current < 420) {
        return;
      }
      lastHoverAtRef.current = now;
    }

    const player = playerRef.current;
    if (!player) {
      pendingPlayRef.current = kind;
      return;
    }

    try {
      player.seekTo?.(0, true);
    } catch {
      // The interaction player may not accept seeks until metadata is ready.
    }

    try {
      player.setPlaybackRate?.(1);
      player.playVideo();
    } catch {
      // Browser media policy may block hover sound before a user gesture.
    }
  };

  useEffect(() => {
    const handleInteractionSound = (event: Event) => {
      playInteractionSound((event as CustomEvent<MenuInteractionSoundKind>).detail ?? 'click');
    };

    window.addEventListener(MENU_INTERACTION_SOUND_EVENT, handleInteractionSound);
    return () => window.removeEventListener(MENU_INTERACTION_SOUND_EVENT, handleInteractionSound);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !holderRef.current || playerRef.current || !window.YT?.Player) {
        return;
      }

      playerRef.current = new window.YT.Player(holderRef.current, {
        height: '1',
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        videoId: MENU_INTERACTION_SOUND_VIDEO_ID,
        width: '1',
        events: {
          onReady: ({ target }) => {
            target.getIframe?.().setAttribute('allow', 'autoplay; encrypted-media');
            if (pendingPlayRef.current) {
              playInteractionSound(pendingPlayRef.current);
              pendingPlayRef.current = null;
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  return (
    <div className="menu-ambience-player" aria-hidden="true">
      <div ref={holderRef} />
    </div>
  );
}

function MenuAmbiencePlayer({ active }: { active: boolean }) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const shouldPlayRef = useRef(active);

  useEffect(() => {
    shouldPlayRef.current = active;
  }, [active]);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !holderRef.current || playerRef.current || !window.YT?.Player) {
        return;
      }

      playerRef.current = new window.YT.Player(holderRef.current, {
        height: '1',
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        videoId: MENU_AMBIENCE_VIDEO_ID,
        width: '1',
        events: {
          onReady: ({ target }) => {
            target.getIframe?.().setAttribute('allow', 'autoplay; encrypted-media');
            if (shouldPlayRef.current) {
              playMenuAmbience(target);
            }
          },
          onStateChange: ({ target, data }) => {
            if (data === window.YT?.PlayerState?.PLAYING) {
              try {
                target.setPlaybackRate?.(getClosestPlaybackRate(target));
              } catch {
                // Normal speed is the fallback if YouTube rejects the rate.
              }
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (active) {
      playMenuAmbience(player);
      return;
    }

    try {
      player.stopVideo();
    } catch {
      player.pauseVideo();
    }
  }, [active]);

  return (
    <div className="menu-ambience-player" aria-hidden="true">
      <div ref={holderRef} />
    </div>
  );
}

type Route =
  | 'home'
  | 'book'
  | 'fleet'
  | 'vehicle'
  | 'about'
  | 'membership'
  | 'member'
  | 'admin'
  | 'mobile';

const navItems = [
  { label: 'Vehicles', route: 'fleet' },
  { label: 'Standards', route: 'vehicle' },
  { label: 'About', route: 'about' },
  { label: 'Access', route: 'membership' },
] as const;

const dashboardNav = ['Rental', 'Renewal', 'Contract', 'Support'] as const;

type DashboardNavLabel = (typeof dashboardNav)[number];

const adminNav = [
  { label: 'Inventory', icon: CarFront },
  { label: 'Renewals', icon: CalendarCheck },
  { label: 'Overdues', icon: ShieldAlert },
  { label: 'Contracts', icon: FileCheck2 },
  { label: 'Portal', icon: UsersRound },
] as const;

type AdminNavLabel = (typeof adminNav)[number]['label'];

const commandMetrics = [
  ['Fleet Ledger', String(fleetStats.activeUnits), 'Active units only'],
  ['Active Rental', String(fleetStats.rentedUnits), confirmedTerms.rentalStructure],
  ['Standard Rate', standardWeeklyRateLabel, 'Confirmed weekly baseline'],
  ['Loss-of-Use', lossOfUseRateLabel, 'Accepted insurer precedent'],
] as const;

const bookingPipeline = [
  ['Active Rental', 'Confirmed member', vehicles[0].displayName, confirmedTerms.rentalStructure],
  ['Available Review', 'Concierge', vehicles[1].displayName, standardWeeklyRateLabel],
  ['Phase-Out Watch', 'Operations', vehicles[2].displayName, 'No new acquisitions'],
] as const;

const fleetStatus = vehicles.map((vehicle) => [
  vehicle.displayName,
  vehicle.publicStatus,
  vehicle.rateLabel,
  vehicle.statusDetail,
] as const);

const cashExposure = [
  ['Standard Weekly Rate', standardWeeklyRateLabel],
  ['Bridge Rate', hardshipBridgeRateLabel],
  ['Bridge Minimum', hardshipBridgeMinimumLabel],
  ['Loss-of-Use Precedent', lossOfUseRateLabel],
] as const;

const commandAlerts = [
  `${vehicles[0].displayName} is currently rented.`,
  `${vehicles[2].displayName} is active but on phase-out watch.`,
  'Confirmed member handoff instructions stay private.',
] as const;

const tripStages = [
  'Inquiry',
  'Member Approved',
  'Payment Control',
  'Vehicle Assigned',
  'Driver Assigned',
  'Vehicle Prepped',
  'Inspection',
  'Released',
  'Active Rental',
  'Return Inspection',
  'Closed',
] as const;

const requiredGates = [
  ['Member approved', true],
  ['License verified', true],
  ['Payment control secured', true],
  ['Vehicle assigned', true],
  ['Driver option selected', true],
  ['Inspection complete', false],
] as const;

const dispatchRows = vehicles.map((vehicle) => [
  vehicle.shortName,
  vehicle.publicStatus,
  vehicle.category,
  vehicle.rateLabel,
  vehicle.statusDetail,
] as const);

const driverChecklist = [
  'Confirm vehicle plate',
  'Upload exterior photos',
  'Upload interior photos',
  'Verify member identity',
  'Enter handoff PIN',
  'Start trip',
] as const;

const rolePermissions = [
  ['Owner / GM', 'Full', 'Full', 'Full', 'Full', 'Full'],
  ['Concierge', 'High', 'Create/Edit', 'Request only', 'Status only', 'No'],
  ['Dispatch', 'Limited', 'Operational', 'Full', 'No', 'No'],
  ['Driver', 'Minimal', 'No', 'Assigned only', 'No', 'No'],
  ['Fleet Prep', 'No', 'No', 'Status only', 'No', 'No'],
  ['Finance/Risk', 'High', 'Lock/unlock', 'No', 'Full', 'No'],
] as const;

const workOrders = [
  ['Fleet Review', vehicles[2].displayName, 'Phase-out watch', 'Jason approval required', 'No public arriving card'],
  ['Ledger Standard', vehicles[0].displayName, vehicles[0].publicStatus, 'Ledger truth required', 'Show confirmed record only'],
] as const;

const adminModules = [
  {
    label: 'Inventory',
    value: `${fleetStats.activeUnits} ledger units`,
    copy: 'Every public vehicle row comes from the active ledger.',
    control: 'Confirmed rows only',
    icon: CarFront,
  },
  {
    label: 'Renewals',
    value: standardWeeklyRateLabel,
    copy: 'Weekly continuation is tied to the open-ended rental structure.',
    control: confirmedTerms.rentalStructure,
    icon: CalendarCheck,
  },
  {
    label: 'Overdues',
    value: 'Ledger gated',
    copy: 'Overdue balances stay blank until a confirmed ledger entry exists.',
    control: 'No imagined balances',
    icon: ShieldAlert,
  },
  {
    label: 'Contracts',
    value: 'Packet control',
    copy: 'Contract presentation uses confirmed terms and vehicle ledger rows.',
    control: confirmedTerms.fuelPolicyShort,
    icon: FileCheck2,
  },
] as const;

const adminOverviewCards = [
  ['Inventory', `${fleetStats.activeUnits} active ledger units`, 'Only real units render.'],
  ['Renewals', standardWeeklyRateLabel, confirmedTerms.rentalStructure],
  ['Overdues', 'Ledger gated', 'No balances without proof.'],
  ['Contracts', 'Confirmed terms', 'Logo packet, confirmed rows.'],
] as const;

const inventoryRows = vehicles.map((vehicle) => [
  vehicle.displayName,
  vehicle.publicStatus,
  vehicle.rateLabel,
  vehicle.statusDetail,
] as const);

const renewalRows = vehicles.map((vehicle) => {
  const isActiveRental = vehicle.id === vehicles[0].id;
  const program = isActiveRental ? 'Active weekly rental' : vehicle.category;
  const action = isActiveRental ? 'Review weekly continuation' : 'No renewal action';

  return [
    vehicle.displayName,
    program,
    vehicle.rateLabel,
    action,
  ] as const;
});

const overdueControls = [
  ['Confirmed overdue ledger', 'No confirmed overdue row is published in this build.'],
  ['Loss-of-use precedent', `${lossOfUseRateLabel} is available only for documented claims.`],
  ['Hardship Bridge floor', `${hardshipBridgeMinimumLabel} remains the non-waivable minimum.`],
  ['Operator rule', 'Do not render balances, fees, or dates without ledger confirmation.'],
] as const;

const contractRows = [
  [vehicles[0].displayName, 'Active agreement', confirmedTerms.rentalStructure, confirmedTerms.fuelPolicyShort],
  ['Standard packet', 'Weekly access', standardWeeklyRateLabel, 'Published before request'],
  ['Hardship Bridge addendum', confirmedTerms.hardshipBridgeWeeks, hardshipBridgeRateLabel, `Minimum ${hardshipBridgeMinimumLabel}`],
  ['Claims demand precedent', 'Documented loss-of-use', lossOfUseRateLabel, 'Use with evidence only'],
] as const;

const memberSystemCards = [
  ['Rental', vehicles[0].displayName, confirmedTerms.rentalStructure],
  ['Renewal', standardWeeklyRateLabel, 'Published weekly baseline'],
  ['Contract', confirmedTerms.fuelPolicyShort, 'Visible before request'],
] as const;

const contractClauses = [
  ['Rental structure', confirmedTerms.rentalStructure],
  ['Standard weekly rate', standardWeeklyRateLabel],
  ['Fuel return', confirmedTerms.fuelPolicy],
  ['Hardship Bridge', `${confirmedTerms.hardshipBridgeDiscountPercent}% off ${confirmedTerms.hardshipBridgeWeeks}; ${hardshipBridgeRateLabel}; minimum ${hardshipBridgeMinimumLabel}`],
  ['Loss-of-use precedent', `${lossOfUseRateLabel} for documented claims`],
  ['Customer-facing address', `${confirmedTerms.customerAddressLabel}: ${confirmedTerms.customerAddress}`],
  ['Handoff instructions', confirmedTerms.privateHandoffCopy],
] as const;

const appCollections = [
  {
    title: 'Standard Weekly Fleet',
    copy: 'Published weekly access from the live ledger.',
    price: standardWeeklyRateLabel,
    icon: CalendarDays,
  },
  {
    title: 'Hardship Bridge',
    copy: `${confirmedTerms.hardshipBridgeDiscountPercent}% off ${confirmedTerms.hardshipBridgeWeeks}; reverts automatically.`,
    price: hardshipBridgeRateLabel,
    icon: ShieldCheck,
  },
  {
    title: 'Houston Service Area',
    copy: 'Built for real local movement across the Houston metro.',
    price: confirmedTerms.serviceArea,
    icon: MapPin,
  },
  {
    title: 'Fuel & Return Standard',
    copy: confirmedTerms.fuelPolicyShort,
    price: 'Recorded at delivery',
    icon: Gauge,
  },
  {
    title: 'Fleet Ledger',
    copy: 'Small fleet, real availability, one vehicle at a time.',
    price: `${fleetStats.activeUnits} active units`,
    icon: FileCheck2,
  },
] as const;

const appFleet = vehicles.map((vehicle) => ({
  id: vehicle.id,
  marque: `${vehicle.year} ${vehicle.brand}`,
  model: vehicle.name,
  collection: vehicle.category,
  status: vehicle.publicStatus,
  detail: vehicle.statusDetail,
  price: vehicle.rateLabel,
}));

const appMenuItems = [
  { label: 'Home', icon: HomeIcon },
  { label: 'Fleet Ledger', icon: CarFront },
  { label: 'Weekly Plans', icon: CalendarDays },
  { label: 'Hardship Bridge', icon: ShieldCheck },
  { label: 'Published Standards', icon: FileCheck2 },
  { label: 'Houston Service', icon: MapPin },
  { label: 'My Bookings', icon: CalendarCheck },
  { label: 'Favorites', icon: Heart },
  { label: 'Standards', icon: CircleCheck },
  { label: 'Payment Methods', icon: CreditCard },
  { label: 'Support', icon: Headphones },
  { label: 'Settings', icon: Settings },
  { label: 'Sign Out', icon: LogOut },
] as const;

const appBenefitRows = [
  ['Weekly Rental Access', 'yes', 'yes', 'no'],
  ['Confirmed Rate', standardWeeklyRateLabel, hardshipBridgeRateLabel, lossOfUseRateLabel],
  ['Term Structure', 'Open-ended', confirmedTerms.hardshipBridgeWeeks, 'Precedent'],
  ['Minimum Standard', 'Standard', hardshipBridgeMinimumLabel, 'Documented'],
  ['Fuel Standard', 'Recorded level', 'Recorded level', 'Documented'],
  ['Public Address', confirmedTerms.customerAddressLabel, confirmedTerms.customerAddressLabel, confirmedTerms.customerAddressLabel],
  ['Private Handoff Lot', 'Private', 'Private', 'Private'],
  ['Published Inventory', 'Ledger only', 'Ledger only', 'Ledger only'],
] as const;

const mobileFleetTabs = ['All', 'Active', 'Rented', 'Phase-out', 'Bridge', 'Houston'] as const;

type MobileFleetTab = (typeof mobileFleetTabs)[number];

type MobileScreenId =
  | 'splash'
  | 'home'
  | 'menu'
  | 'admin'
  | 'categories'
  | 'fleet'
  | 'detail'
  | 'booking'
  | 'membership'
  | 'benefits';

type MobileScreenSelect = (screen: MobileScreenId) => void;

type MobileScreenProps = {
  onSelect?: MobileScreenSelect;
};

const noopMobileSelect: MobileScreenSelect = () => undefined;

const collectionToFleetTab = (title: string): MobileFleetTab => {
  if (title.includes('Standard')) return 'Active';
  if (title.includes('Bridge')) return 'Bridge';
  if (title.includes('Houston')) return 'Houston';
  if (title.includes('Ledger')) return 'All';
  return 'All';
};

function getRoute(): Route {
  const hash = window.location.hash.replace('#', '');
  const baseHash = hash.split('/')[0];
  if (
    baseHash === 'book' ||
    baseHash === 'fleet' ||
    baseHash === 'vehicle' ||
    baseHash === 'about' ||
    baseHash === 'membership' ||
    baseHash === 'member' ||
    baseHash === 'admin' ||
    baseHash === 'mobile'
  ) {
    return baseHash;
  }
  return 'home';
}

function getMobileScreenFromHash(): MobileScreenId {
  const screen = window.location.hash.replace('#', '').split('/')[1];
  if (
    screen === 'splash' ||
    screen === 'home' ||
    screen === 'menu' ||
    screen === 'admin' ||
    screen === 'categories' ||
    screen === 'fleet' ||
    screen === 'detail' ||
    screen === 'booking' ||
    screen === 'membership' ||
    screen === 'benefits'
  ) {
    return screen;
  }

  return 'splash';
}

function go(route: Route) {
  window.location.hash = route === 'home' ? '' : route;
}

function useRoute() {
  const [route, setRoute] = useState<Route>(getRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  return route;
}

function useRevealMotion(route: Route) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) {
      gsap.set('.reveal', { autoAlpha: 1, y: 0, scale: 1 });
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.reveal').forEach((element) => {
        gsap.fromTo(
          element,
          { autoAlpha: 0.9, y: 12 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: element,
              start: 'top 90%',
              once: true,
            },
          },
        );
      });
    });

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [route]);
}

export function App() {
  const route = useRoute();
  useRevealMotion(route);

  return (
    <main className={`app route-${route}`}>
      <MenuInteractionSoundLayer />
      {route === 'home' ? <HomePage /> : null}
      {route === 'book' ? <BookingPage /> : null}
      {route === 'fleet' ? <FleetPage /> : null}
      {route === 'vehicle' ? <VehicleDetailPage /> : null}
      {route === 'about' ? <AboutPage /> : null}
      {route === 'membership' ? <MembershipPage /> : null}
      {route === 'member' ? <MemberDashboard /> : null}
      {route === 'admin' ? <AdminDashboard /> : null}
      {route === 'mobile' ? <MobileAppShowcase /> : null}
    </main>
  );
}

function SiteNav({
  tone = 'dark',
  active,
  compact = false,
  showBook = true,
  showBack = false,
}: {
  tone?: 'dark' | 'light';
  active?: Route;
  compact?: boolean;
  showBook?: boolean;
  showBack?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const overlayItems: Array<{ label: string; route: Route }> = [
    { label: 'Fleet Ledger', route: 'fleet' },
    { label: 'Published Standards', route: 'vehicle' },
    { label: 'Houston Service', route: 'about' },
    { label: 'Weekly Access', route: 'book' },
    { label: 'Member Portal', route: 'member' },
  ];
  const previewMenuSound = () => emitMenuInteractionSound('hover');
  const closeMenu = () => {
    emitMenuInteractionSound('click');
    setOpen(false);
  };
  const navigateFromMenu = (route: Route) => {
    emitMenuInteractionSound('click');
    go(route);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <header className={`site-nav ${tone} ${compact ? 'compact' : 'full'}`}>
      <div className="nav-left">
        {showBack ? (
          <button className="back-link nav-back" type="button" onClick={() => go('fleet')}>
            <ChevronLeft size={20} strokeWidth={1.6} />
            Back
          </button>
        ) : (
          <button
            aria-expanded={open}
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            className={`icon-button menu-button ${open ? 'is-open' : ''}`}
            type="button"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={26} strokeWidth={1.45} /> : <Menu size={27} strokeWidth={1.7} />}
            <span className="sr-only">{open ? 'Close navigation' : 'Open navigation'}</span>
          </button>
        )}

        {!compact ? (
          <nav className="nav-links" aria-label="Primary">
            {navItems.map((item) => (
              <button
                className={active === item.route ? 'active' : ''}
                key={item.label}
                type="button"
                onClick={() => go(item.route)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}
      </div>

      <button className="nav-brand" type="button" onClick={() => go('home')} aria-label="OBAVIA home">
        <BrandMark size={compact ? 58 : 56} tone="gold" />
      </button>

      <div className="nav-actions">
        <button type="button" onClick={() => go('member')}>
          Sign In
        </button>
        {showBook ? (
          <button className="outline-action" type="button" onClick={() => go('book')}>
            Request Access
          </button>
        ) : null}
      </div>

      {open ? (
        <div className={`site-menu-overlay ${tone}`} role="dialog" aria-modal="true" aria-label="OBAVIA navigation">
          <MenuAmbiencePlayer active={open} />
          <img className="site-menu-photo" src="/assets/hero-obavia-background.png" alt="" aria-hidden="true" />
          <div className="site-menu-wash" aria-hidden="true" />
          <button
            className="site-menu-close"
            type="button"
            onMouseEnter={previewMenuSound}
            onFocus={previewMenuSound}
            onClick={closeMenu}
            aria-label="Close navigation"
          >
            <X size={34} strokeWidth={1.15} />
          </button>
          <div className="site-menu-inner">
            <BrandMark size={82} tone="gold" />
            <nav className="site-menu-links" aria-label="Expanded navigation">
              {overlayItems.map((item, index) => {
                const itemIsActive = active ? active === item.route : index === 0;

                return (
                  <button
                    className={itemIsActive ? 'active' : ''}
                    key={item.label}
                    style={{ '--site-menu-index': index } as React.CSSProperties}
                    type="button"
                    onMouseEnter={previewMenuSound}
                    onFocus={previewMenuSound}
                    onClick={() => navigateFromMenu(item.route)}
                  >
                    <span>{item.label}</span>
                    {itemIsActive ? <i aria-hidden="true" /> : null}
                  </button>
                );
              })}
            </nav>
            <span className="site-menu-divider" aria-hidden="true" />
            <div className="site-menu-assist">
              <button
                type="button"
                onMouseEnter={previewMenuSound}
                onFocus={previewMenuSound}
                onClick={() => navigateFromMenu('member')}
              >
                Sign In
              </button>
              <button
                type="button"
                onMouseEnter={previewMenuSound}
                onFocus={previewMenuSound}
                onClick={() => navigateFromMenu('book')}
              >
                Request Access
              </button>
              <p>
                <Headphones size={17} strokeWidth={1.35} />
                <span>Concierge by confirmed appointment</span>
                <b aria-hidden="true">|</b>
                <span>{confirmedTerms.serviceArea}</span>
              </p>
              <button
                className="site-menu-admin-link"
                type="button"
                onMouseEnter={previewMenuSound}
                onFocus={previewMenuSound}
                onClick={() => navigateFromMenu('admin')}
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function HomePage() {
  return (
    <>
      <section className="hero-frame">
        <img className="hero-image" src="/assets/hero-obavia-background.png" alt="Private chauffeur beside an executive sedan" />
        <div className="hero-shade" />
        <SiteNav tone="dark" />

        <div className="hero-lockup reveal">
          <BrandMark size={116} tone="gold" />
          <h1>OBAVIA</h1>
          <p>Private Vehicle Rental</p>
        </div>

        <div className="hero-caption reveal">
          <h2>{brandDoctrine.trustPromise}</h2>
          <p>{brandDoctrine.dignityPromise}</p>
        </div>

        <button className="hero-scroll" type="button" onClick={() => go('fleet')}>
          View The Ledger
          <ArrowRight size={23} strokeWidth={1.3} />
        </button>
      </section>
      <HomeStandardsSection />
    </>
  );
}

function HomeStandardsSection() {
  return (
    <section className="standards-chapter dark-section" aria-label="OBAVIA published standards">
      <div className="standards-chapter-inner">
        <div className="standards-lede reveal">
          <BrandMark size={76} tone="gold" />
          <p>Published standards</p>
          <h2>Dignity is operational.</h2>
          <span>
            OBAVIA does not make people guess. The standard, the ledger, the rate, and the next step are shown
            before the request.
          </span>
          <button className="text-link" type="button" onClick={() => go('vehicle')}>
            Review The Standard
            <ArrowRight size={22} strokeWidth={1.35} />
          </button>
        </div>
        <div className="standard-pillar-grid reveal">
          {publicStandards.map((standard) => (
            <article key={standard.title}>
              <h3>{standard.title}</h3>
              <p>{standard.copy}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="confirmed-standard-panel reveal">
        <div className="confirmed-standard-head">
          <p>Confirmed terms only</p>
          <h2>{brandDoctrine.oneLine}</h2>
        </div>
        <div className="confirmed-standard-rows">
          {confirmedStandardRows.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="ledger-path reveal">
        <div>
          <span>Current ledger</span>
          <strong>{fleetStats.activeUnits}</strong>
          <p>active units shown from the fleet ledger</p>
        </div>
        <div>
          <span>Member posture</span>
          <strong>Calm</strong>
          <p>standards first, private handoff after confirmation</p>
        </div>
        <div>
          <span>Houston frame</span>
          <strong>{confirmedTerms.serviceArea}</strong>
          <p>{confirmedTerms.tollRoads.join(', ')}</p>
        </div>
      </div>
    </section>
  );
}

function BookingPage() {
  const [driver, setDriver] = useState<'with-driver' | 'self-drive'>('with-driver');
  const [notice, setNotice] = useState('');
  const selected = vehicles.find((vehicle) => vehicle.category === 'Active Fleet') ?? vehicles[0];

  return (
    <section className="light-page booking-page">
      <SiteNav tone="light" compact showBook={false} />
      <div className="booking-shell">
        <div className="page-title reveal">
          <h1>Request Weekly Access</h1>
          <p className="page-subcopy ink">{brandDoctrine.accessPromise}</p>
          <div className="steps" aria-label="Booking steps">
            {['Vehicle', 'Standards', 'Review', 'Payment'].map((step, index) => (
              <span className={index === 0 ? 'active' : ''} key={step}>
                {index + 1}. {step}
              </span>
            ))}
          </div>
        </div>

        <form
          className="booking-panel reveal"
          onSubmit={(event) => {
            event.preventDefault();
            setNotice('Request received. Member services will confirm availability and standards before anything moves.');
          }}
        >
          <div className="booking-vehicle">
            <div className="booking-ledger-card" aria-label={`${selected.displayName} ledger record`}>
              <span>{selected.year}</span>
              <strong>{selected.brand}</strong>
              <small>{selected.publicStatus}</small>
            </div>
            <div className="booking-summary">
              <p className="vehicle-brand">{selected.brand}</p>
              <h2>{selected.name}</h2>
              <p>{selected.category}</p>
              <SpecLine vehicle={selected} />
              <button className="text-link ink" type="button" onClick={() => go('fleet')}>
                Change Vehicle
                <ArrowRight size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="booking-fields">
            <div className="booking-fieldset">
              <h3>Pick-up</h3>
              <Field label="Pick-up Location" hiddenLabel>
                <select defaultValue="">
                  <option value="" disabled>
                    Select Location
                  </option>
                  {locations.map((location) => (
                    <option key={location}>{location}</option>
                  ))}
                </select>
              </Field>
              <div className="split-fields">
                <Field label="Pick-up Date" hiddenLabel>
                  <input aria-label="Pick-up Date" type="text" />
                </Field>
                <Field label="Pick-up Time" hiddenLabel>
                  <input aria-label="Pick-up Time" type="text" />
                </Field>
              </div>
            </div>

            <div className="booking-fieldset">
              <h3>Return</h3>
              <Field label="Return Location" hiddenLabel>
                <select defaultValue="">
                  <option value="" disabled>
                    Select Location
                  </option>
                  {locations.map((location) => (
                    <option key={location}>{location}</option>
                  ))}
                </select>
              </Field>
              <div className="split-fields">
                <Field label="Return Date" hiddenLabel>
                  <input aria-label="Return Date" type="text" />
                </Field>
                <Field label="Return Time" hiddenLabel>
                  <input aria-label="Return Time" type="text" />
                </Field>
              </div>
            </div>
          </div>

          <fieldset className="driver-choice">
            <legend>Driver</legend>
            <label>
              <input
                checked={driver === 'with-driver'}
                name="driver"
                type="radio"
                onChange={() => setDriver('with-driver')}
              />
              With Driver
            </label>
            <label>
              <input
                checked={driver === 'self-drive'}
                name="driver"
                type="radio"
                onChange={() => setDriver('self-drive')}
              />
              Self Drive
            </label>
          </fieldset>

          <button className="primary-ink booking-submit" type="submit">
            Request Review
          </button>
          {notice ? <p className="booking-notice">{notice}</p> : null}
        </form>
      </div>
    </section>
  );
}

function FleetPage() {
  const [category, setCategory] = useState<'All Vehicles' | VehicleCategory>('All Vehicles');
  const filtered = useMemo(
    () => (category === 'All Vehicles' ? vehicles : vehicles.filter((vehicle) => vehicle.category === category)),
    [category],
  );
  const categories: Array<'All Vehicles' | VehicleCategory> = [
    'All Vehicles',
    'Active Fleet',
    'Currently Rented',
    'Phase-Out Watch',
  ];

  return (
    <section className="fleet-page dark-section page-min">
      <SiteNav tone="dark" active="fleet" />
      <div className="fleet-shell">
        <div className="page-title dark reveal">
          <h1>Live Fleet Ledger</h1>
          <p className="fleet-truth-note">
            {brandDoctrine.fleetPromise} Every vehicle shown here renders from the active ledger.
          </p>
          <div className="tabs" role="tablist" aria-label="Vehicle categories">
            {categories.map((item) => (
              <button
                className={item === category ? 'active' : ''}
                key={item}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="vehicle-grid">
          {filtered.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} onOpen={() => go('vehicle')} />
          ))}
        </div>
        <div className="center-action reveal">
          <button className="secondary-dark" type="button" onClick={() => go('book')}>
            Request Access
          </button>
        </div>
      </div>
    </section>
  );
}

function VehicleDetailPage() {
  const selected = vehicles.find((vehicle) => vehicle.category === 'Active Fleet') ?? vehicles[0];

  return (
    <section className="light-page vehicle-detail-page">
      <SiteNav tone="light" compact showBack />
      <div className="detail-shell">
        <div className="detail-layout">
          <VehicleLedgerPanel vehicle={selected} />

          <article className="detail-copy reveal">
            <p className="vehicle-brand">{selected.brand}</p>
            <h1>{selected.name}</h1>
            <p>{brandDoctrine.oneLine}</p>
            <SpecLine vehicle={selected} />
            <p className="detail-description">
              {selected.description}
            </p>
          </article>
        </div>

        <div className="detail-lower reveal">
          <section>
            <h2>Specifications</h2>
            <dl>
              <div>
                <dt>Rate</dt>
                <dd>{selected.rateLabel}</dd>
              </div>
              <div>
                <dt>Structure</dt>
                <dd>{confirmedTerms.rentalStructure}</dd>
              </div>
              <div>
                <dt>Fuel</dt>
                <dd>{confirmedTerms.fuelPolicyShort}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selected.publicStatus}</dd>
              </div>
            </dl>
          </section>
          <section>
            <h2>Inclusions</h2>
            <ul>
              <li>{confirmedTerms.fuelPolicy}</li>
              <li>{confirmedTerms.privateHandoffCopy}</li>
              <li>Houston metro service framing</li>
              <li>Weekly access review</li>
              <li>Documented loss-of-use standard: {lossOfUseRateLabel}</li>
              <li>{brandDoctrine.trustPromise}</li>
            </ul>
          </section>
        </div>

        <div className="booking-bar reveal">
          <p>
            <span>Standard</span>{selected.rateLabel}
          </p>
          <button className="primary-ink" type="button" onClick={() => go('book')}>
            Request Access
          </button>
        </div>
      </div>
    </section>
  );
}

function AboutPage() {
  return (
    <section className="about-page dark-section">
      <SiteNav tone="dark" active="about" />
      <div className="about-hero">
        <div className="about-copy reveal">
          <p>About Obavia</p>
          <h1>Published standards. Nothing hidden.</h1>
          <p>
            Obavia is a private rental house for Houston drivers who are tired of being treated like a liability.
            The experience is quiet, direct, and dignified: real availability, visible standards, and no buried terms.
          </p>
          <button className="text-link" type="button" onClick={() => go('membership')}>
            View Standards
            <ArrowRight size={24} strokeWidth={1.35} />
          </button>
        </div>
        <div className="about-portrait reveal">
          <img src="/assets/about-entrance.png" alt="Warm private club entrance at night" />
        </div>
      </div>
      <div className="principles reveal">
        <article>
          <ShieldCheck size={46} strokeWidth={1.35} />
          <h2>Published</h2>
          <p>The standard is visible before the request.</p>
        </article>
        <article>
          <CarFront size={46} strokeWidth={1.35} />
          <h2>Honest</h2>
          <p>Only active ledger vehicles are shown.</p>
        </article>
        <article>
          <Gauge size={46} strokeWidth={1.35} />
          <h2>Dignified</h2>
          <p>Weekly access without the rental-counter posture.</p>
        </article>
      </div>
    </section>
  );
}

function MembershipPage() {
  return (
    <section className="membership-page dark-section">
      <SiteNav tone="dark" active="membership" />
      <div className="tier-mark-stage reveal">
        <div className="tier-mark-frame">
          <h1>Published Standards</h1>
          <div className="tier-mark-grid">
            <TierMark tier="Standard" kind="standard" />
            <TierMark tier="Bridge" kind="reserve" />
            <TierMark tier="Claims" kind="noir" />
          </div>
        </div>
      </div>
      <div className="app-icons-stage reveal">
        <div className="app-icons-frame">
          <h2>App Icons</h2>
          <div className="app-icon-row">
            <img src="/assets/app-icon-dark.svg" alt="OBAVIA dark app icon" />
            <img src="/assets/app-icon-light.svg" alt="OBAVIA light app icon" />
          </div>
        </div>
      </div>
    </section>
  );
}

function VehicleLedgerPanel({ vehicle }: { vehicle: (typeof vehicles)[number] }) {
  return (
    <article className="vehicle-ledger-panel reveal" aria-label={`${vehicle.displayName} ledger record`}>
      <p>Ledger Unit</p>
      <h2>{vehicle.displayName}</h2>
      <dl>
        <div>
          <dt>Status</dt>
          <dd>{vehicle.publicStatus}</dd>
        </div>
        <div>
          <dt>Rate</dt>
          <dd>{vehicle.rateLabel}</dd>
        </div>
        <div>
          <dt>Structure</dt>
          <dd>{confirmedTerms.rentalStructure}</dd>
        </div>
        <div>
          <dt>Control</dt>
          <dd>{vehicle.statusDetail}</dd>
        </div>
      </dl>
    </article>
  );
}

function getMemberPanel(selected: DashboardNavLabel) {
  switch (selected) {
    case 'Rental':
      return {
        title: 'Active Rental',
        copy: 'The active rental view mirrors the ledger and does not add vehicles outside the confirmed fleet.',
        rows: [
          ['Vehicle', vehicles[0].displayName],
          ['Status', vehicles[0].publicStatus],
          ['Program', confirmedTerms.rentalStructure],
          ['Handoff', confirmedTerms.privateHandoffCopy],
        ],
      };
    case 'Renewal':
      return {
        title: 'Renewal Standard',
        copy: 'Weekly continuation stays visible, with documented exceptions shown beside the standard.',
        rows: [
          ['Standard weekly rate', standardWeeklyRateLabel],
          ['Rental structure', confirmedTerms.rentalStructure],
          ['Hardship Bridge', `${confirmedTerms.hardshipBridgeDiscountPercent}% off ${confirmedTerms.hardshipBridgeWeeks}`],
          ['Bridge minimum', hardshipBridgeMinimumLabel],
        ],
      };
    case 'Contract':
      return {
        title: 'Contract Packet',
        copy: 'The customer sees the rules that matter before request, then the full packet after confirmation.',
        rows: [
          ['Fuel policy', confirmedTerms.fuelPolicy],
          ['Customer-facing address', `${confirmedTerms.customerAddressLabel}: ${confirmedTerms.customerAddress}`],
          ['Loss-of-use precedent', lossOfUseRateLabel],
          ['Private handoff', confirmedTerms.privateHandoffCopy],
        ],
      };
    case 'Support':
      return {
        title: 'Concierge Support',
        copy: 'Support stays specific to the confirmed service area and handoff model.',
        rows: [
          ['Service area', confirmedTerms.serviceArea],
          ['Toll road context', confirmedTerms.tollRoads.join(', ')],
          ['Handoff instructions', confirmedTerms.privateHandoffCopy],
          ['Availability', 'Confirmed appointment'],
        ],
      };
    default:
      return {
        title: 'Active Rental',
        copy: 'A member portal for current rental status, renewals, contract standards, and support.',
        rows: [
          ['Active rental', bookings[0].vehicle],
          ['Program', bookings[0].control],
          ['Service area', bookings[0].location],
          ['Standard', standardWeeklyRateLabel],
        ],
      };
  }
}

function ContractDocument({ compact = false }: { compact?: boolean }) {
  const activeVehicle = vehicles[0];

  return (
    <article className={compact ? 'contract-document compact' : 'contract-document'} aria-label="OBAVIA contract packet">
      <header className="contract-letterhead">
        <BrandMark size={compact ? 48 : 66} tone="gold" />
        <div>
          <span>OBAVIA</span>
          <p>Private Vehicle Rental Agreement</p>
        </div>
      </header>

      <section className="contract-title-block">
        <p>Contract Packet</p>
        <h2>{activeVehicle.displayName}</h2>
        <span>{confirmedTerms.rentalStructure}</span>
      </section>

      <dl className="contract-summary-grid">
        <div>
          <dt>Member</dt>
          <dd>{bookings[0].customer}</dd>
        </div>
        <div>
          <dt>Vehicle</dt>
          <dd>{activeVehicle.displayName}</dd>
        </div>
        <div>
          <dt>Program</dt>
          <dd>{standardWeeklyRateLabel}</dd>
        </div>
        <div>
          <dt>Area</dt>
          <dd>{confirmedTerms.serviceArea}</dd>
        </div>
      </dl>

      <div className="contract-clause-list">
        {contractClauses.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <p>{value}</p>
          </div>
        ))}
      </div>

      <footer className="contract-footer">
        <span>{brandDoctrine.oneLine}</span>
        <strong>OBAVIA</strong>
      </footer>
    </article>
  );
}

function MemberDashboard() {
  const [selected, setSelected] = useState<DashboardNavLabel>('Rental');
  const activeBooking = bookings[0];
  const activeVehicle = vehicles[0];
  const panel = getMemberPanel(selected);

  return (
    <section className="member-page">
      <SiteNav tone="light" compact />
      <div className="member-shell">
        <aside className="member-sidebar reveal">
          <nav aria-label="Member">
            {dashboardNav.map((item) => (
              <button className={item === selected ? 'active' : ''} key={item} type="button" onClick={() => setSelected(item)}>
                {item}
              </button>
            ))}
            <button type="button" onClick={() => go('home')}>
              Log Out
            </button>
          </nav>
        </aside>
        <div className="member-main">
          <div className="member-content reveal">
            <div className="dashboard-heading">
              <p>Member portal</p>
              <h1>Confirmed Member</h1>
            </div>

            <article className="membership-status">
              <BrandMark size={66} tone="gold" />
              <div>
                <p>Access Type</p>
                <h2>Standard Weekly</h2>
              </div>
              <button className="text-link" type="button" onClick={() => setSelected('Contract')}>
                View Contract
              </button>
            </article>

            <section className="member-system-grid" aria-label="Member portal systems">
              {memberSystemCards.map(([label, value, copy]) => (
                <article key={label}>
                  <p>{label}</p>
                  <strong>{value}</strong>
                  <span>{copy}</span>
                </article>
              ))}
            </section>

            {selected === 'Contract' ? (
              <ContractDocument />
            ) : (
              <section className="member-detail-panel" aria-live="polite">
                <div>
                  <p>{selected}</p>
                  <h2>{panel.title}</h2>
                  <span>{panel.copy}</span>
                </div>
                <dl>
                  {panel.rows.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section className="member-booking-block">
              <h2>Current Rental</h2>
              <article className="upcoming-booking">
                <div className="booking-ledger-mark" aria-hidden="true">
                  <span>{activeVehicle.year}</span>
                  <strong>{activeVehicle.brand}</strong>
                </div>
                <div>
                  <h3>{activeBooking.vehicle}</h3>
                  <span>{activeBooking.control}</span>
                  <span>{activeBooking.location}</span>
                </div>
                <button className="outline-action ink" type="button" onClick={() => go('vehicle')}>
                  View Booking
                </button>
              </article>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminSystemsPanel({
  selected,
  onSelect,
}: {
  selected: AdminNavLabel;
  onSelect: (label: AdminNavLabel) => void;
}) {
  const heroCopy: Record<AdminNavLabel, { eyebrow: string; title: string; copy: string }> = {
    Inventory: {
      eyebrow: 'Inventory',
      title: 'Ledger units only.',
      copy: 'Incoming or retired units do not appear until the ledger makes them real.',
    },
    Renewals: {
      eyebrow: 'Renewals',
      title: 'Weekly continuation without hidden terms.',
      copy: confirmedTerms.rentalStructure,
    },
    Overdues: {
      eyebrow: 'Overdues',
      title: 'No balance appears without ledger proof.',
      copy: 'The page is ready for overdue rows, but the current confirmed data does not publish one.',
    },
    Contracts: {
      eyebrow: 'Contracts',
      title: 'A branded packet built from confirmed terms.',
      copy: 'The agreement shows the standard, exceptions, fuel rule, and claim precedent without invented figures.',
    },
    Portal: {
      eyebrow: 'Customer Portal',
      title: 'The member sees rental, renewal, contract, support.',
      copy: 'The portal begins with the current ledger record and keeps every hidden operational address private.',
    },
  };

  if (selected === 'Inventory') {
    return (
      <section className="admin-system-workspace reveal" aria-label="Inventory system">
        <div className="admin-system-hero">
          <p>{heroCopy.Inventory.eyebrow}</p>
          <h2>{heroCopy.Inventory.title}</h2>
          <span>{heroCopy.Inventory.copy}</span>
        </div>
        <div className="admin-ledger-table four-col">
          <div className="admin-ledger-head">
            <span>Vehicle</span>
            <span>Status</span>
            <span>Rate</span>
            <span>Control</span>
          </div>
          {inventoryRows.map(([vehicle, status, rate, control]) => (
            <div className="admin-ledger-row" key={vehicle}>
              <span>{vehicle}</span>
              <span>{status}</span>
              <span>{rate}</span>
              <span>{control}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (selected === 'Renewals') {
    return (
      <section className="admin-system-workspace reveal" aria-label="Renewals system">
        <div className="admin-system-hero">
          <p>{heroCopy.Renewals.eyebrow}</p>
          <h2>{heroCopy.Renewals.title}</h2>
          <span>{heroCopy.Renewals.copy}</span>
        </div>
        <div className="admin-ledger-table four-col">
          <div className="admin-ledger-head">
            <span>Vehicle</span>
            <span>Program</span>
            <span>Rate</span>
            <span>Next action</span>
          </div>
          {renewalRows.map(([vehicle, program, rate, action]) => (
            <div className="admin-ledger-row" key={vehicle}>
              <span>{vehicle}</span>
              <span>{program}</span>
              <span>{rate}</span>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (selected === 'Overdues') {
    return (
      <section className="admin-system-workspace reveal" aria-label="Overdues system">
        <div className="admin-system-hero">
          <p>{heroCopy.Overdues.eyebrow}</p>
          <h2>{heroCopy.Overdues.title}</h2>
          <span>{heroCopy.Overdues.copy}</span>
        </div>
        <div className="admin-overdue-grid">
          {overdueControls.map(([label, copy]) => (
            <article key={label}>
              <strong>{label}</strong>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (selected === 'Contracts') {
    return (
      <section className="admin-system-workspace reveal" aria-label="Contracts system">
        <div className="admin-system-hero">
          <p>{heroCopy.Contracts.eyebrow}</p>
          <h2>{heroCopy.Contracts.title}</h2>
          <span>{heroCopy.Contracts.copy}</span>
        </div>
        <div className="admin-contract-layout">
          <div className="contract-control-list" aria-label="Contract controls">
            {contractRows.map(([packet, status, value, use]) => (
              <article key={packet}>
                <p>{packet}</p>
                <strong>{value}</strong>
                <span>{status}</span>
                <small>{use}</small>
              </article>
            ))}
          </div>
          <ContractDocument compact />
        </div>
      </section>
    );
  }

  if (selected === 'Portal') {
    return (
      <section className="admin-system-workspace reveal" aria-label="Member controls">
        <div className="admin-system-hero">
          <p>{heroCopy.Portal.eyebrow}</p>
          <h2>{heroCopy.Portal.title}</h2>
          <span>{heroCopy.Portal.copy}</span>
        </div>
        <div className="admin-module-actions">
          <button type="button" onClick={() => go('member')}>Open Member Portal</button>
          <button type="button" onClick={() => go('book')}>Request Access Flow</button>
        </div>
      </section>
    );
  }

  return null;
}

function AdminDashboard() {
  const [selected, setSelected] = useState<AdminNavLabel>('Inventory');

  return (
    <section className="admin-page">
      <aside className="admin-sidebar">
        <BrandMark wordmark size={54} tone="gold" />
        <nav aria-label="Admin">
          {adminNav.map(({ label, icon: Icon }) => (
            <button className={label === selected ? 'active' : ''} key={label} type="button" onClick={() => setSelected(label)}>
              <Icon size={25} strokeWidth={1.4} />
              {label}
            </button>
          ))}
          <button type="button" onClick={() => go('home')}>
            <LogOut size={25} strokeWidth={1.4} />
            Logout
          </button>
        </nav>
      </aside>
      <div className="admin-main">
        <header className="admin-top">
          <div>
            <p>OBAVIA / Staff Platform</p>
            <h1>Operations</h1>
          </div>
          <div>
            <button className="icon-button dark" type="button">
              <Bell size={26} strokeWidth={1.35} />
              <span className="sr-only">Notifications</span>
            </button>
            <button className="icon-button dark admin-user" type="button">
              <UserRound size={26} strokeWidth={1.35} />
              <span className="sr-only">Account</span>
            </button>
          </div>
        </header>

        <section className="staff-hero reveal">
          <div className="staff-hero-copy">
            <p>Simple control</p>
            <h2>One ledger. One contract. One member portal.</h2>
          </div>
          <div className="staff-hero-control">
            <span>Active module</span>
            <strong>{selected}</strong>
            <p>Switch modules from the left rail. No duplicate tables below the work surface.</p>
          </div>
        </section>

        <section className="admin-overview-strip reveal" aria-label="Admin overview">
          {adminOverviewCards.map(([label, value, copy]) => (
            <button
              className={label === selected ? 'active' : ''}
              type="button"
              key={label}
              onClick={() => setSelected(label as AdminNavLabel)}
            >
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{copy}</small>
            </button>
          ))}
        </section>

        <AdminSystemsPanel selected={selected} onSelect={setSelected} />
      </div>
    </section>
  );
}

function MobileAppShowcase() {
  const [activeScreen, setActiveScreen] = useState<MobileScreenId>(() => getMobileScreenFromHash());
  const [activeFleetTab, setActiveFleetTab] = useState<MobileFleetTab>('All');
  const selectScreen = (screen: MobileScreenId) => {
    setActiveScreen(screen);
    const nextHash = `#mobile/${screen}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
  };

  useEffect(() => {
    const syncMobileScreen = () => setActiveScreen(getMobileScreenFromHash());
    window.addEventListener('hashchange', syncMobileScreen);
    window.addEventListener('popstate', syncMobileScreen);
    return () => {
      window.removeEventListener('hashchange', syncMobileScreen);
      window.removeEventListener('popstate', syncMobileScreen);
    };
  }, []);

  const openFleetTab = (tab: MobileFleetTab) => {
    setActiveFleetTab(tab);
    selectScreen('fleet');
  };

  const screens: Array<{
    id: MobileScreenId;
    node: React.ReactNode;
  }> = [
    { id: 'splash', node: <MobileSplashScreen onSelect={selectScreen} /> },
    { id: 'home', node: <MobileHomeScreen onSelect={selectScreen} /> },
    { id: 'menu', node: <MobileMenuScreen onSelect={selectScreen} onFleetTabSelect={openFleetTab} /> },
    { id: 'admin', node: <MobileAdminScreen onSelect={selectScreen} /> },
    { id: 'categories', node: <MobileCategoriesScreen onSelect={selectScreen} onFleetTabSelect={openFleetTab} /> },
    {
      id: 'fleet',
      node: (
        <MobileFleetScreen
          activeTab={activeFleetTab}
          onSelect={selectScreen}
          onTabChange={setActiveFleetTab}
        />
      ),
    },
    { id: 'detail', node: <MobileDetailScreen onSelect={selectScreen} /> },
    { id: 'booking', node: <MobileBookingScreen onSelect={selectScreen} /> },
    { id: 'membership', node: <MobileMembershipScreen onSelect={selectScreen} /> },
    { id: 'benefits', node: <MobileBenefitsScreen onSelect={selectScreen} /> },
  ];
  const currentScreen = screens.find((screen) => screen.id === activeScreen) ?? screens[0];

  return (
    <section className="mobile-app-page" aria-label="OBAVIA mobile app experience">
      <div className="mobile-app-viewport-wrap">
        <div className="mobile-app-viewport" data-active-screen={currentScreen.id}>
          <div className="mobile-app-screen-stage" key={currentScreen.id}>
            {currentScreen.node}
          </div>
        </div>
      </div>
    </section>
  );
}

function IosStatus({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <div className={`ios-status ${tone}`}>
      <span>9:41</span>
      <div aria-hidden="true">
        <i className="signal-bars" />
        <i className="wifi-mark" />
        <i className="battery-mark" />
      </div>
    </div>
  );
}

function MobileIconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className="mobile-icon-button" type="button" aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

function MobileTopBar({
  tone = 'dark',
  left,
  right,
}: {
  tone?: 'dark' | 'light';
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className={`app-topbar ${tone}`}>
      {left}
      <BrandMark size={52} tone="gold" />
      {right}
    </div>
  );
}

function MobileBottomNav({
  active = 'Home',
  tone = 'dark',
  onSelect = noopMobileSelect,
}: {
  active?: string;
  tone?: 'dark' | 'light';
  onSelect?: MobileScreenSelect;
}) {
  const tabs = [
    { label: 'Home', icon: HomeIcon, screen: 'home' },
    { label: 'Fleet', icon: CarFront, screen: 'fleet' },
    { label: 'Access', icon: CalendarDays, screen: 'booking' },
    { label: 'Terms', icon: null, screen: 'membership' },
    { label: 'Portal', icon: UserRound, screen: 'benefits' },
  ] as const;

  return (
    <nav className={`app-bottom-nav ${tone}`} aria-label="Mobile app">
      {tabs.map(({ label, icon: Icon, screen }) => (
        <button
          aria-current={label === active ? 'page' : undefined}
          className={label === active ? 'active' : ''}
          type="button"
          key={label}
          onClick={() => onSelect(screen)}
        >
          {Icon ? <Icon size={24} strokeWidth={1.45} /> : <BrandMark size={28} tone={label === active ? 'gold' : tone === 'light' ? 'ink' : 'ivory'} />}
          <span className="app-bottom-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}

function MobileSplashScreen({ onSelect = noopMobileSelect }: MobileScreenProps) {
  return (
    <div className="app-screen app-screen-dark splash-app">
      <IosStatus />
      <img className="splash-photo" src="/assets/hero-obavia-background.png" alt="Chauffeur beside an executive vehicle" />
      <div className="splash-wash" />
      <div className="splash-brand">
        <BrandMark size={76} tone="gold" />
        <h2>OBAVIA</h2>
        <p>Private Vehicle Rental</p>
      </div>
      <div className="splash-bottom">
        <p>{brandDoctrine.oneLine}</p>
        <div className="app-dots" aria-hidden="true">
          <span className="active" />
          <span />
          <span />
        </div>
        <button type="button" onClick={() => onSelect('home')}>Enter</button>
      </div>
    </div>
  );
}

function MobileHomeScreen({ onSelect = noopMobileSelect }: MobileScreenProps) {
  const activeVehicle = vehicles[0];
  const actions = [
    { label: 'Fleet Ledger', icon: CarFront, screen: 'fleet' },
    { label: 'Contract', icon: FileCheck2, screen: 'benefits' },
  ] as const;

  return (
    <div className="app-screen app-screen-dark app-home-screen">
      <IosStatus />
      <div className="screen-body with-bottom-nav">
        <MobileTopBar
          left={<MobileIconButton label="Open menu" onClick={() => onSelect('menu')}><Menu size={28} strokeWidth={1.45} /></MobileIconButton>}
          right={<MobileIconButton label="Notifications"><Bell size={24} strokeWidth={1.35} /></MobileIconButton>}
        />
        <section className="app-greeting">
          <p>Member portal</p>
          <h2>Confirmed</h2>
          <span>Standard member</span>
        </section>
        <section className="upcoming-card">
          <div>
            <p>Current Rental</p>
            <span>{activeVehicle.brand}</span>
            <h3>{activeVehicle.name}</h3>
            <small>{confirmedTerms.rentalStructure}</small>
            <small>{confirmedTerms.serviceArea}</small>
          </div>
          <button type="button" aria-label="View booking" onClick={() => onSelect('detail')}>
            <ArrowRight size={26} strokeWidth={1.3} />
          </button>
        </section>
        <div className="quick-actions">
          {actions.map(({ label, icon: Icon, screen }) => (
            <button type="button" key={label} onClick={() => onSelect(screen)}>
              <Icon size={28} strokeWidth={1.35} />
              <span>{label}</span>
              <ChevronRight size={18} strokeWidth={1.4} />
            </button>
          ))}
        </div>
      </div>
      <MobileBottomNav active="Home" onSelect={onSelect} />
    </div>
  );
}

function MobileMenuScreen({
  onSelect = noopMobileSelect,
  onFleetTabSelect = () => undefined,
}: MobileScreenProps & {
  onFleetTabSelect?: (tab: MobileFleetTab) => void;
}) {
  const menuItems = [
    { label: 'Home', screen: 'home' },
    { label: 'Fleet Ledger', tab: 'All' },
    { label: 'Contract', screen: 'benefits' },
    { label: 'Request Access', screen: 'booking' },
    { label: 'Published Standards', screen: 'membership' },
    { label: 'Houston Service', tab: 'Houston' },
  ] as const;

  const handleMenuTarget = (target: { screen?: MobileScreenId; tab?: MobileFleetTab }) => {
    emitMenuInteractionSound('click');

    if (target?.tab) {
      onFleetTabSelect(target.tab);
      return;
    }

    onSelect(target?.screen ?? 'home');
  };
  const previewMenuSound = () => emitMenuInteractionSound('hover');
  const closeMenu = () => {
    emitMenuInteractionSound('click');
    onSelect('home');
  };
  const openAdmin = () => {
    emitMenuInteractionSound('click');
    onSelect('admin');
  };

  return (
    <div className="app-screen app-screen-dark menu-app">
      <IosStatus />
      <MenuAmbiencePlayer active />
      <img className="menu-backdrop" src="/assets/hero-obavia-background.png" alt="Private chauffeur beside an executive sedan" />
      <div className="menu-wash" />
      <button
        className="mobile-menu-close"
        type="button"
        onMouseEnter={previewMenuSound}
        onFocus={previewMenuSound}
        onClick={closeMenu}
        aria-label="Close menu"
      >
        <X size={28} strokeWidth={1.15} />
      </button>
      <div className="menu-content">
        <BrandMark size={70} tone="gold" />
        <nav className="menu-primary-list" aria-label="Primary mobile menu">
          {menuItems.map((item, index) => {
            const itemIsActive = index === 0;

            return (
              <button
                className={itemIsActive ? 'active' : ''}
                style={{ '--menu-index': index } as React.CSSProperties}
                type="button"
                key={item.label}
                onMouseEnter={previewMenuSound}
                onFocus={previewMenuSound}
                onClick={() => handleMenuTarget({
                  screen: 'screen' in item ? item.screen : undefined,
                  tab: 'tab' in item ? item.tab : undefined,
                })}
              >
                <span>{item.label}</span>
                {itemIsActive ? <i aria-hidden="true" /> : null}
              </button>
            );
          })}
        </nav>
        <span className="menu-divider" aria-hidden="true" />
        <div className="concierge-strip">
          <Headphones size={18} strokeWidth={1.3} />
          <span>Concierge by confirmed appointment</span>
          <b aria-hidden="true">|</b>
          <span>{confirmedTerms.serviceArea}</span>
        </div>
        <button
          className="mobile-menu-admin-link"
          type="button"
          onMouseEnter={previewMenuSound}
          onFocus={previewMenuSound}
          onClick={openAdmin}
        >
          Admin
        </button>
      </div>
    </div>
  );
}

function MobileAdminScreen({ onSelect = noopMobileSelect }: MobileScreenProps) {
  const [selected, setSelected] = useState<AdminNavLabel>('Inventory');
  const selectedModule = adminNav.find((item) => item.label === selected) ?? adminNav[0];
  const ModuleIcon = selectedModule.icon;

  return (
    <div className="app-screen app-screen-dark admin-app-screen">
      <IosStatus />
      <div className="screen-body admin-app-body">
        <MobileTopBar
          left={<MobileIconButton label="Back to menu" onClick={() => onSelect('menu')}><ChevronLeft size={27} strokeWidth={1.35} /></MobileIconButton>}
          right={<MobileIconButton label="Home" onClick={() => onSelect('home')}><HomeIcon size={24} strokeWidth={1.35} /></MobileIconButton>}
        />
        <header className="mobile-system-head">
          <p>Admin</p>
          <h2>{selected}</h2>
          <span>Ledger truth only.</span>
        </header>

        <nav className="mobile-admin-list" aria-label="Admin systems">
          {adminNav.map(({ label, icon: Icon }) => (
            <button
              className={label === selected ? 'active' : ''}
              type="button"
              key={label}
              onClick={() => setSelected(label)}
            >
              <Icon size={21} strokeWidth={1.35} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <section className="mobile-admin-panel" aria-label={`${selected} module`}>
          <div className="mobile-admin-panel-head">
            <ModuleIcon size={25} strokeWidth={1.25} />
            <p>{selected}</p>
          </div>
          {selected === 'Inventory' ? (
            <div className="mobile-admin-rows">
              {inventoryRows.map(([vehicle, status, rate]) => (
                <article key={vehicle}>
                  <strong>{vehicle}</strong>
                  <span>{status}</span>
                  <small>{rate}</small>
                </article>
              ))}
            </div>
          ) : null}
          {selected === 'Renewals' ? (
            <div className="mobile-admin-rows">
              {renewalRows.map(([vehicle, program, rate, action]) => (
                <article key={vehicle}>
                  <strong>{vehicle}</strong>
                  <span>{program}</span>
                  <small>{rate}: {action}</small>
                </article>
              ))}
            </div>
          ) : null}
          {selected === 'Overdues' ? (
            <div className="mobile-admin-rows">
              {overdueControls.map(([label, value]) => (
                <article key={label}>
                  <strong>{label}</strong>
                  <span>{value}</span>
                </article>
              ))}
            </div>
          ) : null}
          {selected === 'Contracts' ? (
            <div className="mobile-admin-contract">
              <ContractDocument compact />
            </div>
          ) : null}
          {selected === 'Portal' ? (
            <div className="mobile-admin-rows">
              {memberSystemCards.map(([label, value, copy]) => (
                <article key={label}>
                  <strong>{label}</strong>
                  <span>{value}</span>
                  <small>{copy}</small>
                </article>
              ))}
              <button className="mobile-admin-action" type="button" onClick={() => onSelect('benefits')}>
                Open Customer Portal
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function MobileCategoriesScreen({
  onSelect = noopMobileSelect,
  onFleetTabSelect = () => undefined,
}: MobileScreenProps & {
  onFleetTabSelect?: (tab: MobileFleetTab) => void;
}) {
  const openCollection = (title: string) => {
    onFleetTabSelect(collectionToFleetTab(title));
  };

  return (
    <div className="app-screen app-screen-dark">
      <IosStatus />
      <div className="screen-body categories-body">
        <MobileTopBar
          left={<MobileIconButton label="Back" onClick={() => onSelect('home')}><ChevronLeft size={27} strokeWidth={1.35} /></MobileIconButton>}
          right={<MobileIconButton label="Search" onClick={() => onSelect('fleet')}><Search size={26} strokeWidth={1.35} /></MobileIconButton>}
        />
        <header className="app-title-block">
          <h2>Published Standards</h2>
          <p>{brandDoctrine.accessPromise}</p>
        </header>
        <div className="collection-list">
          {appCollections.map(({ title, copy, price, icon: Icon }, index) => (
            <article
              className={index === 0 ? 'active' : ''}
              key={title}
              role="button"
              tabIndex={0}
              onClick={() => openCollection(title)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  openCollection(title);
                }
              }}
            >
              <div>
                <span>
                  <Icon size={18} strokeWidth={1.35} />
                </span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <small>{price}</small>
              </div>
              <ChevronRight size={20} strokeWidth={1.35} />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileFleetScreen({
  activeTab = 'All',
  onSelect = noopMobileSelect,
  onTabChange = () => undefined,
}: MobileScreenProps & {
  activeTab?: MobileFleetTab;
  onTabChange?: (tab: MobileFleetTab) => void;
}) {
  const visibleFleet = appFleet.filter((vehicle) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Active') return vehicle.collection === 'Active Fleet';
    if (activeTab === 'Rented') return vehicle.collection === 'Currently Rented';
    if (activeTab === 'Phase-out') return vehicle.collection === 'Phase-Out Watch';
    if (activeTab === 'Bridge') return true;
    if (activeTab === 'Houston') return true;
    return true;
  });

  return (
    <div className="app-screen app-screen-dark">
      <IosStatus />
      <div className="screen-body fleet-body with-bottom-nav">
        <MobileTopBar
          left={<MobileIconButton label="Filter"><SlidersHorizontal size={25} strokeWidth={1.4} /></MobileIconButton>}
          right={<MobileIconButton label="Search"><Search size={26} strokeWidth={1.35} /></MobileIconButton>}
        />
        <header className="app-title-block compact">
          <h2>Live Fleet Ledger</h2>
        </header>
        <div className="fleet-tabs" role="tablist" aria-label="Fleet categories">
          {mobileFleetTabs.map((tab) => (
            <button
              aria-selected={tab === activeTab}
              className={tab === activeTab ? 'active' : ''}
              role="tab"
              type="button"
              key={tab}
              onClick={() => onTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="app-fleet-list" key={activeTab}>
          {visibleFleet.map((vehicle) => (
            <article key={`${vehicle.marque}-${vehicle.model}`}>
              <div className="fleet-ledger-mark" aria-hidden="true">
                <span>{vehicle.marque}</span>
                <strong>{vehicle.status}</strong>
              </div>
              <div>
                <span>{vehicle.marque}</span>
                <h3>{vehicle.model}</h3>
                <p>{vehicle.collection}</p>
                <small>{vehicle.status}</small>
                <strong>{vehicle.price}</strong>
              </div>
              <button type="button" onClick={() => onSelect('detail')}>View</button>
            </article>
          ))}
        </div>
      </div>
      <MobileBottomNav active="Fleet" onSelect={onSelect} />
    </div>
  );
}

function MobileDetailScreen({ onSelect = noopMobileSelect }: MobileScreenProps) {
  const selected = vehicles.find((vehicle) => vehicle.category === 'Active Fleet') ?? vehicles[0];
  const inclusions = [
    confirmedTerms.fuelPolicyShort,
    confirmedTerms.rentalStructure,
    confirmedTerms.privateHandoffCopy,
    `Loss-of-use precedent: ${lossOfUseRateLabel}`,
    `Standard weekly rate: ${standardWeeklyRateLabel}`,
  ] as const;

  return (
    <div className="app-screen app-screen-light">
      <IosStatus tone="light" />
      <div className="screen-body detail-app-body with-bottom-nav">
        <MobileTopBar
          tone="light"
          left={<MobileIconButton label="Back" onClick={() => onSelect('fleet')}><ChevronLeft size={27} strokeWidth={1.35} /></MobileIconButton>}
          right={<MobileIconButton label="Favorite"><Heart size={25} strokeWidth={1.35} /></MobileIconButton>}
        />
        <VehicleLedgerPanel vehicle={selected} />
        <article className="detail-app-copy">
          <h2>{selected.shortName}</h2>
          <p>{selected.category}</p>
          <div className="detail-specs">
            <span><CalendarDays size={22} strokeWidth={1.35} />{selected.rateLabel}</span>
            <span><Gauge size={22} strokeWidth={1.35} />{selected.publicStatus}</span>
            <span><MapPin size={22} strokeWidth={1.35} />{confirmedTerms.serviceArea}</span>
          </div>
          <p className="detail-description-app">
            {selected.description}
          </p>
          <section className="detail-inclusions">
            <h3>Inclusions</h3>
            {inclusions.map((item) => (
              <span key={item}>
                <CheckCircle2 size={18} strokeWidth={1.45} />
                {item}
              </span>
            ))}
          </section>
          <div className="detail-price-row">
            <p><span>Standard</span>{selected.rateLabel}</p>
            <button type="button" onClick={() => onSelect('booking')}>Request Access</button>
          </div>
        </article>
      </div>
      <MobileBottomNav active="Fleet" tone="light" onSelect={onSelect} />
    </div>
  );
}

function MobileBookingScreen({ onSelect = noopMobileSelect }: MobileScreenProps) {
  const selected = vehicles.find((vehicle) => vehicle.category === 'Active Fleet') ?? vehicles[0];
  const fields = [
    ['Pick-up Location', 'Select pick-up location', MapPin],
    ['Pick-up Date', 'Select date', CalendarDays],
    ['Pick-up Time', 'Select time', Gauge],
    ['Return Location', 'Select return location', MapPin],
    ['Return Date', 'Select date', CalendarDays],
    ['Return Time', 'Select time', Gauge],
  ] as const;

  return (
    <div className="app-screen app-screen-dark">
      <IosStatus />
      <div className="screen-body booking-app-body">
        <MobileTopBar
          left={<MobileIconButton label="Back" onClick={() => onSelect('fleet')}><ChevronLeft size={27} strokeWidth={1.35} /></MobileIconButton>}
          right={<MobileIconButton label="Account" onClick={() => onSelect('benefits')}><CircleUserRound size={25} strokeWidth={1.35} /></MobileIconButton>}
        />
        <header className="app-title-block booking-title">
          <h2>Request Access</h2>
          <div className="booking-steps-app">
            {['Vehicle', 'Standards', 'Review', 'Payment'].map((step, index) => (
              <span className={index === 0 ? 'active' : ''} key={step}>{index + 1}. {step}</span>
            ))}
          </div>
        </header>
        <article className="selected-vehicle-card">
          <div className="booking-ledger-mark" aria-hidden="true">
            <span>{selected.year}</span>
            <strong>{selected.brand}</strong>
          </div>
          <div>
            <p>{selected.category}</p>
            <h3>{selected.displayName}</h3>
            <span>{selected.publicStatus}</span>
            <small>{selected.rateLabel} {'\u00b7'} {confirmedTerms.rentalStructure}</small>
          </div>
        </article>
        <div className="booking-fields-app">
          {fields.map(([label, value, Icon], index) => (
            <label className={index === 0 || index === 3 ? 'wide' : ''} key={`${label}-${value}`}>
              <span>{label}</span>
              <i>
                <Icon size={18} strokeWidth={1.35} />
                {value}
                <ChevronRight size={16} strokeWidth={1.35} />
              </i>
            </label>
          ))}
        </div>
        <div className="driver-toggle-app">
          <span>Driver</span>
          <button className="active" type="button"><CircleCheck size={18} strokeWidth={1.35} />With Driver</button>
          <button type="button"><CircleCheck size={18} strokeWidth={1.35} />Self Drive</button>
        </div>
        <div className="weekly-badge-app">
          <CalendarDays size={16} strokeWidth={1.35} />
          {standardWeeklyRateLabel} standard weekly plan
        </div>
        <button className="continue-app-button" type="button" onClick={() => onSelect('membership')}>Review Standards</button>
      </div>
    </div>
  );
}

function MobileMembershipScreen({ onSelect = noopMobileSelect }: MobileScreenProps) {
  return (
    <div className="app-screen app-screen-light">
      <IosStatus tone="light" />
      <div className="screen-body membership-app-body with-bottom-nav">
        <header className="membership-app-head">
          <BrandMark size={56} tone="gold" />
          <span>OBAVIA</span>
          <h2>Published Standards</h2>
          <p>{brandDoctrine.trustPromise}</p>
        </header>
        <div className="tier-card-list">
          <TierAppCard
            tier="Standard"
            mark="standard"
            benefits={[standardWeeklyRateLabel, confirmedTerms.rentalStructure, confirmedTerms.fuelPolicyShort]}
          />
          <TierAppCard
            tier="Hardship Bridge"
            mark="reserve"
            benefits={[
              `${confirmedTerms.hardshipBridgeDiscountPercent}% off ${confirmedTerms.hardshipBridgeWeeks}`,
              hardshipBridgeRateLabel,
              `${hardshipBridgeMinimumLabel} minimum`,
            ]}
          />
          <TierAppCard
            tier="Claims Standard"
            mark="noir"
            benefits={[lossOfUseRateLabel, 'Documented precedent', 'Commercial insurer accepted']}
          />
        </div>
        <button className="compare-benefits-button" type="button" onClick={() => onSelect('benefits')}>Compare Standards</button>
        <p className="membership-footer-copy">Questions before requesting access?</p>
        <button className="membership-concierge-link" type="button">Contact Concierge</button>
      </div>
      <MobileBottomNav active="Terms" tone="light" onSelect={onSelect} />
    </div>
  );
}

function TierAppCard({
  tier,
  benefits,
  mark,
  popular = false,
}: {
  tier: string;
  benefits: readonly string[];
  mark: 'standard' | 'reserve' | 'noir';
  popular?: boolean;
}) {
  return (
    <article className={`tier-app-card ${mark}`}>
      <div className="tier-app-mark" aria-hidden="true">
        {mark === 'noir' ? <BrandMark size={45} tone="gold" /> : null}
      </div>
      <div>
        {popular ? <span className="popular-flag">Most Popular</span> : null}
        <h3>{tier}</h3>
        {benefits.map((benefit) => (
          <p key={benefit}><CheckCircle2 size={16} strokeWidth={1.45} />{benefit}</p>
        ))}
      </div>
    </article>
  );
}

function MobileBenefitsScreen({ onSelect = noopMobileSelect }: MobileScreenProps) {
  return (
    <div className="app-screen app-screen-light portal-app-screen">
      <IosStatus tone="light" />
      <div className="screen-body portal-app-body with-bottom-nav">
        <MobileTopBar
          tone="light"
          left={<MobileIconButton label="Back" onClick={() => onSelect('home')}><ChevronLeft size={27} strokeWidth={1.35} /></MobileIconButton>}
          right={<MobileIconButton label="Admin" onClick={() => onSelect('admin')}><LayoutDashboard size={24} strokeWidth={1.35} /></MobileIconButton>}
        />
        <header className="mobile-system-head light">
          <p>Customer Portal</p>
          <h2>Contract</h2>
          <span>{brandDoctrine.trustPromise}</span>
        </header>

        <div className="mobile-contract-frame">
          <ContractDocument compact />
        </div>

        <button className="upgrade-button-app" type="button" onClick={() => onSelect('booking')}>Request Access</button>
      </div>
      <MobileBottomNav active="Portal" tone="light" onSelect={onSelect} />
    </div>
  );
}

function BenefitCell({ value, reserve = false }: { value: string; reserve?: boolean }) {
  if (value === 'yes') {
    return (
      <span className={reserve ? 'benefit-cell reserve' : 'benefit-cell'}>
        <CircleCheck size={18} strokeWidth={1.5} />
      </span>
    );
  }

  if (value === 'no') {
    return (
      <span className={reserve ? 'benefit-cell reserve muted' : 'benefit-cell muted'}>
        <CircleX size={18} strokeWidth={1.4} />
      </span>
    );
  }

  return <span className={reserve ? 'benefit-cell reserve text' : 'benefit-cell text'}>{value}</span>;
}

function Field({
  label,
  hiddenLabel = false,
  children,
}: {
  label: string;
  hiddenLabel?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className={hiddenLabel ? 'sr-only' : ''}>{label}</span>
      {children}
    </label>
  );
}

function SpecLine({ vehicle }: { vehicle: (typeof vehicles)[number] }) {
  return (
    <div className="spec-line">
      <span>
        <CalendarDays size={22} strokeWidth={1.35} />
        {vehicle.rateLabel}
      </span>
      <span>
        <Gauge size={22} strokeWidth={1.35} />
        {vehicle.publicStatus}
      </span>
      <span>
        <MapPin size={22} strokeWidth={1.35} />
        {confirmedTerms.serviceArea}
      </span>
    </div>
  );
}

function TierMark({ tier, kind }: { tier: string; kind: 'standard' | 'reserve' | 'noir' }) {
  return (
    <article className={`tier-mark ${kind}`}>
      <div className="tier-symbol">
        {kind === 'reserve' ? <span /> : null}
        {kind === 'noir' ? <BrandMark size={91} tone="gold" /> : null}
      </div>
      <h2>{tier}</h2>
    </article>
  );
}
