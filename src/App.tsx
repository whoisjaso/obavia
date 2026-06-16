import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
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
  Zap,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BrandMark } from './components/BrandMark';
import { VehicleCard } from './components/VehicleCard';
import { bookings, locations, vehicles, type VehicleCategory } from './data';

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
  { label: 'Experience', route: 'vehicle' },
  { label: 'About', route: 'about' },
  { label: 'Membership', route: 'membership' },
] as const;

const dashboardNav = [
  'Overview',
  'My Bookings',
  'Favorites',
  'Payment Methods',
  'Membership',
  'Settings',
] as const;

const adminNav = [
  { label: 'Command', icon: LayoutDashboard },
  { label: 'Bookings', icon: CalendarDays },
  { label: 'Dispatch', icon: Gauge },
  { label: 'Vehicles', icon: CarFront },
  { label: 'Members', icon: UsersRound },
  { label: 'Finance', icon: CreditCard },
  { label: 'Risk', icon: ShieldAlert },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
] as const;

const commandMetrics = [
  ['Today\'s Revenue', '$8,400', '7 trips in motion'],
  ['Active Trips', '7', '3 with chauffeurs'],
  ['Vehicles Ready', '14', '2 in prep'],
  ['Risk Holds', '3', '$6,500 exposure'],
] as const;

const bookingPipeline = [
  ['New Requests', 'John D.', 'S-Class', 'May 24'],
  ['Awaiting Payment', 'Sarah W.', 'Range Rover', '$2,500 hold'],
  ['Confirmed', 'James A.', 'S-Class', 'Today'],
  ['Ready for Dispatch', 'Michael B.', 'V-Class', 'Driver assigned'],
] as const;

const fleetStatus = [
  ['S-Class', 'Ready', 'Today 10 AM', 'None'],
  ['Range Rover', 'In Prep', 'Today 12 PM', 'Detail pending'],
  ['V-Class', 'Out', 'Returns 4 PM', 'None'],
  ['BMW 7 Series', 'Maintenance', 'Blocked', 'Tire replacement'],
] as const;

const cashExposure = [
  ['Deposits Held', '$12,500'],
  ['Open Balances', '$3,250'],
  ['Refunds Pending', '$1,500'],
  ['Damage Claims', '2 open'],
] as const;

const commandAlerts = [
  'Range Rover returned with wheel damage',
  'S-Class booking awaiting deposit',
  'Driver reassignment needed at 3:00 PM',
] as const;

const tripStages = [
  'Inquiry',
  'Member Approved',
  'Payment Hold',
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
  ['Payment hold secured', true],
  ['Vehicle assigned', true],
  ['Driver assigned', true],
  ['Inspection complete', false],
] as const;

const dispatchRows = [
  ['S-Class', 'OUT', 'Active', 'Active', 'Return Prep'],
  ['Range Rover', 'Prep', 'Deliver', 'Active', 'Active'],
  ['V-Class', 'Ready', 'Ready', 'Pickup', 'Out'],
  ['BMW 7 Series', 'Blocked', 'Service', 'Service', 'Hold'],
] as const;

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
  ['WO-2201', 'BMW 7 Series', 'Tire replacement', '$750 limit', 'May 23, 5 PM'],
  ['WO-2202', 'Range Rover', 'Wheel inspection', '$1,200 limit', 'Today, 4 PM'],
] as const;

const appCollections = [
  {
    title: 'Executive Collection',
    copy: 'Premium sedans and chauffeured arrivals.',
    price: 'From $150 / day',
    image: '/assets/vehicle-sclass.jpg',
    icon: CarFront,
  },
  {
    title: 'Everyday Collection',
    copy: 'Refined daily mobility.',
    price: 'From $45 / day',
    image: '/assets/vehicle-camry-dark.png',
    icon: CarFront,
  },
  {
    title: 'Electric Collection',
    copy: 'Quiet, efficient, modern.',
    price: 'From $85 / day',
    image: '/assets/vehicle-model3-dark.png',
    icon: Zap,
  },
  {
    title: 'SUV Collection',
    copy: 'Space, comfort, and presence.',
    price: 'From $80 / day',
    image: '/assets/vehicle-rav4-dark.png',
    icon: CarFront,
  },
  {
    title: 'Weekly Plans',
    copy: 'Extended access for work, travel, and routine.',
    price: 'From $275 / week',
    image: '/assets/vehicle-van.jpg',
    icon: CalendarDays,
  },
] as const;

