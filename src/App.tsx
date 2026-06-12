import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  CarFront,
  ChevronLeft,
  CreditCard,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
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
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Bookings', icon: CalendarDays },
  { label: 'Vehicles', icon: CarFront },
  { label: 'Customers', icon: UsersRound },
  { label: 'Calendar', icon: CalendarDays },
  { label: 'Payments', icon: CreditCard },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Settings', icon: Settings },
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
  const [selected, setSelected] = useState('Overview');

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
          <h1>Dashboard</h1>
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
        <div className="metric-grid reveal">
          {[
            ['Total Bookings', '128', '+12% from last month'],
            ['Total Revenue', '$48,750', '+18% from last month'],
            ['Active Vehicles', '24', '100% available'],
            ['Customers', '356', '+8% from last month'],
          ].map(([label, value, sub]) => (
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
              <h2>Recent Bookings</h2>
              <select aria-label="Booking range" defaultValue="week">
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Member</th>
                  <th>Pickup</th>
                  <th>Return</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking, index) => (
                  <tr key={`${booking.date}-${booking.customer}`}>
                    <td>{booking.date}, {booking.time}</td>
                    <td>{booking.vehicle}</td>
                    <td>{booking.customer}</td>
                    <td>{index < 2 ? 'May 24, 10:00 AM' : 'May 23, 9:00 AM'}</td>
                    <td>{index < 2 ? 'May 26, 10:00 AM' : 'May 24, 9:00 AM'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className="text-link admin-table-link" type="button" onClick={() => go('book')}>
              View All Bookings
              <ArrowRight size={18} strokeWidth={1.4} />
            </button>
          </article>
          <article className="chart-panel reveal">
            <div className="panel-heading">
              <h2>Bookings Overview</h2>
              <select aria-label="Chart range" defaultValue="week">
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <svg viewBox="0 0 620 420" role="img" aria-label="Gold line chart showing weekly bookings">
              <path className="chart-axis" d="M64 58V348H590" />
              <path className="chart-grid-line" d="M64 58H590M64 130H590M64 202H590M64 274H590" />
              <path className="chart-fill" d="M64 286L142 198L220 224L298 254L376 246L454 164L532 222L590 94V348H64Z" />
              <polyline
                className="chart-line"
                points="64,286 142,198 220,224 298,254 376,246 454,164 532,222 590,94"
              />
              <g className="chart-points">
                {[64, 142, 220, 298, 376, 454, 532, 590].map((x, index) => {
                  const y = [286, 198, 224, 254, 246, 164, 222, 94][index];
                  return <circle key={x} cx={x} cy={y} r="6" />;
                })}
              </g>
              <g className="chart-labels">
                {['May 18', 'May 19', 'May 20', 'May 21', 'May 22', 'May 23', 'May 24'].map((label, index) => (
                  <text key={label} x={76 + index * 82} y="384">
                    {label}
                  </text>
                ))}
              </g>
            </svg>
          </article>
        </div>
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
