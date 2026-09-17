"use client";

import {
  ArrowRight,
  Buildings,
  CheckCircle,
  DownloadSimple,
  FileCsv,
  Plus,
  Trash,
  UploadSimple,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { useMemo, useRef, useState } from "react";

type LeadDraft = {
  companyName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  niche: string;
  city: string;
  websiteUrl: string | null;
  instagram: string | null;
  photoUrls: string[];
  googleMapsUrl: string | null;
  googlePlaceId: string | null;
  rating: number | null;
  reviewCount: number | null;
};

type ApiError = { error?: { message?: string } };
type ImportResult = { imported: number; duplicates: number; received: number };
type Mode = "manual" | "csv";

const FIELD_CLASS =
  "h-11 rounded-xl border border-black/8 bg-white px-3.5 text-base text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-4)] focus:border-[var(--brand)]/60 focus:ring-2 focus:ring-[var(--brand)]/15";

const HEADER_ALIASES = {
  companyName: ["name", "place name", "business name", "company", "company name", "nome", "nome da empresa", "empresa", "title"],
  phone: ["phone", "phone number", "telephone", "telefone", "telefone principal", "international phone number"],
  email: ["email", "e mail", "e-mail", "business email", "email da empresa", "emails"],
  address: ["address", "full address", "formatted address", "complete address", "endereco", "endereco completo", "logradouro"],
  niche: ["category", "business category", "type", "niche", "categoria", "tipo", "segmento", "ramo"],
  city: ["city", "locality", "municipality", "cidade", "municipio"],
  websiteUrl: ["website", "website url", "site", "site url", "url do site"],
  instagram: ["instagram", "instagram url", "perfil do instagram"],
  photoUrls: ["photos", "photo urls", "image urls", "fotos", "urls das fotos", "images", "thumbnail"],
  googleMapsUrl: ["google maps", "google maps url", "maps url", "map url", "direct google maps link", "link do maps", "url do google maps", "link"],
  googlePlaceId: ["place id", "google place id", "placeid", "googleplaceid"],
  rating: ["rating", "google maps rating", "stars", "star rating", "avaliacao", "nota", "estrelas", "review rating"],
  reviewCount: ["reviews", "review count", "total reviews", "total review count", "user rating count", "avaliacoes", "numero de avaliacoes"],
} as const;

const SCRAPER_KIT_HEADERS = new Set([
  "title", "review rating", "review count", "emails", "place id", "cid", "complete address", "link",
]);

type CsvField = keyof typeof HEADER_ALIASES;

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function identifyField(header: string): CsvField | null {
  const normalized = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if ((aliases as readonly string[]).includes(normalized)) return field as CsvField;
  }
  return null;
}

function delimiterScore(line: string, delimiter: string) {
  let quoted = false;
  let score = 0;
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '"') quoted = !quoted;
    if (!quoted && line[index] === delimiter) score += 1;
  }
  return score;
}

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  return [",", ";", "\t"].sort(
    (a, b) => delimiterScore(firstLine, b) - delimiterScore(firstLine, a),
  )[0];
}

function parseDelimitedText(text: string) {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && character === delimiter) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += character;
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseNumber(value: string | undefined) {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  const result = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(result) ? result : null;
}

function valueAt(row: string[], indexes: Partial<Record<CsvField, number>>, field: CsvField) {
  const index = indexes[field];
  return index === undefined ? "" : row[index]?.trim() ?? "";
}

