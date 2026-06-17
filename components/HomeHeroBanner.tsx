import Link from 'next/link';
import Icon from './Icon';

interface Props {
  firstName: string;
  totalShots: number;
  totalSessions: number;
}

/**
 * Branded hero banner that sits above the Insights feed. Combines a Rapsodo-red
 * radial wash with a subtle animated ball-flight arc, plus three at-a-glance
 * metrics. Purely presentational — no data fetching, all numbers passed in.
 */
export default function HomeHeroBanner({ firstName, totalShots, totalSessions }: Props) {
  return (
    <section
      className="rcl-brand-bg rcl-fade-up relative overflow-hidden rounded-3xl mb-10 text-white"
      aria-label="Welcome banner"
    >
      {/* Decorative ball-flight arc — pure decoration, motion only. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 800 320"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="rcl-arc" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#CD1B32" stopOpacity="0" />
            <stop offset="0.3" stopColor="#CD1B32" stopOpacity="0.9" />
            <stop offset="0.7" stopColor="#1CB864" stopOpacity="0.9" />
            <stop offset="1" stopColor="#1CB864" stopOpacity="0" />
          </linearGradient>
          <path
            id="rcl-arc-path"
            d="M 40 260 Q 380 -40 760 250"
            fill="none"
          />
        </defs>
        <use
          href="#rcl-arc-path"
          stroke="url(#rcl-arc)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="480"
          style={{ animation: 'rcl-hero-arc 1800ms var(--ease-out) both' }}
        />
        {/* Ghost trail */}
        <use
          href="#rcl-arc-path"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
          strokeDasharray="3 6"
        />
        {/* Travelling ball */}
        <circle
          r="6"
          fill="#fff"
          style={{
            offsetPath: "path('M 40 260 Q 380 -40 760 250')",
            animation: 'rcl-hero-ball 3200ms var(--ease-out) infinite',
            filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.85))',
          }}
        />
      </svg>

      <div className="relative z-10 grid gap-8 px-7 py-10 sm:px-10 sm:py-12 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-caps text-white/70">
            <span className="inline-block h-1.5 w-6 rounded-pill rcl-brand-strip" />
            Rapsodo Golf · Insights
          </div>
          <h1 className="type-display-md mt-3 leading-[1.05]">
            Welcome back,
            <br />
            <span className="text-rap-red">{firstName}</span>
            <span className="text-white">.</span>
          </h1>
          <p className="mt-4 max-w-md text-white/75 text-base leading-relaxed">
            Every swing, every session, every yard. Here&apos;s what your data is
            telling you today.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/shot-review"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-rap-red text-white text-sm font-semibold uppercase tracking-cta hover:bg-rap-red-hover transition-colors shadow-lg"
            >
              Review your shots
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/sessions"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-white/10 border border-white/20 text-white text-sm font-semibold uppercase tracking-cta hover:bg-white/15 transition-colors backdrop-blur-sm"
            >
              Browse sessions
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <HeroStat label="Shots" value={totalShots.toLocaleString()} accent="red" />
          <HeroStat label="Sessions" value={totalSessions.toLocaleString()} accent="green" />
          <HeroStat label="Streak" value="7 days" accent="white" />
        </div>
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'red' | 'green' | 'white';
}) {
  const bar =
    accent === 'red'
      ? 'bg-rap-red'
      : accent === 'green'
        ? 'bg-sport-golf-600'
        : 'bg-white/70';
  return (
    <div className="relative rounded-xl bg-white/[0.06] border border-white/10 px-3 py-4 backdrop-blur-sm overflow-hidden">
      <span className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
      <div className="pl-2">
        <div className="text-[10px] font-bold uppercase tracking-caps text-white/55">
          {label}
        </div>
        <div className="type-display-xs mt-1 text-white tabular-nums">{value}</div>
      </div>
    </div>
  );
}