const appFleet = [
  {
    marque: 'Mercedes-Benz',
    model: 'S-Class',
    collection: 'Executive Collection',
    seats: 4,
    bags: 3,
    price: '$250',
    image: '/assets/vehicle-sclass.jpg',
  },
  {
    marque: 'Tesla',
    model: 'Model 3',
    collection: 'Electric Collection',
    seats: 5,
    bags: 3,
    price: '$95',
    image: '/assets/vehicle-model3-dark.png',
  },
  {
    marque: 'Toyota',
    model: 'Camry',
    collection: 'Everyday Collection',
    seats: 5,
    bags: 2,
    price: '$55',
    image: '/assets/vehicle-camry-dark.png',
  },
  {
    marque: 'Toyota',
    model: 'RAV4',
    collection: 'SUV Collection',
    seats: 5,
    bags: 3,
    price: '$75',
    image: '/assets/vehicle-rav4-dark.png',
  },
  {
    marque: 'Honda',
    model: 'Civic',
    collection: 'Everyday Collection',
    seats: 5,
    bags: 2,
    price: '$45',
    image: '/assets/vehicle-civic-dark.png',
  },
] as const;

const appMenuItems = [
  { label: 'Home', icon: HomeIcon },
  { label: 'Executive Collection', icon: CarFront },
  { label: 'Everyday Collection', icon: CarFront },
  { label: 'Electric Collection', icon: Zap },
  { label: 'SUV Collection', icon: CarFront },
  { label: 'Weekly Plans', icon: CalendarDays },
  { label: 'My Bookings', icon: CalendarCheck },
  { label: 'Favorites', icon: Heart },
  { label: 'Membership', icon: CircleCheck },
  { label: 'Payment Methods', icon: CreditCard },
  { label: 'Support', icon: Headphones },
  { label: 'Settings', icon: Settings },
  { label: 'Sign Out', icon: LogOut },
] as const;

const appBenefitRows = [
  ['Everyday Fleet Access', 'yes', 'yes', 'yes'],
  ['EV Access', 'no', 'yes', 'yes'],
  ['Weekly Rates', 'Standard', 'Preferred', 'Exclusive'],
  ['Airport Delivery', 'no', 'yes', 'yes'],
  ['Concierge Support', 'no', 'yes', 'yes'],
  ['Premium Fleet Access', 'no', 'yes', 'yes'],
  ['Chauffeured Service', 'no', 'no', 'yes'],
  ['Priority Availability', 'no', 'yes', 'yes'],
  ['Dedicated Assistance', 'no', 'yes', 'yes'],
] as const;

const mobileFleetTabs = ['All', 'Executive', 'Everyday', 'Electric', 'SUVs', 'Weekly'] as const;

type MobileFleetTab = (typeof mobileFleetTabs)[number];

type MobileScreenId =
  | 'splash'
  | 'home'
  | 'menu'
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
  if (title.includes('Executive')) return 'Executive';
  if (title.includes('Everyday')) return 'Everyday';
  if (title.includes('Electric')) return 'Electric';
  if (title.includes('SUV')) return 'SUVs';
  if (title.includes('Weekly')) return 'Weekly';
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
    { label: 'Vehicles', route: 'fleet' },
    { label: 'Experience', route: 'vehicle' },
    { label: 'About', route: 'about' },
    { label: 'Membership', route: 'membership' },
    { label: 'Weekly Plans', route: 'fleet' },
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
            Book Now
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
                Book Now
              </button>
              <p>
                <Headphones size={17} strokeWidth={1.35} />
                <span>Concierge: +1 (212) 555-0198</span>
                <b aria-hidden="true">|</b>
                <span>Available 24/7</span>
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function HomePage() {
  return (
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
        <h2>Discretion. Excellence. Wherever you are.</h2>
        <p>Curated vehicles. Impeccable service.</p>
      </div>

      <button className="hero-scroll" type="button" onClick={() => go('fleet')}>
        Scroll To Discover
        <ArrowRight size={23} strokeWidth={1.3} />
      </button>
    </section>
  );
}

