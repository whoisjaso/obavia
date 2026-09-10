'use client';

import { useState } from 'react';
import { z } from 'zod';
import { ApprovalStatus, type OfferVersion } from '@apohenia/domain/schemas';
import {
  BLANK_PRICE_NOTE,
  canQuotePrice,
  canTransitionOffer,
  formatPrice,
  isOfferImmutable,
  liveOffers,
  nextOfferStatus,
  practiceOffers,
} from '@apohenia/domain/offers';
import { Badge, Button, Card, Dialog, Inline, Stack, Tabs } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import styles from './offers.module.css';

interface Props {
  offers: OfferVersion[];
  placeholder: boolean;
}

const StatusMap = z.record(z.string(), ApprovalStatus);
const EMPTY_STATUS: Record<string, ApprovalStatus> = {};

const STATUS_BADGE: Record<ApprovalStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
  draft: 'warning',
  reviewed: 'info',
  published: 'success',
  retired: 'neutral',
};

function ListSection({ title, items, wide, emptyText }: { title: string; items: string[]; wide?: boolean; emptyText?: string }) {
  return (
    <section className={[styles.section, wide ? styles.sectionWide : ''].join(' ')} aria-label={title}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      {items.length === 0 ? <p className={styles.emptyList}>{emptyText ?? 'none'}</p> : (
        <ul className={styles.list}>
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TextSection({ title, text, wide }: { title: string; text: string; wide?: boolean }) {
  return (
    <section className={[styles.section, wide ? styles.sectionWide : ''].join(' ')} aria-label={title}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <p>{text}</p>
    </section>
  );
}

function OfferView({ offer, status, onTransition, practice }: { offer: OfferVersion; status: ApprovalStatus; onTransition?: (to: ApprovalStatus) => void; practice: boolean }) {
  const price = formatPrice(offer.price);
  const next = nextOfferStatus(status);
  const readOnly = isOfferImmutable({ status });
  return (
    <Card data-offer={offer.id} data-offer-kind={practice ? 'practice' : 'live'}>
      {offer.fictional ? (
        <p className={styles.banner} role="note" data-fictional-banner>
          {offer.fictional_banner}
        </p>
      ) : null}
      <div className={styles.offerHeader} style={{ marginTop: offer.fictional ? 'var(--space-4)' : 0 }}>
        <div>
          <h2>{offer.name}</h2>
          <p className={styles.note}>
            <code>{offer.id}</code> · offer <code>{offer.offer_id}</code> v{offer.version}
          </p>
        </div>
        <Inline gap={2}>
          <Badge variant={STATUS_BADGE[status]}>{status}</Badge>
          {offer.fictional ? <Badge variant="warning">fictional</Badge> : null}
          {offer.practice_only ? <Badge variant="warning">practice only · excluded from live</Badge> : null}
          {readOnly ? <Badge variant="neutral">read-only</Badge> : null}
        </Inline>
      </div>

      {!practice && onTransition ? (
        <Inline gap={2} style={{ marginBottom: 'var(--space-4)' }}>
          {next && canTransitionOffer(status, next) && next !== 'retired' ? (
            <Button variant={next === 'published' ? 'primary' : 'default'} onClick={() => onTransition(next)} data-transition={next}>
              {next === 'reviewed' ? 'Mark reviewed' : 'Publish'}
            </Button>
          ) : null}
          {status === 'published' ? (
            <Button onClick={() => onTransition('retired')} data-transition="retired">
              Retire
            </Button>
          ) : null}
          <span className={styles.readOnly}>
            {readOnly ? 'Published offers are immutable; a change means a new version.' : 'draft → reviewed → published → retired'}
          </span>
        </Inline>
      ) : null}

      <div className={styles.sections}>
        <TextSection title="Buyer type" text={offer.buyer_type} />
        <TextSection title="Problem" text={offer.problem} />
        <ListSection title="Prerequisites" items={offer.prerequisites} />
        <ListSection title="Deliverables" items={offer.deliverables} />
        <ListSection title="Exclusions" items={offer.exclusions} />
        <ListSection title="Implementation dependencies" items={offer.implementation_dependencies} />
        <ListSection title="Supported proof" items={offer.supported_proof} emptyText={offer.supported_proof_note ?? 'none'} />
        <ListSection title="Approved claims" items={offer.approved_claims} emptyText={offer.approved_claims_note ?? 'none'} />

        <section className={[styles.section, styles.sectionWide].join(' ')} aria-label="Three pillars">
          <h3 className={styles.sectionTitle}>Three pillars</h3>
          <div className={styles.pillars}>
            {offer.pillars.map((p, i) => (
              <div key={p.name} className={styles.pillar}>
                <div className={styles.pillarName}>
                  {i + 1}. {p.name}
                </div>
                <p className={styles.note}>
                  <strong>Connects to:</strong> {p.connects_to_problem}
                </p>
                <p className={styles.note}>
                  <strong>Delivery:</strong> {p.delivery}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-label="Price" data-price-section>
          <h3 className={styles.sectionTitle}>Price</h3>
          <div className={styles.priceRow}>
            <span>Setup</span>
            <span className={price.setup === 'Not set' ? styles.notSet : styles.priceValue} data-price-setup>
              {price.setup}
            </span>
            <span>Recurring</span>
            <span className={price.recurring === 'Not set' ? styles.notSet : styles.priceValue} data-price-recurring>
              {price.recurring}
            </span>
            <span>Currency</span>
            <span>{offer.price.currency}</span>
            <span>Schedule</span>
            <span>{offer.price.payment_schedule}</span>
          </div>
          {!price.complete ? (
            <p className={styles.note} style={{ marginTop: 'var(--space-2)' }} data-blank-price-note>
              {BLANK_PRICE_NOTE}
            </p>
          ) : null}
          {practice ? (
            <p className={styles.note} style={{ marginTop: 'var(--space-2)' }}>
              Fixture price for practice only — never quoted live (canQuotePrice: {String(canQuotePrice(offer))}).
            </p>
          ) : null}
        </section>

        <section className={styles.section} aria-label="Timing">
          <h3 className={styles.sectionTitle}>Timing (estimated vs committed are distinct)</h3>
          <div className={styles.timing}>
            <span>Estimated</span>
            <span>{offer.timing.estimated ?? 'not set'}</span>
            <span>Committed</span>
            <span>{offer.timing.committed ?? 'not set'}</span>
          </div>
        </section>

        <ListSection title="Acceptance criteria" items={offer.acceptance_criteria} />
        <ListSection title="Decision roles" items={offer.decision_roles} />
        <TextSection title="Support" text={offer.support} />
        <TextSection title="Cancellation, exit and handoff" text={offer.cancellation_exit_handoff} />
      </div>
    </Card>
  );
}

export function OffersClient({ offers, placeholder }: Props) {
  const [statuses, setStatuses, hydrated] = useStoredState('offers.status', StatusMap, EMPTY_STATUS);
  const [confirm, setConfirm] = useState<{ id: string; to: ApprovalStatus } | null>(null);

  const live = liveOffers(offers);
  const practice = practiceOffers(offers);
  const statusOf = (o: OfferVersion): ApprovalStatus => (hydrated ? (statuses[o.id] ?? o.status) : o.status);

  function requestTransition(o: OfferVersion, to: ApprovalStatus) {
    if (to === 'published' || to === 'retired') setConfirm({ id: o.id, to });
    else apply(o.id, statusOf(o), to);
  }

  function apply(id: string, from: ApprovalStatus, to: ApprovalStatus) {
    if (!canTransitionOffer(from, to)) return;
    setStatuses((prev) => ({ ...prev, [id]: to }));
    setConfirm(null);
  }

  const confirmOffer = confirm ? offers.find((o) => o.id === confirm.id) : undefined;

  return (
    <Stack gap={4}>
      {placeholder ? <p role="status">The offers seed is still a placeholder.</p> : null}
      <Tabs
        label="Offer Studio"
        tabs={[
          {
            id: 'live',
            label: `Live offers (${live.length})`,
            content: (
              <Stack gap={4}>
                <p className={styles.note}>
                  Live offers are the only versions a script may reference. Fictional and practice-only fixtures are excluded structurally. {BLANK_PRICE_NOTE}
                </p>
                {live.length === 0 ? <p>No live offers.</p> : live.map((o) => <OfferView key={o.id} offer={o} status={statusOf(o)} onTransition={(to) => requestTransition(o, to)} practice={false} />)}
              </Stack>
            ),
          },
          {
            id: 'practice',
            label: `Practice fixtures (${practice.length})`,
            content: (
              <Stack gap={4}>
                <p className={styles.note}>
                  Practice fixtures exist only for complete mock scenarios. They never populate the live list, never feed live pricing, and always carry their banner.
                </p>
                {practice.length === 0 ? <p>No practice fixtures.</p> : practice.map((o) => <OfferView key={o.id} offer={o} status={o.status} practice />)}
              </Stack>
            ),
          },
        ]}
      />

      <Dialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.to === 'published' ? 'Publish this offer version?' : 'Retire this offer version?'}
        description={
          confirm?.to === 'published'
            ? `"${confirmOffer?.name ?? ''}" becomes read-only. Scripts may reference it; a price of "Not set" still blocks quoting.`
            : `"${confirmOffer?.name ?? ''}" is retired and can no longer be referenced by a live script.`
        }
        actions={
          <>
            <Button onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => confirmOffer && confirm && apply(confirmOffer.id, statusOf(confirmOffer), confirm.to)} data-confirm-transition>
              {confirm?.to === 'published' ? 'Publish' : 'Retire'}
            </Button>
          </>
        }
      />
    </Stack>
  );
}
