'use client';

import { useMemo, useState, type ReactNode } from 'react';
import type { ApprovalStatus, OfferVersion } from '@apohenia/domain/schemas';
import {
  EMPTY_OFFER_STATUS_MAP,
  OFFER_STATUS_STORAGE_KEY,
  OfferStatusMap,
  PRICE_NOT_SET_NAME,
  applyOfferStatuses,
  canQuotePrice,
  canTransitionOffer,
  formatMoney,
  isOfferImmutable,
  liveOffers,
  nextOfferStatus,
  practiceOffers,
  statusGlyph,
} from '@apohenia/domain/offers';
import { Card, Chip, FictionalPill, GlyphPill, IconButton, Sheet, Tile, TileGrid, Toast, TopBar, useToast } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import styles from './offers.module.css';

interface Props {
  offers: OfferVersion[];
  placeholder: boolean;
}

type Filter = 'offers' | 'practice';
type SheetState = { kind: 'offer'; id: string } | { kind: 'confirm'; id: string; to: ApprovalStatus } | null;

function Caption({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className={styles.caption}>
      {children}
    </h3>
  );
}

function List({ items, empty }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <p className={styles.emptyNote}>{empty ?? 'none'}</p>;
  return (
    <ul className={styles.list}>
      {items.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

/** One price figure: `—` for unset with its accessible truth; a fixture figure is named fictional. */
function Money({ minor, currency, what, fictional, hook }: { minor: number | null; currency: string; what: string; fictional: boolean; hook: string }) {
  const unset = minor === null;
  const text = unset ? '—' : formatMoney(minor, currency);
  const name = unset ? `${what}: ${PRICE_NOT_SET_NAME}` : fictional ? `${what}: fictional fixture ${text} — never quoted live` : `${what}: ${text}`;
  return (
    <span className={styles.money}>
      <span className={[styles.moneyValue, unset ? styles.moneyUnset : ''].join(' ').trim()} role="img" aria-label={name} title={name} data-price={hook} data-price-set={unset ? 'no' : 'yes'}>
        {text}
      </span>
      <span className={styles.moneyKey} aria-hidden="true">
        {what}
      </span>
    </span>
  );
}

function OfferCard({ offer, practice, onOpen }: { offer: OfferVersion; practice: boolean; onOpen: () => void }) {
  const g = statusGlyph(offer.status);
  return (
    <Card onPress={onOpen} name={`${offer.name}. ${g.name}.${offer.fictional ? ' Fictional training offer — not a real quote.' : ''} Open.`} data-offer={offer.id} data-offer-kind={practice ? 'practice' : 'live'} data-offer-status={offer.status}>
      <div className={styles.offerHead}>
        <span className={styles.offerName}>{offer.name}</span>
        <span className={styles.offerPills}>
          <GlyphPill glyph={g.glyph} label={g.word} tone={g.tone} name={g.name} data-status-pill={offer.status} />
          {offer.fictional ? <FictionalPill /> : null}
        </span>
      </div>
      <div className={styles.priceRow}>
        <Money minor={offer.price.setup_minor_units} currency={offer.price.currency} what="Setup" fictional={offer.fictional} hook="setup" />
        <Money minor={offer.price.recurring_minor_units} currency={offer.price.currency} what="Recurring" fictional={offer.fictional} hook="recurring" />
      </div>
      <ol className={styles.pillarRow} aria-label="Three pillars">
        {offer.pillars.map((p, i) => (
          <li key={p.name} className={styles.pillarChip}>
            <span className={styles.pillarIndex} aria-hidden="true">
              {i + 1}
            </span>
            <span>{p.name}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function OffersClient({ offers, placeholder }: Props) {
  // B-12: the one store of truth for status; /scripts reads this same key.
  const [statuses, setStatuses, hydrated] = useStoredState(OFFER_STATUS_STORAGE_KEY, OfferStatusMap, EMPTY_OFFER_STATUS_MAP);
  const [filter, setFilter] = useState<Filter>('offers');
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toast, showToast] = useToast();

  const current = useMemo(() => applyOfferStatuses(offers, hydrated ? statuses : EMPTY_OFFER_STATUS_MAP), [offers, statuses, hydrated]);
  const live = useMemo(() => liveOffers(current), [current]);
  const practice = useMemo(() => practiceOffers(current), [current]);
  const shown = filter === 'offers' ? live : practice;

  const sheetOffer = sheet ? (current.find((o) => o.id === sheet.id) ?? null) : null;
  const sheetIsPractice = sheetOffer ? sheetOffer.fictional || sheetOffer.practice_only === true : false;

  function requestTransition(o: OfferVersion, to: ApprovalStatus) {
    if (!canTransitionOffer(o.status, to)) return;
    if (to === 'published' || to === 'retired') setSheet({ kind: 'confirm', id: o.id, to });
    else apply(o, to);
  }

  function apply(o: OfferVersion, to: ApprovalStatus) {
    if (!canTransitionOffer(o.status, to)) return;
    setStatuses((prev) => ({ ...prev, [o.id]: to }));
    setSheet({ kind: 'offer', id: o.id });
    const g = statusGlyph(to);
    showToast(`${g.glyph} ${g.word} · ${o.name}`, to === 'published' ? 'green' : 'neutral');
  }

  return (
    <div className={styles.root} data-offers data-hydrated={hydrated ? 'true' : 'false'}>
      <TopBar title="Offers" right={<IconButton icon="script" label="Script" href="/scripts" />} />

      <div className={styles.filters} role="group" aria-label="Show">
        <Chip label="Offers" toggle selected={filter === 'offers'} onClick={() => setFilter('offers')} name={`Offers, ${live.length} — the only versions a script may reference`} data-filter="offers" />
        <Chip label="Practice" glyph="✦" tone="purple" toggle selected={filter === 'practice'} onClick={() => setFilter('practice')} name={`Practice fixtures, ${practice.length} — fictional offers for mock scenarios; never live, never quoted`} data-filter="practice" />
      </div>

      {placeholder ? <GlyphPill glyph="◔" label="Placeholder" tone="orange" name="The offers seed is still a placeholder — nothing here is authored content" /> : null}

      <div className={styles.cards} data-offer-list={filter}>
        {shown.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyGlyph} aria-hidden="true">
              ∅
            </span>
            <span className={styles.emptyLabel}>{filter === 'offers' ? 'No offers' : 'No fixtures'}</span>
          </div>
        ) : (
          shown.map((o) => <OfferCard key={o.id} offer={o} practice={filter === 'practice'} onOpen={() => setSheet({ kind: 'offer', id: o.id })} />)
        )}
      </div>

      {/* ================= offer sheet ================= */}
      <Sheet open={sheet?.kind === 'offer' && sheetOffer !== null} onClose={() => setSheet(null)} title={sheetOffer?.name ?? 'Offer'} data-sheet="offer" tall>
        {sheetOffer ? (
          (() => {
            const g = statusGlyph(sheetOffer.status);
            const next = nextOfferStatus(sheetOffer.status);
            const readOnly = isOfferImmutable(sheetOffer);
            return (
              <div className={styles.sheetBody} data-offer-sheet={sheetOffer.id} data-offer-sheet-status={sheetOffer.status}>
                <div className={styles.sheetHead}>
                  <GlyphPill glyph={g.glyph} label={g.word} tone={g.tone} name={g.name} data-sheet-status={sheetOffer.status} />
                  {sheetOffer.fictional ? <FictionalPill /> : null}
                  {sheetOffer.practice_only ? <GlyphPill glyph="⊘" label="Never live" tone="purple" name="Practice-only fixture — structurally excluded from the live offer list and from live pricing" data-practice-only /> : null}
                  {readOnly ? <GlyphPill glyph="🔒" label="Frozen" tone="neutral" name="Published or retired offers are immutable; a change means a new version" data-read-only /> : null}
                  <Chip static label={`v${sheetOffer.version}`} name={`Offer ${sheetOffer.offer_id}, version ${sheetOffer.version}, id ${sheetOffer.id}`} className={styles.mono} />
                </div>

                {sheetOffer.fictional ? (
                  <p className={styles.banner} role="note" data-fictional-banner>
                    {sheetOffer.fictional_banner}
                  </p>
                ) : null}

                {!sheetIsPractice ? (
                  <TileGrid columns={2}>
                    {next && next !== 'retired' ? (
                      <Tile
                        icon={next === 'published' ? 'lock' : 'check'}
                        label={next === 'reviewed' ? 'Review' : 'Publish'}
                        tone={next === 'published' ? 'green' : 'blue'}
                        name={next === 'reviewed' ? 'Mark reviewed: the owner accepts the wording as a candidate; still not live' : 'Publish: approve and freeze this version; a blank price still blocks quoting'}
                        onClick={() => requestTransition(sheetOffer, next)}
                        data-transition={next}
                      />
                    ) : null}
                    {sheetOffer.status === 'published' ? <Tile icon="ban" label="Retire" tone="orange" name="Retire: no longer referenced by any live script; kept for history" onClick={() => requestTransition(sheetOffer, 'retired')} data-transition="retired" /> : null}
                  </TileGrid>
                ) : null}

                <section aria-labelledby="o-price" data-price-section>
                  <Caption id="o-price">Price</Caption>
                  <div className={styles.priceRow}>
                    <Money minor={sheetOffer.price.setup_minor_units} currency={sheetOffer.price.currency} what="Setup" fictional={sheetOffer.fictional} hook="sheet-setup" />
                    <Money minor={sheetOffer.price.recurring_minor_units} currency={sheetOffer.price.currency} what="Recurring" fictional={sheetOffer.fictional} hook="sheet-recurring" />
                    <span className={styles.money} role="img" aria-label={`Currency ${sheetOffer.price.currency}`}>
                      <span className={styles.moneyValue} aria-hidden="true">
                        {sheetOffer.price.currency}
                      </span>
                      <span className={styles.moneyKey} aria-hidden="true">
                        Currency
                      </span>
                    </span>
                  </div>
                  {/^\s*(not set)?\s*$/i.test(sheetOffer.price.payment_schedule) ? null : <p className={styles.body}>{sheetOffer.price.payment_schedule}</p>}
                  {sheetOffer.price.setup_minor_units === null || sheetOffer.price.recurring_minor_units === null ? (
                    <GlyphPill glyph="—" label="Not set" tone="orange" name={`${PRICE_NOT_SET_NAME}. Live price and proposal actions are blocked until an offer is approved.`} data-blank-price-note />
                  ) : null}
                  {sheetIsPractice ? <GlyphPill glyph="✦" label="Never quoted" tone="purple" name={`Fixture price for practice only — never quoted live (quotable: ${canQuotePrice(sheetOffer) ? 'yes' : 'no'})`} data-never-quoted /> : null}
                </section>

                <section aria-labelledby="o-timing">
                  <Caption id="o-timing">Timing</Caption>
                  <div className={styles.timing}>
                    <span className={styles.timingKey}>Estimated</span>
                    <span className={styles.body}>{sheetOffer.timing.estimated ?? '—'}</span>
                    <span className={styles.timingKey}>Committed</span>
                    <span className={styles.body}>{sheetOffer.timing.committed ?? '—'}</span>
                  </div>
                </section>

                <section aria-labelledby="o-pillars">
                  <Caption id="o-pillars">Pillars</Caption>
                  <div className={styles.pillars}>
                    {sheetOffer.pillars.map((p, i) => (
                      <div key={p.name} className={styles.pillar}>
                        <div className={styles.pillarName}>
                          <span className={styles.pillarIndex} aria-hidden="true">
                            {i + 1}
                          </span>
                          {p.name}
                        </div>
                        <p className={styles.small}>{p.connects_to_problem}</p>
                        <p className={styles.body}>{p.delivery}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section aria-labelledby="o-buyer">
                  <Caption id="o-buyer">Buyer</Caption>
                  <p className={styles.body}>{sheetOffer.buyer_type}</p>
                </section>
                <section aria-labelledby="o-problem">
                  <Caption id="o-problem">Problem</Caption>
                  <p className={styles.body}>{sheetOffer.problem}</p>
                </section>
                <section aria-labelledby="o-prereq">
                  <Caption id="o-prereq">Prerequisites</Caption>
                  <List items={sheetOffer.prerequisites} />
                </section>
                <section aria-labelledby="o-deliv">
                  <Caption id="o-deliv">Deliverables</Caption>
                  <List items={sheetOffer.deliverables} />
                </section>
                <section aria-labelledby="o-excl">
                  <Caption id="o-excl">Exclusions</Caption>
                  <List items={sheetOffer.exclusions} />
                </section>
                <section aria-labelledby="o-deps">
                  <Caption id="o-deps">Dependencies</Caption>
                  <List items={sheetOffer.implementation_dependencies} />
                </section>
                <section aria-labelledby="o-proof">
                  <Caption id="o-proof">Proof</Caption>
                  <List items={sheetOffer.supported_proof} empty={sheetOffer.supported_proof_note ?? 'none'} />
                </section>
                <section aria-labelledby="o-claims">
                  <Caption id="o-claims">Claims</Caption>
                  <List items={sheetOffer.approved_claims} empty={sheetOffer.approved_claims_note ?? 'none'} />
                </section>
                <section aria-labelledby="o-accept">
                  <Caption id="o-accept">Acceptance</Caption>
                  <List items={sheetOffer.acceptance_criteria} />
                </section>
                <section aria-labelledby="o-roles">
                  <Caption id="o-roles">Roles</Caption>
                  <List items={sheetOffer.decision_roles} />
                </section>
                <section aria-labelledby="o-support">
                  <Caption id="o-support">Support</Caption>
                  <p className={styles.body}>{sheetOffer.support}</p>
                </section>
                <section aria-labelledby="o-exit">
                  <Caption id="o-exit">Exit</Caption>
                  <p className={styles.body}>{sheetOffer.cancellation_exit_handoff}</p>
                </section>
              </div>
            );
          })()
        ) : null}
      </Sheet>

      {/* ================= confirm ================= */}
      <Sheet open={sheet?.kind === 'confirm' && sheetOffer !== null} onClose={() => setSheet(sheet ? { kind: 'offer', id: sheet.id } : null)} title={sheet?.kind === 'confirm' && sheet.to === 'retired' ? 'Retire' : 'Publish'} data-sheet="confirm">
        {sheet?.kind === 'confirm' && sheetOffer ? (
          <>
            <p className={styles.confirmCaption} data-confirm-caption>
              {sheet.to === 'published' ? 'Freezes this version · price stays unset' : 'Leaves live use · kept for history'}
            </p>
            <span className="sr-only">
              {sheet.to === 'published'
                ? `"${sheetOffer.name}" becomes read-only. Scripts may reference it; a price of "Not set" still blocks quoting.`
                : `"${sheetOffer.name}" is retired and can no longer be referenced by a live script.`}
            </span>
            <TileGrid columns={2}>
              <Tile icon={sheet.to === 'published' ? 'lock' : 'ban'} label={sheet.to === 'published' ? 'Publish' : 'Retire'} tone={sheet.to === 'published' ? 'green' : 'orange'} onClick={() => apply(sheetOffer, sheet.to)} data-confirm-transition />
              <Tile icon="x" label="Cancel" onClick={() => setSheet({ kind: 'offer', id: sheetOffer.id })} data-cancel-transition />
            </TileGrid>
          </>
        ) : null}
      </Sheet>

      <Toast message={toast} />
    </div>
  );
}