function readCsv(text: string, defaultNiche: string, defaultCity: string) {
  const table = parseDelimitedText(text);
  if (table.length < 2) throw new Error("O CSV precisa ter um cabeçalho e pelo menos uma empresa.");

  const headers = table[0];
  const indexes: Partial<Record<CsvField, number>> = {};
  headers.forEach((header, index) => {
    const field = identifyField(header);
    if (field && indexes[field] === undefined) indexes[field] = index;
  });

  if (indexes.companyName === undefined) {
    throw new Error('Não encontrei a coluna de nome. Use "Nome" ou "Business Name".');
  }

  const leads: LeadDraft[] = [];
  let ignored = 0;

  for (const row of table.slice(1)) {
    const companyName = valueAt(row, indexes, "companyName");
    if (!companyName) {
      ignored += 1;
      continue;
    }

    const rating = parseNumber(valueAt(row, indexes, "rating"));
    const reviewCount = parseNumber(valueAt(row, indexes, "reviewCount"));
    leads.push({
      companyName,
      phone: valueAt(row, indexes, "phone") || null,
      email: valueAt(row, indexes, "email") || null,
      address: valueAt(row, indexes, "address") || null,
      niche: valueAt(row, indexes, "niche") || defaultNiche,
      city: valueAt(row, indexes, "city") || defaultCity,
      websiteUrl: valueAt(row, indexes, "websiteUrl") || null,
      instagram: valueAt(row, indexes, "instagram") || null,
      photoUrls: valueAt(row, indexes, "photoUrls")
        .split("|")
        .map((url) => url.trim())
        .filter(Boolean),
      googleMapsUrl: valueAt(row, indexes, "googleMapsUrl") || null,
      googlePlaceId: valueAt(row, indexes, "googlePlaceId") || null,
      rating: rating !== null && rating >= 0 && rating <= 5 ? rating : null,
      reviewCount: reviewCount !== null && reviewCount >= 0 ? Math.trunc(reviewCount) : null,
    });
  }

  if (leads.length === 0) throw new Error("Nenhuma empresa válida foi encontrada no arquivo.");
  if (leads.length > 200) throw new Error("Importe no máximo 200 empresas de cada vez.");
  if (leads.some((lead) => !lead.niche || !lead.city)) {
    throw new Error("Informe o nicho e a cidade padrão antes de carregar o CSV.");
  }

  const scraperKit = headers.some((header) => SCRAPER_KIT_HEADERS.has(normalizeHeader(header)));

  return {
    leads,
    ignored,
    recognized: Object.keys(indexes).length,
    totalHeaders: headers.length,
    source: scraperKit ? ("scraper_kit" as const) : ("maps2sheets" as const),
  };
}

async function responseMessage(response: Response, fallback: string) {
  const payload = (await response.json()) as ApiError;
  return payload.error?.message ?? fallback;
}

function ManualLeadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googlePlaceId: null,
          companyName: data.get("companyName"),
          phone: data.get("phone"),
          email: data.get("email"),
          address: data.get("address"),
          niche: data.get("niche"),
          city: data.get("city"),
          websiteUrl: data.get("websiteUrl"),
          instagram: data.get("instagram"),
          googleMapsUrl: data.get("googleMapsUrl"),
          rating: null,
          reviewCount: null,
        }),
      });

      if (!response.ok) throw new Error(await responseMessage(response, "Não foi possível salvar a empresa."));
      formRef.current?.reset();
      setMessage({ type: "success", text: "Empresa adicionada ao CRM com sucesso." });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Não foi possível salvar a empresa." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-7 grid gap-5" aria-label="Adicionar empresa manualmente">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Nome da empresa
          <input name="companyName" required maxLength={200} placeholder="Ex.: Barbearia do Lucas" className={FIELD_CLASS} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Telefone
          <input name="phone" type="tel" maxLength={80} autoComplete="tel" placeholder="Ex.: (86) 99999-9999" className={FIELD_CLASS} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          E-mail
          <input name="email" type="email" maxLength={320} autoComplete="email" placeholder="contato@empresa.com.br" className={FIELD_CLASS} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Nicho
          <input name="niche" required maxLength={80} placeholder="Ex.: Barbearia" className={FIELD_CLASS} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Cidade
          <input name="city" required maxLength={100} autoComplete="address-level2" placeholder="Ex.: Teresina, PI" className={FIELD_CLASS} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)] sm:col-span-2">
          Endereço
          <input name="address" maxLength={500} autoComplete="street-address" placeholder="Rua, número e bairro" className={FIELD_CLASS} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Site
          <input name="websiteUrl" type="url" maxLength={500} placeholder="https://empresa.com.br" className={FIELD_CLASS} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Instagram
          <input name="instagram" maxLength={200} placeholder="@empresa ou link do perfil" className={FIELD_CLASS} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Link do Google Maps
          <input name="googleMapsUrl" type="url" maxLength={500} placeholder="https://maps.google.com/..." className={FIELD_CLASS} />
        </label>
      </div>

      {message && (
        <div role={message.type === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-600" : "border-rose-400/20 bg-rose-400/10 text-rose-700"}`}>
          {message.type === "success" ? <CheckCircle size={19} weight="fill" /> : <WarningCircle size={19} weight="fill" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-hover)] active:translate-y-px disabled:cursor-wait disabled:bg-[var(--brand)]/50 disabled:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">
          <Plus size={18} weight="bold" />
          {isSaving ? "Salvando..." : "Adicionar ao CRM"}
        </button>
        {message?.type === "success" && (
          <Link href="/app/crm" className="inline-flex h-11 items-center gap-2 rounded-xl border border-black/8 px-4 text-sm font-semibold text-[var(--text-2)] hover:border-[var(--brand)]/30 hover:bg-[var(--brand-hover)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">
            Ver no CRM <ArrowRight size={16} weight="bold" />
          </Link>
        )}
      </div>
    </form>
  );
}

