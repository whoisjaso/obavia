'use client';

import { useMemo, useState } from 'react';
import { z } from 'zod';
import { DialHistory } from '@apohenia/domain/schemas';
import { DISPOSITION_GLYPHS, FOLLOW_UP_WEEK_NOTE, FOLLOW_UP_WEEK_VIEW, PIPELINE_LANES, SYNTHETIC_PIPELINE_CARDS, groupByLane, pipelineCardsFromHistory, type HistoryPipelineCard, type PipelineCard, type PipelineLane } from '@apohenia/domain/vocabulary';
import { Avatar, Card, Chip, FictionalPill, GlyphPill, Icon, IconButton, NotAssessedLabel, Sheet, Stat, TopBar, type IconName } from '@/components/ui';
import { useStoredState } from '@/lib/storage';
import { laneIcon, laneTone, shortDay, whenChip } from './pipeline-lib';
import styles from './pipeline.module.css';

const EMPTY_HISTORY: DialHistory = [];
const Prefs = z.object({ examples: z.boolean().default(true), lane: z.string().default('agreed_follow_up') });
type Prefs = z.infer<typeof Prefs>;
const DEFAULT_PREFS: Prefs = { examples: true, lane: 'agreed_follow_up' };

type LaneCard = { source: 'history'; card: HistoryPipelineCard } | { source: 'example'; card: PipelineCard };
type SheetKind = { kind: 'weeks' } | { kind: 'lane'; key: string } | { kind: 'card'; id: string };

/**
 * Follow-ups: eight lanes as a segmented control of chips (icon, at most two words, count) over ONE
 * list, never a board. The selected chip IS the lane's heading: the list below carries no repeated
 * title, and the count appears once (on the chip). Cards come from the dispositions in
 * `dial.history`; synthetic example cards can be shown beside them. No lane ever authorizes a
 * message; the 1/2/4/6/8-week note lives behind the info button.
 */

