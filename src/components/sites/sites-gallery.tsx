"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowSquareOut,
  DotsThreeVertical,
  Eye,
  Kanban,
  MagnifyingGlass,
  SortAscending,
} from "@phosphor-icons/react";
import { ListPagination } from "@/components/ui/list-pagination";
import type { PageMeta } from "@/lib/pagination/params";
import {
  companyInitials,
  formatSiteUpdatedLabel,
  mapSiteSourceLabel,
  mapSiteStatusLabel,
  pickSiteCoverPhoto,
  type SiteGalleryLead,
  type SiteGallerySortId,
} from "@/lib/sites/gallery";

const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

type SitesGalleryProps = {
  items: SiteGalleryLead[];
  pagination: PageMeta;
  query: string;
  sort: SiteGallerySortId;
  pathname: string;
  loadError: string | null;
  hasAnySites: boolean;
  demoMode?: boolean;
};

const SORT_OPTIONS: { id: SiteGallerySortId; label: string }[] = [
  { id: "recent", label: "Mais recentes" },
  { id: "name_asc", label: "Nome" },
  { id: "status", label: "Status" },
];

function statusTone(status: SiteGalleryLead["site_status"]) {
  if (status === "published") {
    return "bg-[var(--site-chip-published-bg)] text-[var(--site-chip-published-fg)]";
  }
  if (status === "generating") {
    return "bg-[var(--site-chip-generating-bg)] text-[var(--site-chip-generating-fg)]";
  }
  if (status === "failed") {
    return "bg-[var(--site-chip-failed-bg)] text-[var(--site-chip-failed-fg)]";
  }
  return "bg-[var(--site-chip-draft-bg)] text-[var(--site-chip-draft-fg)]";
}

function SiteCover({
  cover,
  initials,
}: {
  cover: string | null;
  initials: string;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const showInitials = !cover || photoFailed;

  if (showInitials) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--brand-solid)]/25 via-[var(--neu-bg-well)] to-[var(--brand-solid)]/10 text-3xl font-bold tracking-tight text-[var(--brand-hover)]"
        aria-hidden
      >
        {initials}
      </div>
    );
  }

  return (
    <Image
      src={cover}
      alt=""
      fill
      className="object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
      unoptimized
      referrerPolicy="no-referrer"
      onError={() => setPhotoFailed(true)}
    />
  );
}

