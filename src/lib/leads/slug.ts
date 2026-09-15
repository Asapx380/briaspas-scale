import { randomUUID } from "node:crypto";

export function createLeadSlug(companyName: string) {
  const base = companyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "empresa";

  return `${base}-${randomUUID().slice(0, 8)}`;
}

