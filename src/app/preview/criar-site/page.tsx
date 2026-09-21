import { AppShell } from "@/components/app/app-shell";
import { CriarSiteComingSoon } from "@/components/sites/criar-site-coming-soon";

export const dynamic = "force-dynamic";

/** Preview sem auth — use SITES_UI_PREVIEW=1 para e2e da página Em breve. */
export default function CriarSitePreviewPage() {
  if (process.env.SITES_UI_PREVIEW !== "1") {
    return (
      <main className="grid min-h-screen place-items-center p-8 text-sm text-[var(--text-3)]">
        Preview desativado. Defina SITES_UI_PREVIEW=1.
      </main>
    );
  }

  return (
    <AppShell email="preview@briaspas.scale" notificationCount={0}>
      <CriarSiteComingSoon sitesHref="/preview/sites" />
    </AppShell>
  );
}
