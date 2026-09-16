import { AppShell } from "@/components/app/app-shell";

export const dynamic = "force-dynamic";

/** Preview sem auth — use SHELL_UI_PREVIEW=1 para screenshots da sidebar. */
export default function ShellPreviewPage() {
  if (process.env.SHELL_UI_PREVIEW !== "1") {
    return (
      <main className="grid min-h-screen place-items-center p-8 text-sm text-[var(--text-3)]">
        Preview desativado. Defina SHELL_UI_PREVIEW=1.
      </main>
    );
  }

  return (
    <AppShell email="preview@briaspas.scale" notificationCount={2}>
      <div className="p-6 md:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--text-3)]">Preview do shell com sidebar glass clara.</p>
        <div className="app-card mt-6 max-w-xl p-6">
          <p className="text-sm text-[var(--text-2)]">
            Conteúdo de demonstração para validar contraste e margem da sidebar clara.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
