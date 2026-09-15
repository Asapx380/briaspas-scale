function normalizeText(value: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function createLeadIdentityKey(input: {
  companyName: string;
  phone: string | null;
  city: string | null;
}) {
  const phone = input.phone?.replace(/\D/g, "") ?? "";
  return `${normalizeText(input.companyName)}|${phone}|${normalizeText(input.city)}`;
}
