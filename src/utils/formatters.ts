/**
 * Formatadores de moeda (BRL), telefone, CPF/RG e links de WhatsApp
 */

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || isNaN(valor)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(valor);
}

export function parseMoeda(str: string): number {
  if (!str) return 0;
  const limpo = str.replace(/[^\d,-]/g, '').replace(',', '.');
  const num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

export function formatarTelefone(tel: string): string {
  if (!tel) return '';
  const digits = tel.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return tel;
}

export function gerarLinkWhatsApp(telefone: string, mensagem: string): string {
  const digits = telefone.replace(/\D/g, '');
  const comDDI = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${comDDI}?text=${encodeURIComponent(mensagem)}`;
}

export function mascararCPF(cpf?: string): string {
  if (!cpf) return '***.***.***-**';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length === 11) {
    return `***.${digits.slice(3, 6)}.***-${digits.slice(9)}`;
  }
  return '***.***.***-**';
}

export function mascararRG(rg?: string): string {
  if (!rg) return '**.***.***-*';
  const digits = rg.replace(/\D/g, '');
  if (digits.length >= 7) {
    return `**.***.${digits.slice(-4, -1)}-*`;
  }
  return '**.***.***-*';
}
