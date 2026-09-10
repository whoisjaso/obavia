'use client';

import { useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { ListenerAction, Reference } from '@apohenia/domain/schemas';
import { meaningStatusText, originLabel, shortMeaning } from '@apohenia/domain/vocabulary';
import { Badge, Button, KeyboardHint } from '@/components/ui';
import styles from './callroom.module.css';

/** Visible cards by default (addendum §5: 3–7); pinned cards are always visible. */
export const VISIBLE_DEFAULT = 7;

export type CardAction = Omit<ListenerAction, 'event_version'>;

export interface ReferencesPanelProps {
  references: Reference[];
  sizePx: number;
  expandedId: string | null;
  onExpand: (id: string | null) => void;
  onAction: (action: CardAction) => void;
  /** USE NOW: ask the policy to show this reference's line in the optional overlay. */
  onUseNow: (id: string) => void;
  /** CLARIFY MEANING: show the clarification question in the optional overlay. */
  onClarify: (id: string) => void;
  played: number;
  message: string;
}

function stateText(r: Reference): string {
  switch (r.lifecycle.state) {
    case 'pinned':
      return 'pinned';
    case 'held':
      return r.lifecycle.kept_for_later ? 'kept for later' : 'held';
    case 'dismissed':
      return 'dismissed';
    case 'rejected':
      return 'rejected by the prospect — not reused';
    case 'invalidated':
      return 'INVALIDATED by transcript revision';
    default:
      return r.lifecycle.state;
  }
}

function whenUseful(r: Reference): string {
  const stages = r.reuse.candidate_purposes.filter((p) => !p.includes('_') || ['logical_certainty', 'setter_transition', 'emotional_certainty', 'follow_up'].includes(p));
  const concepts = r.reuse.candidate_purposes.filter((p) => !stages.includes(p));
  const s = stages.length > 0 ? `stages: ${stages.map((x) => x.replace(/_/g, ' ')).join(', ')}` : 'no stage identified yet';
  const c = concepts.length > 0 ? ` · when ${concepts.map((x) => x.replace(/_/g, ' ')).join(' / ')} comes up` : '';
  return `${s}${c}`;
}

interface CardProps {
  r: Reference;
  expanded: boolean;
  onExpand: (id: string | null) => void;
  onAction: (action: CardAction) => void;
  onUseNow: (id: string) => void;
  onClarify: (id: string) => void;
}

function ReferenceCard({ r, expanded, onExpand, onAction, onUseNow, onClarify }: CardProps) {
  const [field, setField] = useState<'relationship' | 'explained_meaning' | 'business_target'>('relationship');
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const usable = r.lifecycle.state === 'held' || r.lifecycle.state === 'pinned';
  const invalid = r.lifecycle.state === 'invalidated';
  const pinned = r.lifecycle.state === 'pinned';
  const lastCorrection = r.lifecycle.correction_history[r.lifecycle.correction_history.length - 1];

  function saveCorrection() {
    if (to.trim().length === 0) return;
    onAction({ type: 'correct', reference_id: r.id, field, to: to.trim(), note: note.trim() || 'no evidence note given' });
    setTo('');
    setNote('');
    setCorrecting(false);
  }

  return (
    <li className={[styles.refCard, invalid ? styles.refInvalid : '', r.lifecycle.state === 'dismissed' || r.lifecycle.state === 'rejected' ? styles.refMuted : ''].join(' ')} data-ref-card data-ref-id={r.id} data-ref-state={r.lifecycle.state}>
      <button
        type="button"
        className={styles.refHead}
        data-ref-toggle
        data-ref-id={r.id}
        aria-expanded={expanded}
        aria-label={`${r.label}. ${stateText(r)}. ${shortMeaning(r)}. Press Enter to ${expanded ? 'collapse' : 'expand'}; K keep for later, U use now, C clarify meaning, P pin or unpin, Delete dismiss.`}
        onClick={() => onExpand(expanded ? null : r.id)}
      >
        <span className={styles.refLabel} data-ref-label>
          {r.label}
        </span>
        <span className={styles.refMeaning} data-ref-meaning>
          {shortMeaning(r)}
        </span>
        <span className={styles.refState} data-ref-state-text>
          {stateText(r)}
          {r.reuse.do_not_reuse && !invalid && r.lifecycle.state !== 'rejected' ? ' · do not reuse' : ''}
          {r.evidence.status === 'corrected' && !invalid ? ' · corrected' : ''}
        </span>
      </button>

      {expanded ? (
        <div className={styles.refBody} data-ref-body>
          <dl className={styles.refDetails}>
            <dt>Their exact phrase</dt>
            <dd>
              <q data-ref-exact>{r.evidence.exact_expression}</q>
              <div className={styles.refMeta}>
                Prospect · {r.evidence.utterance_id} · revision {r.evidence.revision} · {r.evidence.status}
                {r.evidence.timestamp ? ` · ${r.evidence.timestamp}` : ''}
              </div>
              <div className={styles.refQuote}>&ldquo;{r.evidence.supporting_quote}&rdquo;</div>
            </dd>
            <dt>What it represents here</dt>
            <dd data-ref-relationship>
              {r.semantics.relationship}
              {lastCorrection && lastCorrection.by === 'rep' ? (
                <div className={styles.refMeta} data-ref-correction>
                  Corrected by rep ({lastCorrection.field}): was &ldquo;{lastCorrection.from}&rdquo;{lastCorrection.note ? ` · evidence: ${lastCorrection.note}` : ''}
                </div>
              ) : null}
              <div className={styles.refMeta}>
                Valence: {r.semantics.valence.polarity} — attaches to {r.semantics.valence.object}
              </div>
            </dd>
            <dt>Meaning</dt>
            <dd>
              <Badge variant={r.semantics.meaning_status === 'confirmed' ? 'success' : r.semantics.meaning_status === 'unknown' ? 'warning' : 'info'}>{r.semantics.meaning_status}</Badge>{' '}
              <span data-ref-meaning-status>{meaningStatusText(r)}</span>
              {r.semantics.explained_meaning ? (
                <div className={styles.refMeta}>
                  Explained: &ldquo;{r.semantics.explained_meaning.text}&rdquo; ({r.semantics.explained_meaning.evidence_turn_id})
                </div>
              ) : null}
              <div className={styles.refMeta}>Origin: {originLabel(r.semantics.origin)}</div>
              <div className={styles.refMeta}>Not inferred: {r.semantics.prohibited_inferences.join('; ')}</div>
            </dd>
            <dt>When useful later</dt>
            <dd>{whenUseful(r)}</dd>
            {r.reuse.proposed_clarification || r.reuse.bridge_text ? (
              <>
                <dt>Suggested next</dt>
                <dd>
                  {r.reuse.proposed_clarification ? <div>Question: {r.reuse.proposed_clarification}</div> : null}
                  {r.reuse.bridge_text ? <div>Bridge: {r.reuse.bridge_text}</div> : null}
                </dd>
              </>
            ) : null}
            {invalid || r.lifecycle.reason ? (
              <>
                <dt>Status</dt>
                <dd data-ref-reason>{r.lifecycle.reason}</dd>
              </>
            ) : null}
            {r.reuse.used_at.length > 0 || r.reuse.reactions.length > 0 ? (
              <>
                <dt>Reuse history</dt>
                <dd>
                  {r.reuse.used_at.map((u) => `used at ${u.turn_id}`).join(', ')}
                  {r.reuse.reactions.length > 0 ? ` · reactions: ${r.reuse.reactions.map((x) => `${x.reaction} (${x.turn_id})`).join(', ')}` : ''}
                </dd>
              </>
            ) : null}
          </dl>
          {correcting ? (
            <div className={styles.correctForm} data-ref-correct-form>
              <label>
                Field
                <select value={field} onChange={(e) => setField(e.target.value as typeof field)}>
                  <option value="relationship">What it represents (relationship)</option>
                  <option value="explained_meaning">Explained meaning</option>
                  <option value="business_target">Business target</option>
                </select>
              </label>
              <label>
                Corrected text
                <textarea value={to} onChange={(e) => setTo(e.target.value)} rows={2} />
              </label>
              <label>
                Evidence note (which turn or what they said)
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              <div className={styles.refActions}>
                <Button variant="primary" onClick={saveCorrection} disabled={to.trim().length === 0}>
                  Save correction
                </Button>
                <Button variant="quiet" onClick={() => setCorrecting(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.refActions} data-ref-actions>
        <Button data-ref-action="keep" disabled={!usable} aria-pressed={r.lifecycle.kept_for_later} onClick={() => onAction({ type: 'keep', reference_id: r.id })}>
          Keep for later
        </Button>
        <Button data-ref-action="use" disabled={!usable || r.reuse.do_not_reuse} onClick={() => onUseNow(r.id)}>
          Use now
        </Button>
        <Button data-ref-action="clarify" disabled={!usable} onClick={() => onClarify(r.id)}>
          Clarify meaning
        </Button>
        <Button variant="quiet" data-ref-action="pin" disabled={invalid || r.lifecycle.state === 'rejected'} aria-pressed={pinned} onClick={() => onAction({ type: pinned ? 'unpin' : 'pin', reference_id: r.id })}>
          {pinned ? 'Unpin' : 'Pin'}
        </Button>
        <Button variant="quiet" data-ref-action="dismiss" disabled={invalid || r.lifecycle.state === 'dismissed'} onClick={() => onAction({ type: 'dismiss', reference_id: r.id })}>
          Dismiss
        </Button>
        <Button variant="quiet" data-ref-action="correct" disabled={invalid} aria-pressed={correcting} onClick={() => { setCorrecting((c) => !c); if (!expanded) onExpand(r.id); }}>
          Correct
        </Button>
        <Button variant="quiet" data-ref-action="do-not-reuse" disabled={r.reuse.do_not_reuse} onClick={() => onAction({ type: 'do_not_reuse', reference_id: r.id })}>
          Do not reuse
        </Button>
      </div>
    </li>
  );
}

export function ReferencesPanel({ references, sizePx, expandedId, onExpand, onAction, onUseNow, onClarify, played, message }: ReferencesPanelProps) {
  const style = { '--font-size-their-words': `${sizePx}px` } as CSSProperties;
  // Stable order = first appearance. Pinned cards are always visible; the rest fill up to VISIBLE_DEFAULT; overflow is expandable.
  const pinnedIds = new Set(references.filter((r) => r.lifecycle.state === 'pinned').map((r) => r.id));
  const visible: Reference[] = [];
  const overflow: Reference[] = [];
  for (const r of references) {
    if (pinnedIds.has(r.id) || visible.length < VISIBLE_DEFAULT) visible.push(r);
    else overflow.push(r);
  }

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const target = e.target as HTMLElement;
    if (['TEXTAREA', 'INPUT', 'SELECT'].includes(target.tagName)) return;
    const card = target.closest('[data-ref-card]') as HTMLElement | null;
    const id = card?.dataset['refId'];
    if (!id) return;
    const r = references.find((x) => x.id === id);
    if (!r) return;
    const usable = r.lifecycle.state === 'held' || r.lifecycle.state === 'pinned';
    const key = e.key.toLowerCase();
    if (key === 'k' && usable) onAction({ type: 'keep', reference_id: id });
    else if (key === 'u' && usable && !r.reuse.do_not_reuse) onUseNow(id);
    else if (key === 'c' && usable) onClarify(id);
    else if (key === 'p' && r.lifecycle.state !== 'invalidated' && r.lifecycle.state !== 'rejected') onAction({ type: r.lifecycle.state === 'pinned' ? 'unpin' : 'pin', reference_id: id });
    else if ((e.key === 'Delete' || e.key === 'Backspace') && r.lifecycle.state !== 'invalidated' && r.lifecycle.state !== 'dismissed') onAction({ type: 'dismiss', reference_id: id });
    else return;
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <section className={styles.refs} style={style} aria-labelledby="their-references-heading" data-their-references onKeyDown={onKeyDown}>
      <div className={styles.stripHead}>
        <h2 id="their-references-heading" className={styles.stripTitle}>
          Their references
        </h2>
        <span className={styles.refsCount}>
          {references.length === 0 ? 'none yet' : `${visible.length} shown${overflow.length > 0 ? ` · ${overflow.length} more` : ''}`} · size shared with THEIR WORDS
        </span>
      </div>
      {references.length === 0 ? (
        <p className={styles.empty}>{played === 0 ? 'Nothing played yet. A distinctive comparison, image or emotional word the prospect chooses appears here on first mention.' : 'No distinctive reference yet — keep playing turns.'}</p>
      ) : (
        <ol className={styles.refList} aria-label="Their references">
          {visible.map((r) => (
            <ReferenceCard key={r.id} r={r} expanded={expandedId === r.id} onExpand={onExpand} onAction={onAction} onUseNow={onUseNow} onClarify={onClarify} />
          ))}
        </ol>
      )}
      {overflow.length > 0 ? (
        <details className={styles.overflow} data-ref-overflow>
          <summary>More references ({overflow.length})</summary>
          <ol className={styles.refList} aria-label="More references">
            {overflow.map((r) => (
              <ReferenceCard key={r.id} r={r} expanded={expandedId === r.id} onExpand={onExpand} onAction={onAction} onUseNow={onUseNow} onClarify={onClarify} />
            ))}
          </ol>
        </details>
      ) : null}
      <div className={styles.hint}>
        <KeyboardHint keys={['Enter']} action="expand / collapse the focused card" />
        <KeyboardHint keys={['K']} action="keep for later" />
        <KeyboardHint keys={['U']} action="use now (optional overlay under the script)" />
        <KeyboardHint keys={['C']} action="clarify meaning" />
        <KeyboardHint keys={['P']} action="pin / unpin" />
        <KeyboardHint keys={['Delete']} action="dismiss" />
      </div>
      <p className={styles.status} role="status" aria-live="polite" data-refs-status>
        {message}
      </p>
    </section>
  );
}