function BookingPage() {
  const [driver, setDriver] = useState<'with-driver' | 'self-drive'>('with-driver');
  const [notice, setNotice] = useState('');
  const selected = vehicles[0];

  return (
    <section className="light-page booking-page">
      <SiteNav tone="light" compact showBook={false} />
      <div className="booking-shell">
        <div className="page-title reveal">
          <h1>Book A Vehicle</h1>
          <div className="steps" aria-label="Booking steps">
            {['Vehicle', 'Details', 'Confirm', 'Payment'].map((step, index) => (
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
            setNotice('Vehicle held for review. Member services will confirm availability.');
          }}
        >
          <div className="booking-vehicle">
            <img src={selected.image} alt="Mercedes-Benz S-Class" />
            <div className="booking-summary">
              <p className="vehicle-brand">{selected.brand}</p>
              <h2>{selected.name}</h2>
              <p>or similar</p>
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
                  <input aria-label="Pick-up Date" type="text" placeholder="Date" />
                </Field>
                <Field label="Pick-up Time" hiddenLabel>
                  <input aria-label="Pick-up Time" type="text" placeholder="Time" />
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
                  <input aria-label="Return Date" type="text" placeholder="Date" />
                </Field>
                <Field label="Return Time" hiddenLabel>
                  <input aria-label="Return Time" type="text" placeholder="Time" />
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
            Continue
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
  const categories: Array<'All Vehicles' | VehicleCategory> = ['All Vehicles', 'Sedans', 'SUVs', 'Vans', 'Coupes'];

  return (
    <section className="fleet-page dark-section page-min">
      <SiteNav tone="dark" active="fleet" />
      <div className="fleet-shell">
        <div className="page-title dark reveal">
          <h1>Our Fleet</h1>
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
            View All Vehicles
          </button>
        </div>
      </div>
    </section>
  );
}

function VehicleDetailPage() {
  const selected = vehicles[0];
  const [mainImage, setMainImage] = useState(selected.image);
  const thumbnails = [selected.image, '/assets/hero-arrival.png', '/assets/vehicle-sedan-side.jpg', '/assets/vehicle-noir.jpg'];

  return (
    <section className="light-page vehicle-detail-page">
      <SiteNav tone="light" compact showBack />
      <div className="detail-shell">
        <div className="detail-layout">
          <div className="detail-media reveal">
            <img className="detail-main" src={mainImage} alt="Mercedes-Benz S-Class exterior" />
            <div className="thumbnail-row">
              {thumbnails.map((image) => (
                <button
                  className={image === mainImage ? 'active' : ''}
                  key={image}
                  type="button"
                  onClick={() => setMainImage(image)}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          </div>

          <article className="detail-copy reveal">
            <p className="vehicle-brand">{selected.brand}</p>
            <h1>{selected.name}</h1>
            <p>or similar</p>
            <SpecLine vehicle={selected} />
            <p className="detail-description">
              The benchmark for executive travel. Experience refined performance, absolute comfort, and timeless
              design.
            </p>
          </article>
        </div>

        <div className="detail-lower reveal">
          <section>
            <h2>Specifications</h2>
            <dl>
              <div>
                <dt>Engine</dt>
                <dd>{selected.engine}</dd>
              </div>
              <div>
                <dt>Power</dt>
                <dd>{selected.power}</dd>
              </div>
              <div>
                <dt>0-100 km/h</dt>
                <dd>{selected.acceleration}</dd>
              </div>
              <div>
                <dt>Luggage Capacity</dt>
                <dd>{selected.bags} Bags</dd>
              </div>
            </dl>
          </section>
          <section>
            <h2>Inclusions</h2>
            <ul>
              <li>Complimentary bottled water</li>
              <li>Wi-Fi onboard</li>
              <li>Phone charger</li>
              <li>Professional driver if selected</li>
              <li>Toll and parking included selected areas</li>
            </ul>
          </section>
        </div>

        <div className="booking-bar reveal">
          <p>
            <span>From</span>${selected.price} <small>/ day</small>
          </p>
          <button className="primary-ink" type="button" onClick={() => go('book')}>
            Book This Vehicle
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
          <h1>Crafted for those who value more.</h1>
          <p>
            Obavia is a private vehicle rental house built on discretion, precision, and legacy. We offer more than
            vehicles, we deliver time, comfort, and absolute peace of mind.
          </p>
          <button className="text-link" type="button" onClick={() => go('membership')}>
            Our Philosophy
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
          <h2>Discreet</h2>
          <p>Your privacy is our highest priority.</p>
        </article>
        <article>
          <CarFront size={46} strokeWidth={1.35} />
          <h2>Curated</h2>
          <p>An exceptional fleet, meticulously selected.</p>
        </article>
        <article>
          <Gauge size={46} strokeWidth={1.35} />
          <h2>Dependable</h2>
          <p>Impeccable service, every time.</p>
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
          <h1>Membership Tier Marks</h1>
          <div className="tier-mark-grid">
            <TierMark tier="Standard" kind="standard" />
            <TierMark tier="Reserve" kind="reserve" />
            <TierMark tier="Noir" kind="noir" />
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

function MemberDashboard() {
  const [selected, setSelected] = useState<(typeof dashboardNav)[number]>('Overview');

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
              <p>Welcome back,</p>
              <h1>James Anderson</h1>
            </div>

            <article className="membership-status">
              <BrandMark size={66} tone="gold" />
              <div>
                <p>Membership Tier</p>
                <h2>Reserve</h2>
              </div>
              <button className="text-link" type="button" onClick={() => go('membership')}>
                View Benefits
              </button>
            </article>

            <section className="member-booking-block">
              <h2>Upcoming Booking</h2>
              <article className="upcoming-booking">
                <img src="/assets/vehicle-sclass.jpg" alt="Mercedes-Benz S-Class" />
                <div>
                  <h3>Mercedes-Benz S-Class</h3>
                  <span>May 24, 2025 - 10:00 AM</span>
                  <span>Downtown Office, New York</span>
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

function AdminDashboard() {
  const [selected, setSelected] = useState('Command');

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
            <h1>Command Center</h1>
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
            <p>Built around roles, not people</p>
            <h2>Every trip moves only when the required control point is complete.</h2>
          </div>
          <div className="staff-hero-control">
            <span>Core object</span>
            <strong>The Trip</strong>
            <p>Concierge creates it. Finance secures it. Fleet documents it. Dispatch releases it.</p>
          </div>
        </section>

        <div className="metric-grid reveal">
          {commandMetrics.map(([label, value, sub]) => (
            <article key={label}>
              <p>{label}</p>
              <h2>{value}</h2>
              <span>{sub}</span>
            </article>
          ))}
        </div>

        <div className="admin-grid">
          <article className="admin-table reveal">
            <div className="panel-heading">
              <h2>Booking Pipeline</h2>
              <select aria-label="Booking range" defaultValue="week">
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Member</th>
                  <th>Vehicle</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                {bookingPipeline.map(([stage, member, vehicle, control]) => (
                  <tr key={stage}>
                    <td>{stage}</td>
                    <td>{member}</td>
                    <td>{vehicle}</td>
                    <td>{control}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="text-link admin-table-link" type="button" onClick={() => go('book')}>
              Create Booking
              <ArrowRight size={18} strokeWidth={1.4} />
            </button>
          </article>

          <article className="risk-panel reveal">
            <div className="panel-heading">
              <h2>Alerts</h2>
              <ShieldAlert size={22} strokeWidth={1.35} />
            </div>
            <div className="alert-list">
              {commandAlerts.map((alert) => (
                <p key={alert}>{alert}</p>
              ))}
            </div>
            <div className="cash-exposure">
              {cashExposure.map(([label, value]) => (
                <span key={label}>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </span>
              ))}
            </div>
          </article>
        </div>

        <section className="trip-control reveal">
          <div className="panel-heading">
            <h2>Trip OB-1048</h2>
            <span className="panel-status">Ready for release after inspection</span>
          </div>
          <div className="stage-rail" aria-label="Trip locked stages">
            {tripStages.map((stage, index) => (
              <span className={index <= 5 ? 'complete' : index === 6 ? 'current' : ''} key={stage}>
                {stage}
              </span>
            ))}
          </div>
          <div className="gate-grid">
            {requiredGates.map(([gate, complete]) => (
              <span className={complete ? 'complete' : 'blocked'} key={gate}>
                <ClipboardCheck size={18} strokeWidth={1.4} />
                {gate}
              </span>
            ))}
          </div>
        </section>

        <section className="ops-grid">
          <article className="dispatch-panel reveal">
            <div className="panel-heading">
              <h2>Dispatch Board / Today</h2>
              <Gauge size={22} strokeWidth={1.35} />
            </div>
            <div className="dispatch-table">
              <div className="dispatch-head">
                <span>Vehicle</span>
                <span>8 AM</span>
                <span>10 AM</span>
                <span>12 PM</span>
                <span>4 PM</span>
              </div>
              {dispatchRows.map((row) => (
                <div className="dispatch-row" key={row[0]}>
                  {row.map((cell, index) => (
                    <span key={`${row[0]}-${index}-${cell}`}>{cell}</span>
                  ))}
                </div>
              ))}
            </div>
          </article>

          <article className="driver-panel reveal">
            <div className="panel-heading">
              <h2>Driver Mobile Task App</h2>
              <KeyRound size={22} strokeWidth={1.35} />
            </div>
            <div className="driver-phone">
              <p>Trip OB-1048</p>
              <h3>Mercedes-Benz S-Class</h3>
              <span>James Anderson / 10:00 AM / Downtown Office</span>
              <ul>
                {driverChecklist.map((item, index) => (
                  <li key={item}>
                    <span>{index < 2 ? 'Done' : 'Open'}</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button type="button">Enter Handoff PIN</button>
            </div>
          </article>
        </section>

        <section className="ops-grid">
          <article className="admin-table reveal">
            <div className="panel-heading">
              <h2>Fleet Control</h2>
              <CarFront size={22} strokeWidth={1.35} />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Next Booking</th>
                  <th>Issue</th>
                </tr>
              </thead>
              <tbody>
                {fleetStatus.map(([vehicle, status, nextBooking, issue]) => (
                  <tr key={vehicle}>
                    <td>{vehicle}</td>
                    <td>{status}</td>
                    <td>{nextBooking}</td>
                    <td>{issue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className="finance-panel reveal">
            <div className="panel-heading">
              <h2>Finance & Risk Console</h2>
              <WalletCards size={22} strokeWidth={1.35} />
            </div>
            <div className="finance-ledger">
              {bookings.slice(0, 3).map((booking, index) => (
                <div key={booking.customer}>
                  <span>{booking.vehicle}</span>
                  <strong>{index === 1 ? '$2,500 hold pending' : '$1,500 hold secured'}</strong>
                  <small>{booking.customer}</small>
                </div>
              ))}
            </div>
            <div className="finance-actions">
              <button type="button">Capture Balance</button>
              <button type="button">Hold Deposit</button>
              <button type="button">Create Damage Claim</button>
            </div>
          </article>
        </section>

        <section className="permission-panel reveal">
          <div className="panel-heading">
            <h2>Role-Based Permission Matrix</h2>
            <FileCheck2 size={22} strokeWidth={1.35} />
          </div>
          <div className="permission-table">
            <div className="permission-head">
              <span>Role</span>
              <span>Member Data</span>
              <span>Booking Edit</span>
              <span>Vehicle Assignment</span>
              <span>Payment Control</span>
              <span>Admin Settings</span>
            </div>
            {rolePermissions.map((row) => (
              <div className="permission-row" key={row[0]}>
                {row.map((cell, index) => (
                  <span key={`${row[0]}-${index}-${cell}`}>{cell}</span>
                ))}
              </div>
            ))}
          </div>
          <p className="control-rule">
            No single non-owner role can approve a customer, release a vehicle, release payment, and clear damage.
          </p>
        </section>

        <section className="ops-grid">
          <article className="vendor-panel reveal">
            <div className="panel-heading">
              <h2>Vendor Work Orders</h2>
              <Wrench size={22} strokeWidth={1.35} />
            </div>
            {workOrders.map(([id, vehicle, issue, limit, deadline]) => (
              <div className="work-order" key={id}>
                <span>{id}</span>
                <strong>{vehicle}</strong>
                <p>{issue}</p>
                <small>{limit} / {deadline}</small>
              </div>
            ))}
          </article>

          <article className="release-panel reveal">
            <div className="panel-heading">
              <h2>Release Controls</h2>
              <ShieldCheck size={22} strokeWidth={1.35} />
            </div>
            <ol>
              <li>Valid card and deposit hold are active.</li>
              <li>ID and license are verified.</li>
              <li>Pre-trip photos and mileage are attached.</li>
              <li>Driver confirms arrival and handoff PIN.</li>
              <li>Return inspection completes before deposit release.</li>
            </ol>
          </article>
        </section>
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
    { label: 'Book', icon: CalendarDays, screen: 'booking' },
    { label: 'Membership', icon: null, screen: 'membership' },
    { label: 'Account', icon: UserRound, screen: 'benefits' },
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
        <p>Private access. Everyday utility.</p>
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
  const actions = [
    { label: 'Book a Vehicle', icon: CalendarCheck, screen: 'booking' },
    { label: 'View Fleet', icon: CarFront, screen: 'fleet' },
    { label: 'Weekly Plans', icon: CalendarDays, screen: 'categories' },
    { label: 'Membership', icon: CircleCheck, screen: 'membership' },
  ] as const;

  return (
    <div className="app-screen app-screen-dark">
      <IosStatus />
      <div className="screen-body with-bottom-nav">
        <MobileTopBar
          left={<MobileIconButton label="Open menu" onClick={() => onSelect('menu')}><Menu size={28} strokeWidth={1.45} /></MobileIconButton>}
          right={<MobileIconButton label="Notifications"><Bell size={24} strokeWidth={1.35} /></MobileIconButton>}
        />
        <section className="app-greeting">
          <p>Good morning,</p>
          <h2>James</h2>
          <span>Reserve member</span>
        </section>
        <section className="upcoming-card">
          <div>
            <p>Upcoming Booking</p>
            <span>Mercedes-Benz</span>
            <h3>S-Class</h3>
            <small>May 24, 2025 {'\u00b7'} 10:00 AM</small>
            <small>Downtown Office, New York</small>
          </div>
          <img src="/assets/vehicle-sclass.jpg" alt="Mercedes-Benz S-Class" />
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
    { label: 'Vehicles', tab: 'All' },
    { label: 'Experience', screen: 'detail' },
    { label: 'About', screen: 'home' },
    { label: 'Membership', screen: 'membership' },
    { label: 'Weekly Plans', tab: 'Weekly' },
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
  const openBooking = () => {
    emitMenuInteractionSound('click');
    onSelect('booking');
  };
  const signIn = () => {
    emitMenuInteractionSound('click');
    onSelect('home');
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
        <button
          className="menu-sign-in"
          type="button"
          onMouseEnter={previewMenuSound}
          onFocus={previewMenuSound}
          onClick={signIn}
        >
          Sign In
        </button>
        <button
          className="menu-book-now"
          type="button"
          onMouseEnter={previewMenuSound}
          onFocus={previewMenuSound}
          onClick={openBooking}
        >
          Book Now
        </button>
        <div className="concierge-strip">
          <Headphones size={18} strokeWidth={1.3} />
          <span>Concierge: +1 (212) 555-0198</span>
          <b aria-hidden="true">|</b>
          <span>Available 24/7</span>
        </div>
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
          <h2>Choose Your Collection</h2>
          <p>Vehicles curated for every way you move.</p>
        </header>
        <div className="collection-list">
          {appCollections.map(({ title, copy, price, image, icon: Icon }, index) => (
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
              <img src={image} alt="" />
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
    if (activeTab === 'Executive') return vehicle.collection === 'Executive Collection';
    if (activeTab === 'Everyday') return vehicle.collection === 'Everyday Collection';
    if (activeTab === 'Electric') return vehicle.collection === 'Electric Collection';
    if (activeTab === 'SUVs') return vehicle.collection === 'SUV Collection';
    return vehicle.collection === 'Everyday Collection' || vehicle.collection === 'SUV Collection';
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
          <h2>Curated Fleet</h2>
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
              <img src={vehicle.image} alt="" />
              <div>
                <span>{vehicle.marque}</span>
                <h3>{vehicle.model}</h3>
                <p>{vehicle.collection}</p>
                <small>{vehicle.seats} Seats {'\u00b7'} {vehicle.bags} Bags</small>
                <strong>From {vehicle.price} <em>/ day</em></strong>
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
  const inclusions = [
    'Bluetooth connectivity',
    'Phone charger',
    'Clean interior standard',
    'Weekly plans available',
    'Professional driver optional',
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
        <img className="detail-vehicle-image" src="/assets/vehicle-model3-ivory.png" alt="Tesla Model 3 studio view" />
        <article className="detail-app-copy">
          <h2>Tesla Model 3</h2>
          <p>Elevated. Efficient. Effortless.</p>
          <div className="detail-specs">
            <span><UsersRound size={22} strokeWidth={1.35} />5 Seats</span>
            <span><Gauge size={22} strokeWidth={1.35} />Automatic</span>
            <span><Briefcase size={22} strokeWidth={1.35} />3 Bags</span>
          </div>
          <p className="detail-description-app">
            Sleek, intelligent, and effortlessly refined. Designed for everyday mobility with comfort, efficiency,
            and ease.
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
            <p><span>From</span>$95 <small>/ day</small></p>
            <button type="button" onClick={() => onSelect('booking')}>Book This Vehicle</button>
          </div>
        </article>
      </div>
      <MobileBottomNav active="Fleet" tone="light" onSelect={onSelect} />
    </div>
  );
}

function MobileBookingScreen({ onSelect = noopMobileSelect }: MobileScreenProps) {
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
          <h2>Book a Vehicle</h2>
          <div className="booking-steps-app">
            {['Vehicle', 'Details', 'Confirm', 'Payment'].map((step, index) => (
              <span className={index === 0 ? 'active' : ''} key={step}>{index + 1}. {step}</span>
            ))}
          </div>
        </header>
        <article className="selected-vehicle-card">
          <img src="/assets/vehicle-camry-dark.png" alt="" />
          <div>
            <p>Everyday Collection</p>
            <h3>Toyota Camry LE</h3>
            <span>or similar</span>
            <small>5 Seats {'\u00b7'} Automatic {'\u00b7'} 2 Bags</small>
          </div>
        </article>
        <div className="booking-fields-app">
          {fields.map(([label, placeholder, Icon], index) => (
            <label className={index === 0 || index === 3 ? 'wide' : ''} key={`${label}-${placeholder}`}>
              <span>{label}</span>
              <i>
                <Icon size={18} strokeWidth={1.35} />
                {placeholder}
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
          Weekly plans available
        </div>
        <button className="continue-app-button" type="button" onClick={() => onSelect('membership')}>Continue</button>
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
          <h2>Membership</h2>
          <p>Access tailored to the way you move.</p>
        </header>
        <div className="tier-card-list">
          <TierAppCard tier="Standard" mark="standard" benefits={['Everyday access', 'Weekly plans', 'Essential support']} />
          <TierAppCard tier="Reserve" mark="reserve" popular benefits={['Priority booking', 'Premium fleet access', 'Concierge support', 'Better availability']} />
          <TierAppCard tier="Noir" mark="noir" benefits={['Invitation-only access', 'Chauffeured privileges', 'First-call availability', 'Bespoke service']} />
        </div>
        <button className="compare-benefits-button" type="button" onClick={() => onSelect('benefits')}>Compare Benefits</button>
        <p className="membership-footer-copy">Questions about membership?</p>
        <button className="membership-concierge-link" type="button">Contact Concierge</button>
      </div>
      <MobileBottomNav active="Membership" tone="light" onSelect={onSelect} />
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
    <div className="app-screen app-screen-dark">
      <IosStatus />
      <div className="screen-body benefits-app-body with-bottom-nav">
        <header className="benefits-head">
          <BrandMark size={58} tone="gold" />
          <h2>Benefits by Tier</h2>
          <p>Choose your level of access.</p>
        </header>
        <div className="benefits-table-app">
          <div className="benefits-columns">
            <span />
            <span>Standard</span>
            <span className="reserve">Reserve</span>
            <span>Noir</span>
          </div>
          {appBenefitRows.map(([label, standard, reserve, noir]) => (
            <div className="benefits-row" key={label}>
              <span>{label}</span>
              <BenefitCell value={standard} />
              <BenefitCell reserve value={reserve} />
              <BenefitCell value={noir} />
            </div>
          ))}
        </div>
        <button className="upgrade-button-app" type="button">Upgrade to Reserve</button>
        <button className="request-noir-button" type="button">Request Noir Access <ArrowRight size={16} strokeWidth={1.35} /></button>
      </div>
      <MobileBottomNav active="Membership" onSelect={onSelect} />
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
        <UsersRound size={22} strokeWidth={1.35} />
        {vehicle.seats} Seats
      </span>
      <span>
        <Gauge size={22} strokeWidth={1.35} />
        {vehicle.gearbox}
      </span>
      <span>
        <Briefcase size={22} strokeWidth={1.35} />
        {vehicle.bags} Bags
      </span>
    </div>
  );
}

function TierMark({ tier, kind }: { tier: 'Standard' | 'Reserve' | 'Noir'; kind: 'standard' | 'reserve' | 'noir' }) {
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