/** Disposition marks as kit icons (the domain keeps a status character per kind). */
const DISPOSITION_ICON: Record<string, IconName> = { '○': 'circle', '◍': 'voicemail', '◈': 'person', '↻': 'refresh', '◎': 'target', '▣': 'calendar', '★': 'star', '✕': 'x', '⊘': 'ban' };
export function PipelineClient() {
  const [history, , hydrated] = useStoredState('dial.history', DialHistory, EMPTY_HISTORY);
  const [prefs, setPrefs] = useStoredState('pipeline.prefs', Prefs, DEFAULT_PREFS);
  const [sheet, setSheet] = useState<SheetKind | null>(null);

  const historyCards = useMemo(() => pipelineCardsFromHistory(history), [history]);
  const laneCards = useMemo<LaneCard[]>(() => {
    const own: LaneCard[] = historyCards.map((card) => ({ source: 'history', card }));
    const examples: LaneCard[] = prefs.examples ? SYNTHETIC_PIPELINE_CARDS.map((card) => ({ source: 'example', card })) : [];
    return [...own, ...examples];
  }, [historyCards, prefs.examples]);
  const lanes = useMemo(() => groupByLane(laneCards.map((c) => ({ lane: c.card.lane, item: c }))), [laneCards]);
  const agreed = historyCards.filter((c) => c.lane === 'agreed_follow_up').length;
  const callbacks = historyCards.filter((c) => c.when).length;

  const selectedLane = sheet?.kind === 'lane' ? (PIPELINE_LANES.find((l) => l.key === sheet.key) ?? null) : null;
  const activeKey = lanes.some((l) => l.lane.key === prefs.lane) ? prefs.lane : (lanes[0]?.lane.key ?? 'agreed_follow_up');
  const active = lanes.find((l) => l.lane.key === activeKey) ?? null;
  const selectedCard = sheet?.kind === 'card' ? (laneCards.find((c) => c.card.id === sheet.id) ?? null) : null;

  const renderCard = (c: LaneCard) => {
    if (c.source === 'history') {
      const h = c.card;
      const g = DISPOSITION_GLYPHS[h.kind];
      const when = h.when ? whenChip(h.when) : null;
      return (
        <Card key={h.id} onPress={() => setSheet({ kind: 'card', id: h.id })} name={`${h.contact}, ${h.company}. ${g.name}.${when ? ` ${when.name}.` : ''} Open.`} dense data-lane-card data-source="history" data-kind={h.kind}>
          <div className={styles.cardRow}>
            <Avatar name={h.contact} size={40} />
            <div className={styles.cardText}>
              <span className={styles.company}>{h.company}</span>
              <span className={styles.contact}>{h.contact}</span>
            </div>
          </div>
          <div className={styles.cardChips}>
            <Chip static icon={DISPOSITION_ICON[g.glyph] ?? 'circle'} label={g.word} name={g.name} tone={h.kind === 'do_not_call' ? 'red' : h.lane === 'agreed_follow_up' ? 'green' : 'neutral'} />
            {when ? (
              <span data-when-chip>
                <Chip static icon="calendar" label={when.text} name={when.name} tone={when.past ? 'neutral' : 'blue'} />
              </span>
            ) : null}
            <span className={styles.day}>{shortDay(h.at)}</span>
          </div>
        </Card>
      );
    }
    const e = c.card;
    return (
      <Card key={e.id} onPress={() => setSheet({ kind: 'card', id: e.id })} name={`Synthetic example: ${e.contact}, ${e.company}. ${e.summary} Open.`} dense data-lane-card data-source="example" className={styles.example}>
        <div className={styles.cardRow}>
          <Avatar name={e.contact} size={40} />
          <div className={styles.cardText}>
            <span className={styles.company}>{e.company}</span>
            <span className={styles.contact}>{e.contact}</span>
          </div>
        </div>
        <div className={styles.cardChips}>
          <FictionalPill />
          {e.agreed_when ? <Chip static icon="calendar" label={e.agreed_when} name={`Agreed: ${e.agreed_when}, a synthetic example`} tone="blue" /> : null}
        </div>
      </Card>
    );
  };

  return (
    <div className={styles.root} data-pipeline data-hydrated={hydrated ? 'true' : 'false'}>
      <TopBar
        title="Follow-ups"
        right={
          <>
            <IconButton icon="info" label="Week view: a view, not permission to message" onClick={() => setSheet({ kind: 'weeks' })} data-weeks-info />
            <IconButton icon="history" label="History" href="/calls" />
          </>
        }
      />

      {/* session numbers only once a session has produced a card; until then one quiet caption, never zeros beside example cards */}
      {historyCards.length > 0 ? (
        <div className={styles.stats} data-pipeline-stats>
          <Stat value={historyCards.length} icon="flag" name="Cards from sessions" />
          <Stat value={agreed} icon="check" name="Agreed follow-ups" color="var(--green)" />
          <Stat value={callbacks} icon="calendar" name="Callbacks with a time" color="var(--blue)" />
        </div>
      ) : (
        <div className={styles.stats} data-pipeline-stats data-pipeline-empty>
          <NotAssessedLabel label="No sessions yet" name={hydrated ? 'No demo session has produced a follow-up yet; the cards below are fictional examples' : 'Reading sessions'} />
        </div>
      )}

      {/* segmented control: one chip per lane (icon, label, count); scrolls sideways on a phone */}
      <div className={styles.lanes} data-lanes role="group" aria-label="Lanes">
        {lanes.map(({ lane, cards }) => (
          <Chip
            key={lane.key}
            label={lane.label}
            icon={laneIcon(lane.key)}
            kbd={String(cards.length)}
            toggle
            selected={lane.key === activeKey}
            tone={lane.key === activeKey ? 'blue' : laneTone(lane.key)}
            name={`${lane.label}: ${cards.length}. ${lane.definition}`}
            onClick={() => setPrefs((p) => ({ ...p, lane: lane.key }))}
            className={styles.laneChip}
            data-lane={lane.key}
            data-lane-chip={lane.key}
            data-count={cards.length}
          />
        ))}
      </div>

      {/* the one list: the active lane's cards */}
      {active ? (
        <section className={styles.laneList} aria-label={`${active.lane.label}: ${active.cards.length}`} data-lane-list={active.lane.key} data-count={active.cards.length}>
          {/* tools only: the selected chip above is the heading, and it already carries the count */}
          <div className={styles.laneHead}>
            <GlyphPill
              icon="spark"
              weight="fill"
              label={prefs.examples ? 'Examples on' : 'Examples off'}
              tone="purple"
              name={prefs.examples ? 'Synthetic example cards are shown: fictional, not real records. Tap to hide.' : 'Synthetic example cards hidden. Tap to show fictional examples.'}
              role="button"
              tabIndex={0}
              aria-pressed={prefs.examples}
              onClick={() => setPrefs((p) => ({ ...p, examples: !p.examples }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setPrefs((p) => ({ ...p, examples: !p.examples }));
                }
              }}
              className={styles.examplesPill}
              data-examples-toggle
            />
            <IconButton icon="info" label={`${active.lane.label}: what this lane means`} onClick={() => setSheet({ kind: 'lane', key: active.lane.key })} data-lane-info />
          </div>
          <div className={styles.laneBody}>
            {active.cards.length === 0 ? (
              <span className={styles.laneEmpty} aria-hidden="true">
                <Icon name="empty" size={40} weight="bold" />
                <span>None yet</span>
              </span>
            ) : (
              active.cards.map((c) => renderCard(c.item))
            )}
          </div>
        </section>
      ) : null}

      {/* ---- ⓘ weeks ---- */}
      <Sheet open={sheet?.kind === 'weeks'} onClose={() => setSheet(null)} title="Weeks" data-sheet="weeks">
        <div className={styles.weeks}>
          <div className={styles.weekChips} role="group" aria-label="Week lanes from the source">
            {FOLLOW_UP_WEEK_VIEW.map((w) => (
              <span key={w} className={styles.week} role="img" aria-label={`Week ${w}: a view, not permission to message`}>
                <span className={styles.weekNumber}>{w}</span>
                <span className={styles.weekUnit}>wk</span>
              </span>
            ))}
          </div>
          <p className={styles.weekNote} data-week-note>
            {FOLLOW_UP_WEEK_NOTE}
          </p>
          <p className={styles.weekLine}>a view, not permission to message</p>
        </div>
      </Sheet>

      {/* ---- lane definition ---- */}
      <Sheet open={selectedLane !== null} onClose={() => setSheet(null)} title="Lane" data-sheet="lane">
        {selectedLane ? <LaneSheet lane={selectedLane} /> : null}
      </Sheet>

      {/* ---- card detail ---- */}
      <Sheet open={selectedCard !== null} onClose={() => setSheet(null)} title="Card" data-sheet="card">
        {selectedCard ? <CardSheet item={selectedCard} /> : null}
      </Sheet>
    </div>
  );
}

