import type { Locale } from "@/lib/domain/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { NewWorkspaceForm } from "@/components/NewWorkspaceForm";

export default async function NewWorkspacePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  return (
    <>
      <h1>{t.newWorkspace.title}</h1>
      <p className="muted">{t.newWorkspace.intro}</p>
      <NewWorkspaceForm locale={locale} t={t} />
    </>
  );
}
