import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Une classes Tailwind resolvendo conflitos (ex.: px-2 + px-4 -> px-4). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Formata centavos (inteiro) como moeda brasileira. Ex.: 24990 -> "R$ 249,90". */
export function formatPrice(cents: number): string {
  return BRL.format(cents / 100);
}

/** Calcula o valor da parcela e formata. */
export function formatInstallment(totalCents: number, installments: number): string {
  const per = totalCents / installments;
  return `${installments}x de ${BRL.format(per / 100)}`;
}

/** Percentual de desconto entre preco cheio e preco atual. */
export function discountPercent(compareAtCents: number, priceCents: number): number {
  if (!compareAtCents || compareAtCents <= priceCents) return 0;
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}

/** Aplica desconto Pix sobre um valor em centavos. */
export function applyPix(cents: number, pct: number): number {
  return Math.round(cents * (1 - pct / 100));
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const dateShortFmt = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatDateShort(iso: string): string {
  return dateShortFmt.format(new Date(iso));
}

/** Mascara de CEP: 00000000 -> 00000-000. */
export function formatZip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Mascara de telefone brasileiro. */
export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Mascara de CPF. */
export function formatCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Gera um id opaco para uso no cliente (carrinho anonimo, linhas de carrinho). */
export function makeId(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${rand}`;
}

/** Pluralizacao simples em pt-BR. */
export function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

/** Slugify basico. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
