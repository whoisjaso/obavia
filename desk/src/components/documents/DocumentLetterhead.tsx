import { brand } from "@/lib/dealership-config";
import {
  DEALER_ADDRESS,
  DEALER_LICENSE,
  DEALER_NAME,
  DEALER_PHONE,
  DEALER_WEBSITE,
} from "@/lib/documents/shared";

/**
 * The letterhead every dealer document carries. (Production desk component;
 * the dealer's own mark replaces Triple J's monogram and wordmark artwork.)
 *
 * Typographic, not a badge: the wordmark, a hairline, and the dealer block set
 * small. A document is read and filed, sometimes photocopied — so it is built
 * out of black type and rules rather than a logo that turns to mud on a fax.
 *
 * Dealer details come from the shared config. Nobody types them onto a form.
 */
export default function DocumentLetterhead({
  title,
  subtitle,
  reference,
}: {
  title: string;
  subtitle?: string;
  /** Date, stock number and anything else that identifies this copy. */
  reference?: Array<{ label: string; value: string }>;
}) {
  return (
    <header className="doc-letterhead">
      <div className="doc-letterhead-row">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* The dealer's mark, in ink: colour turns to mud on a copier. With no
              artwork, the production Wordmark's text form. */}
          {brand.logo
            ? <img src={brand.logo} alt={brand.full} style={{ height: 54, width: "auto", maxWidth: 220, objectFit: "contain", filter: "grayscale(1) contrast(1.15)" }} />
            : <span role="img" aria-label={brand.full} style={{ width: 168, maxWidth: "100%", color: "var(--tj-ink)", textAlign: "center", fontFamily: "var(--font-editorial)" }}>
                <span style={{ display: "block", fontSize: 168 / 7, lineHeight: 1 }}>{brand.short}</span>
              </span>}
        </div>
        <div className="doc-dealer">
          <p className="doc-dealer-name">{DEALER_NAME}</p>
          <p>{DEALER_ADDRESS}</p>
          <p>
            {DEALER_PHONE} · {DEALER_WEBSITE}
          </p>
          <p>Dealer licence {DEALER_LICENSE}</p>
        </div>
      </div>

      <div className="doc-title-row">
        <div>
          <h1 className="doc-title">{title}</h1>
          {subtitle ? <p className="doc-subtitle">{subtitle}</p> : null}
        </div>
        {reference && reference.length > 0 ? (
          <dl className="doc-reference">
            {reference.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </header>
  );
}
