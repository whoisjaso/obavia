import type { Locale } from "@/lib/domain/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { NewWorkspaceForm } from "@/components/NewWorkspaceForm";

export default async function NewWorkspacePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  return (
    <>
      <p className="eyebrow">{t.nav.workspaces}</p>
      <h1>{t.newWorkspace.title}</h1>
      <p className="lede">{t.newWorkspace.intro}</p>
      <section className="chapter">
        <NewWorkspaceForm locale={locale} t={t} />
      </section>
    </>
  );
}