function SiteCardMenu({
  lead,
  onNavigate,
}: {
  lead: SiteGalleryLead;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const published = lead.site_status === "published";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={`grid size-9 place-items-center rounded-full text-[var(--text-3)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] ${FOCUS}`}
        aria-label={`Ações do site ${lead.company_name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <DotsThreeVertical size={18} weight="bold" aria-hidden />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={`Ações do site ${lead.company_name}`}
          className="absolute right-0 top-full z-20 mt-1 min-w-[12rem] rounded-xl border border-[var(--border)] bg-[var(--card)] py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
          onClick={(event) => event.stopPropagation()}
        >
          <Link
            href={`/app/leads/${lead.id}/site`}
            role="menuitem"
            className={`flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)] ${FOCUS}`}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            <Eye size={16} aria-hidden /> Abrir prévia
          </Link>
          {published ? (
            <Link
              href={`/empresa/${lead.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className={`flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)] ${FOCUS}`}
              onClick={() => setOpen(false)}
            >
              <ArrowSquareOut size={16} aria-hidden /> Abrir site publicado
            </Link>
          ) : null}
          <Link
            href={`/app/crm/${lead.id}`}
            role="menuitem"
            className={`flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-2)] hover:bg-[var(--neu-bg-pop)] ${FOCUS}`}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            <Kanban size={16} aria-hidden /> Ver no CRM
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function SiteCard({ lead }: { lead: SiteGalleryLead }) {
  const cover = pickSiteCoverPhoto(lead.photos);
  const initials = companyInitials(lead.company_name);
  const updatedLabel = formatSiteUpdatedLabel(lead.updated_at);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
      <Link
        href={`/app/leads/${lead.id}/site`}
        className={`flex min-h-0 flex-1 flex-col ${FOCUS} rounded-2xl`}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--neu-bg-well)]">
          <SiteCover cover={cover} initials={initials} />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h2 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--text)]">
            {lead.company_name}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {lead.niche ? (
              <span className="rounded-full bg-[var(--neu-bg-pop)] px-2.5 py-0.5 font-medium text-[var(--text-3)]">
                {lead.niche}
              </span>
            ) : null}
            <span className="text-[var(--text-4)]">{mapSiteSourceLabel(lead.site_source)}</span>
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone(lead.site_status)}`}
            >
              {mapSiteStatusLabel(lead.site_status)}
            </span>
            <time
              className="text-xs text-[var(--text-3)]"
              dateTime={lead.updated_at ?? undefined}
            >
              {updatedLabel}
            </time>
          </div>
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <SiteCardMenu lead={lead} />
      </div>
    </article>
  );
}

function SitesSearchControls({
  query,
  sort,
  pathname,
}: {
  query: string;
  sort: SiteGallerySortId;
  pathname: string;
}) {
  const router = useRouter();
  const [draftQuery, setDraftQuery] = useState(query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function pushParams(nextQ: string, nextSort: SiteGallerySortId) {
    const params = new URLSearchParams();
    const trimmed = nextQ.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextSort !== "recent") params.set("sort", nextSort);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onSearchChange(value: string) {
    setDraftQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams(value, sort);
    }, 350);
  }

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="relative block w-full max-w-md">
        <span className="sr-only">Buscar site por nome da empresa</span>
        <MagnifyingGlass
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-4)]"
          aria-hidden
        />
        <input
          type="search"
          value={draftQuery}
          onInput={(event) => onSearchChange(event.currentTarget.value)}
          placeholder="Buscar por nome"
          maxLength={80}
          className={`w-full rounded-2xl border border-[var(--border)] bg-[var(--neu-bg-pop)] py-2.5 pl-10 pr-3 text-sm text-[var(--text)] placeholder:text-[var(--text-4)] ${FOCUS}`}
        />
      </label>
      <label className="inline-flex items-center gap-2 text-sm text-[var(--text-3)]">
        <SortAscending size={18} className="text-[var(--text-4)]" aria-hidden />
        <span className="sr-only sm:not-sr-only">Ordenar por</span>
        <select
          value={sort}
          onChange={(event) => {
            pushParams(draftQuery, event.target.value as SiteGallerySortId);
          }}
          className={`rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-medium text-[var(--text-2)] ${FOCUS}`}
          aria-label="Ordenação da galeria"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function SitesGallery({
  items,
  pagination,
  query,
  sort,
  pathname,
  loadError,
  hasAnySites,
  demoMode = false,
}: SitesGalleryProps) {
  const searchParams = useMemo(() => {
    const params: Record<string, string | undefined> = {};
    if (query.trim()) params.q = query.trim();
    if (sort !== "recent") params.sort = sort;
    return params;
  }, [query, sort]);

  const showEmptySearch = hasAnySites && query.trim().length > 0 && items.length === 0;
  const showEmptyAll = !hasAnySites && !query.trim();

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-sm font-medium text-[var(--brand)]">Sites</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Meus sites</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-3)] sm:text-base">
        Acompanhe rascunhos, publicações e sites enviados por ZIP, tudo ligado aos leads do CRM.
      </p>

      {loadError ? (
        <p role="alert" className="mt-8 rounded-2xl border border-[var(--site-alert-error-border)] bg-[var(--site-alert-error-bg)] px-4 py-3 text-sm text-[var(--site-alert-error-fg)]">
          {loadError}
        </p>
      ) : null}

      {!loadError && (hasAnySites || query.trim()) ? (
        <SitesSearchControls key={query} query={query} sort={sort} pathname={pathname} />
      ) : null}

      {!loadError && showEmptyAll ? (
        <div className="app-card mt-10 flex flex-col items-start gap-4 p-8 sm:p-10">
          <p className="text-base font-semibold text-[var(--text)]">Nenhum site ainda</p>
          <p className="max-w-lg text-sm leading-6 text-[var(--text-3)]">
            Quando você enviar um site em ZIP para um lead, ele aparecerá aqui com status e atalhos
            para prévia e CRM.
          </p>
          <Link
            href="/app/criar-site"
            className={`inline-flex items-center justify-center rounded-full bg-[var(--brand-solid)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 ${FOCUS}`}
          >
            Criar site
          </Link>
        </div>
      ) : null}

      {!loadError && showEmptySearch ? (
        <div className="app-card mt-10 p-8 sm:p-10">
          <p className="text-base font-semibold text-[var(--text)]">Nenhum resultado para a busca</p>
          <p className="mt-2 text-sm text-[var(--text-3)]">
            Tente outro nome ou limpe o filtro para ver todos os sites.
          </p>
        </div>
      ) : null}

      {!loadError && items.length > 0 ? (
        <>
          <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((lead) => (
              <li key={lead.id}>
                <SiteCard lead={lead} />
              </li>
            ))}
          </ul>
          <ListPagination
            className="mt-8"
            meta={pagination}
            pathname={pathname}
            searchParams={searchParams}
            pageSizeOptions={[6, 12, 24]}
            defaultPageSize={12}
            label="Paginação da galeria de sites"
          />
        </>
      ) : null}

      {demoMode ? (
        <p className="sr-only" aria-live="polite">
          Galeria demonstrativa com dados fictícios.
        </p>
      ) : null}
    </main>
  );
}
