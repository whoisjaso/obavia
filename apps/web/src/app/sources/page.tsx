import type { Metadata } from 'next';
import { classificationCounts, getSourceIndex, loadPackageValidation, validateAllSeeds } from '@apohenia/domain';
import { Badge, Card, EmptyState, Inline, PageHeader, Stack } from '@/components/ui';

export const metadata: Metadata = { title: 'Sources' };

/**
 * Owner: M-sources. Replace this file wholesale.
 * The skeleton renders live seed counts here so the build proves the JSON seeds load through Next.
 */
export default function SourcesPage() {
  const index = getSourceIndex();
  const counts = classificationCounts();
  const validation = loadPackageValidation();
  const seeds = validateAllSeeds();
  const named = index.sections.filter((s) => !s.records_supplied).length;

  return (
    <>
      <PageHeader
        title="Sources"
        purpose="Private source library: Source A and Source B preserved separately, section index, 207 curated study records with exact excerpts and character offsets, and classification flags — study material, never automatic live approval."
        aside={<Badge variant="warning">Private · study only</Badge>}
      />
      <Stack gap={5}>
        <Card title="Seeded package (loaded at build time)">
          <Inline gap={2}>
            <Badge variant="info">{index.records.length} records</Badge>
            <Badge variant="info">
              {index.sections.length} sections ({index.sections.length - named} with records, {named} named-only)
            </Badge>
            <Badge variant="neutral">adapt {counts.adapt}</Badge>
            <Badge variant="neutral">study_only {counts.study_only}</Badge>
            <Badge variant="neutral">private_training {counts.private_training}</Badge>
            <Badge variant={validation.raw_sources_supplied ? 'success' : 'warning'}>
              {validation.raw_sources_supplied ? 'raw sources hashed' : 'raw sources not supplied — hashes pending'}
            </Badge>
          </Inline>
          <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-muted)', fontSize: 'var(--font-size-sm)' }}>
            {validation.section_count_note}
          </p>
        </Card>
        <Card title="Seed files">
          <ul style={{ margin: 0, paddingLeft: 'var(--space-5)' }}>
            {seeds.map((s) => (
              <li key={s.name}>
                <code>{s.name}</code> — {s.count} item{s.count === 1 ? '' : 's'}{' '}
                {s.placeholder ? <Badge variant="warning">placeholder — to be authored</Badge> : <Badge variant="success">real data</Badge>}
              </li>
            ))}
          </ul>
        </Card>
        <EmptyState title="The Source Library browser is not built yet" increment="Increment 1" owner="M-sources">
          <p>
            Will be built here: A/B preserved, section index, question search, exact excerpt with offset, normalized
            wording next to the own-script counterpart, source-only flag, named-but-missing resources, and the selected
            voice-style overlay. The 1,449-occurrence audit stays an audit, not a script.
          </p>
        </EmptyState>
      </Stack>
    </>
  );
}