function CsvImporter() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [defaultNiche, setDefaultNiche] = useState("");
  const [defaultCity, setDefaultCity] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadDraft[]>([]);
  const [ignored, setIgnored] = useState(0);
  const [mappingInfo, setMappingInfo] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importSource, setImportSource] = useState<"maps2sheets" | "scraper_kit">("maps2sheets");

  const phoneCount = useMemo(() => leads.filter((lead) => lead.phone).length, [leads]);
  const websiteCount = useMemo(() => leads.filter((lead) => lead.websiteUrl).length, [leads]);

  async function loadFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    if (file.size > 2 * 1024 * 1024) {
      setError("O arquivo deve ter no máximo 2 MB.");
      return;
    }

    setIsParsing(true);
    try {
      const text = await file.text();
      const parsed = await new Promise<ReturnType<typeof readCsv>>((resolve, reject) => {
        const run = () => {
          try {
            resolve(readCsv(text, defaultNiche.trim(), defaultCity.trim()));
          } catch (parseError) {
            reject(parseError);
          }
        };
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(() => run(), { timeout: 800 });
        } else {
          window.setTimeout(run, 0);
        }
      });
      setFileName(file.name);
      setLeads(parsed.leads);
      setImportSource(parsed.source);
      setIgnored(parsed.ignored);
      setMappingInfo(`${parsed.recognized} de ${parsed.totalHeaders} colunas reconhecidas`);
    } catch (fileError) {
      setFileName(null);
      setLeads([]);
      setError(fileError instanceof Error ? fileError.message : "Não foi possível ler o CSV.");
    } finally {
      setIsParsing(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void loadFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    void loadFile(event.dataTransfer.files?.[0]);
  }

  function removeLead(index: number) {
    setLeads((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function downloadTemplate() {
    const content = "Nome,Telefone,E-mail,Endereço,Categoria,Cidade,Instagram,Site,Google Maps,Avaliação,Avaliações,Fotos\nBarbearia Exemplo,(86) 99999-9999,contato@exemplo.com.br,Rua Exemplo 123,Barbearia,Teresina PI,@barbeariaexemplo,https://exemplo.com.br,https://maps.google.com/,4.8,127,https://exemplo.com.br/foto.jpg\n";
    const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo-leads-briaspas.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importLeads() {
    if (leads.length === 0) return;
    setIsImporting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/v1/leads/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: importSource,
          defaultCity: defaultCity.trim() || undefined,
          defaultNiche: defaultNiche.trim() || undefined,
          leads,
        }),
      });
      if (!response.ok) throw new Error(await responseMessage(response, "Não foi possível importar as empresas."));
      const payload = (await response.json()) as { data: ImportResult };
      setResult(payload.data);
      setLeads([]);
      setFileName(null);
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Não foi possível importar as empresas.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="mt-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Nicho padrão
          <input value={defaultNiche} onChange={(event) => setDefaultNiche(event.target.value)} maxLength={80} placeholder="Usado se o CSV não tiver categoria" className={FIELD_CLASS} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[var(--text-2)]">
          Cidade padrão
          <input value={defaultCity} onChange={(event) => setDefaultCity(event.target.value)} maxLength={100} placeholder="Usada se o CSV não tiver cidade" className={FIELD_CLASS} />
        </label>
      </div>

      <div onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[var(--neu-bg-pop)] px-5 py-8 text-center" aria-busy={isParsing}>
        <FileCsv size={34} className="text-[var(--brand)]" />
        <p className="mt-4 font-semibold text-[var(--text)]">
          {isParsing ? "Lendo arquivo…" : "Solte o CSV aqui"}
        </p>
        <p className="mt-1 max-w-md text-sm leading-6 text-[var(--text-4)]">
          {isParsing
            ? "Processando colunas e linhas. Aguarde um momento."
            : "Aceita Maps2Sheets, google-maps-scraper-kit (title, phone, emails, website…) e planilhas em português ou inglês."}
        </p>
        <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="sr-only" disabled={isParsing || isImporting} />
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" disabled={isParsing || isImporting} onClick={() => inputRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] active:translate-y-px disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">
            <UploadSimple size={17} weight="bold" /> {isParsing ? "Lendo…" : "Selecionar CSV"}
          </button>
          <button type="button" onClick={downloadTemplate} disabled={isParsing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-black/8 px-4 text-sm font-semibold text-[var(--text-2)] hover:border-[var(--brand)]/30 hover:bg-[var(--brand-hover)]/10 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">
            <DownloadSimple size={17} /> Baixar modelo
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-700"><WarningCircle size={18} weight="fill" />{error}</p>}

      {result && (
        <div role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-100">
          <p className="flex items-center gap-2 font-semibold"><CheckCircle size={19} weight="fill" /> Importação concluída</p>
          <p className="mt-2 text-emerald-600/80">{result.imported} novas empresas salvas. {result.duplicates} duplicadas foram ignoradas.</p>
          <Link href="/app/crm" className="mt-3 inline-flex items-center gap-2 font-semibold text-emerald-700 hover:text-emerald-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200">Abrir CRM <ArrowRight size={16} /></Link>
        </div>
      )}

      {leads.length > 0 && (
        <section className="mt-7" aria-labelledby="csv-preview-title">
          <div className="flex flex-col gap-4 border-b border-black/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 id="csv-preview-title" className="font-semibold text-[var(--text)]">Pré-visualização de {fileName}</h3>
              <p className="mt-1 text-sm text-[var(--text-4)]">{leads.length} empresas, {phoneCount} telefones, {websiteCount} sites. {mappingInfo}.{ignored > 0 ? ` ${ignored} linhas vazias ignoradas.` : ""}</p>
            </div>
            <button type="button" onClick={importLeads} disabled={isImporting} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)] active:translate-y-px disabled:cursor-wait disabled:bg-[var(--brand)]/50 disabled:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]">
              <UploadSimple size={18} weight="bold" /> {isImporting ? "Importando..." : `Importar ${leads.length} empresas`}
            </button>
          </div>

          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-[var(--text-4)]">
                <tr><th className="px-3 py-3 font-medium">Empresa</th><th className="px-3 py-3 font-medium">Telefone</th><th className="px-3 py-3 font-medium">Nicho</th><th className="px-3 py-3 font-medium">Cidade</th><th className="w-12"><span className="sr-only">Remover</span></th></tr>
              </thead>
              <tbody>
                {leads.slice(0, 12).map((lead, index) => (
                  <tr key={`${lead.companyName}-${index}`} className="border-t border-white/[0.07] text-[var(--text-2)]">
                    <td className="max-w-64 truncate px-3 py-3 font-medium text-[var(--text)]">{lead.companyName}</td>
                    <td className="px-3 py-3">{lead.phone ?? "Não informado"}</td>
                    <td className="px-3 py-3">{lead.niche}</td>
                    <td className="px-3 py-3">{lead.city}</td>
                    <td className="px-3 py-3"><button type="button" onClick={() => removeLead(index)} aria-label={`Remover ${lead.companyName} da pré-visualização`} title="Remover da pré-visualização" className="inline-grid min-h-11 min-w-11 place-items-center rounded-lg text-[var(--text-4)] hover:bg-[var(--neu-bg-well)] hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"><Trash size={16} aria-hidden /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {leads.length > 12 && <p className="mt-3 text-sm text-[var(--text-4)]">Mais {leads.length - 12} empresas serão importadas.</p>}
        </section>
      )}
    </div>
  );
}

export function LeadIntake() {
  const [mode, setMode] = useState<Mode>("csv");

  return (
    <section className="mt-10 rounded-2xl border border-black/8 bg-white p-5 sm:p-7" aria-labelledby="lead-intake-title">
      <div className="flex flex-col gap-5 border-b border-black/8 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="lead-intake-title" className="text-xl font-semibold text-[var(--text)]">Adicionar empresas</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-3)]">Importe uma lista pronta ou cadastre uma empresa por vez.</p>
        </div>
        <div className="grid grid-cols-2 rounded-xl border border-black/8 bg-[var(--neu-bg-pop)] p-1" role="tablist" aria-label="Modo de cadastro">
          <button type="button" role="tab" aria-selected={mode === "csv"} onClick={() => setMode("csv")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${mode === "csv" ? "bg-[var(--brand)] text-white" : "text-[var(--text-3)] hover:text-[var(--text-2)]"}`}>Importar CSV</button>
          <button type="button" role="tab" aria-selected={mode === "manual"} onClick={() => setMode("manual")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${mode === "manual" ? "bg-[var(--brand)] text-white" : "text-[var(--text-3)] hover:text-[var(--text-2)]"}`}>Cadastro manual</button>
        </div>
      </div>

      {mode === "csv" ? <CsvImporter /> : <ManualLeadForm />}
    </section>
  );
}

export function GoogleSearchPausedNotice() {
  return (
    <aside className="mt-8 flex items-start gap-4 border-t border-black/8 pt-7">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--brand)]/20 bg-[var(--brand-hover)]/10 text-[var(--brand)]"><Buildings size={21} /></div>
      <div><h2 className="font-semibold text-[var(--text-2)]">Busca automática preservada</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--text-4)]">A integração com o Google Places continua no código e poderá ser reativada quando houver uma conta de faturamento disponível.</p></div>
    </aside>
  );
}
