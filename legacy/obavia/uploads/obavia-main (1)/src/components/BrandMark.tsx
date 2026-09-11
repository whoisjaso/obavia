type BrandMarkProps = {
  tone?: 'gold' | 'ink' | 'ivory';
  size?: number;
  className?: string;
  wordmark?: boolean;
};

const toneMap = {
  gold: '#b89b5e',
  ink: '#121212',
  ivory: '#F5F0E6',
};

export function BrandMark({
  tone = 'gold',
  size = 42,
  className,
  wordmark = false,
}: BrandMarkProps) {
  const stroke = toneMap[tone];

  return (
    <span className={className ? `brand-lockup ${className}` : 'brand-lockup'}>
      <svg
        className="brand-mark"
        width={size}
        height={Math.round(size * 1.18)}
        viewBox="0 0 120 160"
        aria-hidden="true"
      >
        <g fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round">
          <ellipse cx="50" cy="80" rx="30" ry="61" />
          <ellipse cx="70" cy="80" rx="30" ry="61" />
          <ellipse cx="60" cy="80" rx="38" ry="70" opacity=".72" />
        </g>
      </svg>
      {wordmark ? (
        <span className="wordmark" aria-label="OBAVIA">
          OBAVIA
        </span>
      ) : null}
    </span>
  );
}