function LaneSheet({ lane }: { lane: PipelineLane }) {
  return (
    <div className={styles.sheetBody}>
      <span className={styles.sheetGlyph} aria-hidden="true">
        <Icon name={laneIcon(lane.key)} size={56} weight="regular" />
      </span>
      <Chip static icon={laneIcon(lane.key)} label={lane.label} tone={laneTone(lane.key)} />
      <p className={styles.sheetLine}>{lane.definition}</p>
      {lane.key === 'budget' || lane.key === 'authority' || lane.key === 'implementation' ? <Chip static icon="hourglass" label="Increment 2" name="No outcome tile records this reason yet; nothing is inferred into this lane" tone="teal" /> : null}
    </div>
  );
}

function CardSheet({ item }: { item: LaneCard }) {
  if (item.source === 'example') {
    const e = item.card;
    return (
      <div className={styles.sheetBody}>
        <Avatar name={e.contact} size={72} />
        <div className={styles.sheetName}>{e.contact}</div>
        <div className={styles.sheetRole}>{e.company}</div>
        <p className={styles.sheetLine}>{e.summary}</p>
        <div className={styles.cardChips}>
          <FictionalPill />
          {e.agreed_when ? <Chip static icon="calendar" label={e.agreed_when} name={`Agreed: ${e.agreed_when}, local to the prospect. Synthetic example`} tone="blue" /> : null}
        </div>
        {e.call_id ? (
          <Card href={`/calls/${encodeURIComponent(e.call_id)}`} name={`Open the synthetic call review for ${e.contact}`} dense>
            <span className={styles.linkRow}>
              <Icon name="target" size={18} weight="bold" /> <span>Call review</span>
            </span>
          </Card>
        ) : null}
      </div>
    );
  }
  const h = item.card;
  const g = DISPOSITION_GLYPHS[h.kind];
  const when = h.when ? whenChip(h.when) : null;
  return (
    <div className={styles.sheetBody}>
      <Avatar name={h.contact} size={72} />
      <div className={styles.sheetName}>{h.contact}</div>
      <div className={styles.sheetRole}>{h.company}</div>
      <div className={styles.cardChips}>
        <Chip static icon="circle-half" label="demo" name="Recorded in a demo session: synthetic prospect, no real call was placed" tone="neutral" />
        <Chip static icon={DISPOSITION_ICON[g.glyph] ?? 'circle'} label={g.word} name={g.name} tone={h.kind === 'do_not_call' ? 'red' : h.lane === 'agreed_follow_up' ? 'green' : 'neutral'} />
        {when ? <Chip static icon="calendar" label={when.text} name={when.name} tone="blue" /> : null}
        <Chip static icon="history" label={shortDay(h.at)} name={`Recorded ${new Date(h.at).toLocaleString('en-US')}`} />
      </div>
      {h.transcript_id ? (
        <Card href={`/calls/${encodeURIComponent(h.transcript_id)}`} name={`Open the synthetic call review played on this attempt`} dense>
          <span className={styles.linkRow}>
            <Icon name="target" size={18} weight="bold" /> <span>Call review</span>
          </span>
        </Card>
      ) : null}
      {h.lane === 'agreed_follow_up' ? <p className={styles.sheetCue}>The only lane with an agreed touch. Still a view, not a send.</p> : <p className={styles.sheetCue}>A view, not permission to message.</p>}
    </div>
  );
}
