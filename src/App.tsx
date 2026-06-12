import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  CarFront,
  ChevronLeft,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BrandMark } from './components/BrandMark';
import { VehicleCard } from './components/VehicleCard';
import { bookings, locations, vehicles, type VehicleCategory } from './data';

type Route =
  | 'home'
  | 'book'
  | 'fleet'
  | 'vehicle'
  | 'about'
  | 'membership'
  | 'member'
  | 'admin';

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

function getRoute(): Route {
  const hash = window.location.hash.replace('#', '');
  if (
    hash === 'book' ||
    hash === 'fleet' ||
    hash === 'vehicle' ||
    hash === 'about' ||
    hash === 'membership' ||
    hash === 'member' ||
    hash === 'admin'
  ) {
    return hash;
  }
  return 'home';
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
      {route === 'home' ? <HomePage /> : null}
      {route === 'book' ? <BookingPage /> : null}
      {route === 'fleet' ? <FleetPage /> : null}
      {route === 'vehicle' ? <VehicleDetailPage /> : null}
      {route === 'about' ? <AboutPage /> : null}
      {route === 'membership' ? <MembershipPage /> : null}
      {route === 'member' ? <MemberDashboard /> : null}
      {route === 'admin' ? <AdminDashboard /> : null}
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

  return (
    <header className={`site-nav ${tone} ${compact ? 'compact' : 'full'}`}>
      <div className="nav-left">
        {showBack ? (
          <button className="back-link nav-back" type="button" onClick={() => go('fleet')}>
            <ChevronLeft size={20} strokeWidth={1.6} />
            Back
          </button>
        ) : (
          <button className="icon-button menu-button" type="button" onClick={() => setOpen((value) => !value)}>
            <Menu size={27} strokeWidth={1.7} />
            <span className="sr-only">Open navigation</span>
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
        <div className="mobile-nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                go(item.route);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
          <button type="button" onClick={() => go('book')}>
            Book Now
          </button>
        </div>
      ) : null}
    </header>
  );
}

function HomePage() {
  return (
    <section className="hero-frame">
      <img className="hero-image" src="/assets/hero-arrival.png" alt="Private chauffeur beside an executive sedan" />
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
