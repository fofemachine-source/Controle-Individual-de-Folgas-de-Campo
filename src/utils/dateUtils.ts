/**
 * Utilitários de data e cálculo de ciclos de escala de trabalho
 */

// Data base do sistema alinhada ao ambiente (2026-11-10)
export const HOJE_ISO = '2026-11-10';

export function obterHojeISO(): string {
  // Retorna a data corrente no formato YYYY-MM-DD
  // Se estivermos em 2026 usamos a data corrente ou padrão 2026-11-10
  const d = new Date();
  const ano = d.getFullYear();
  if (ano === 2026) {
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
  return HOJE_ISO;
}

export function parseISO(s: string): number {
  if (!s) return 0;
  const parts = s.split('-').map(Number);
  if (parts.length !== 3) return 0;
  return Date.UTC(parts[0], parts[1] - 1, parts[2]);
}

export function diffEmDias(dataA: string, dataB: string): number {
  const tA = parseISO(dataA);
  const tB = parseISO(dataB);
  if (!tA || !tB) return 0;
  return Math.round((tA - tB) / 86400000);
}

export function somarDias(dataISO: string, dias: number): string {
  const t = parseISO(dataISO);
  if (!t) return dataISO;
  const res = new Date(t + Number(dias) * 86400000);
  const y = res.getUTCFullYear();
  const m = String(res.getUTCMonth() + 1).padStart(2, '0');
  const d = String(res.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatarDataBR(dataISO?: string | null): string {
  if (!dataISO) return '—';
  const match = String(dataISO).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return dataISO;
}

export function formatarDataExtensa(dataISO?: string | null): string {
  if (!dataISO) return '—';
  const t = parseISO(dataISO);
  if (!t) return dataISO;
  const d = new Date(t);
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  return `${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}

export function paraISO(valorBR: string): string {
  if (!valorBR) return '';
  const m = String(valorBR).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(valorBR);
}
