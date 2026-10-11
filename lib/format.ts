// Funções de formatação usadas no painel admin (seguras para rodar no navegador).

export function formatCpf(cpf: string | null | undefined) {
  const d = (cpf ?? "").replace(/\D/g, "");
  if (d.length !== 11) return cpf ?? "";
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

// "2 anos e 3 meses", "5 meses", "12 dias"
export function formatTenure(fromIso: string | null | undefined, now: Date = new Date()) {
  if (!fromIso) return "";
  const from = new Date(fromIso.length === 10 ? fromIso + "T12:00:00" : fromIso);
  if (isNaN(from.getTime())) return "";
  const totalDays = Math.floor((now.getTime() - from.getTime()) / 86400000);
  if (totalDays < 0) return "recém-chegado";
  if (totalDays < 31) return totalDays === 1 ? "1 dia" : `${totalDays} dias`;
  let months = (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  if (now.getDate() < from.getDate()) months -= 1;
  months = Math.max(months, 1);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years > 0 ? (years === 1 ? "1 ano" : `${years} anos`) : "";
  const m = rest > 0 ? (rest === 1 ? "1 mês" : `${rest} meses`) : "";
  return [y, m].filter(Boolean).join(" e ");
}

export function formatDateBr(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR");
}
