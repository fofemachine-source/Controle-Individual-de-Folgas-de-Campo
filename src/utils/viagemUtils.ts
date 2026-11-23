import {
  Viagem,
  TipoTransporte,
  DocumentoObrigatorioStatus,
  EtapaFlagItem,
  EtapaViagem,
  IndicadoresCAN,
  IndicadorCentroCusto,
  AnexoDocumento,
} from '../types';
import { diffEmDias } from './dateUtils';

export const ORDEM_ETAPAS: EtapaViagem[] = [
  'programada',
  'enviada',
  'aprovada',
  'comprada',
  'realizada',
];

export const LABELS_ETAPA: Record<EtapaViagem, string> = {
  programada: '1. Programada',
  enviada: '2. Enviada para Aprovação',
  aprovada: '3. Aprovada',
  comprada: '4. Passagem Comprada',
  realizada: '5. Realizada',
};

export function derivarTipoTransporte(
  necessitaAereo: boolean,
  necessitaRodoviario: boolean
): TipoTransporte {
  if (necessitaAereo && necessitaRodoviario) return 'Aéreo + Rodoviário';
  if (necessitaAereo) return 'Aéreo';
  return 'Rodoviário';
}

export function obterNecessidadesTransporte(v: Pick<Viagem, 'transporte' | 'necessitaAereo' | 'necessitaRodoviario' | 'necessitaTaxi'>) {
  const necessitaAereo =
    v.necessitaAereo !== undefined ? v.necessitaAereo : v.transporte.includes('Aéreo');
  const necessitaRodoviario =
    v.necessitaRodoviario !== undefined ? v.necessitaRodoviario : v.transporte.includes('Rodoviário');
  const necessitaTaxi = v.necessitaTaxi !== undefined ? v.necessitaTaxi : false;

  return { necessitaTaxi, necessitaAereo, necessitaRodoviario };
}

export interface AvaliacaoDocumentosViagem {
  documentos: DocumentoObrigatorioStatus[];
  obrigatorios: DocumentoObrigatorioStatus[];
  pendentes: DocumentoObrigatorioStatus[];
  todosObrigatoriosAnexados: boolean;
  percentualDocs: number;
  statusProcesso: 'cancelada' | 'concluida' | 'pronta_concluir' | 'em_andamento';
  statusProcessoTexto: string;
  flagsEtapas: EtapaFlagItem[];
}

export function avaliarDocumentosViagem(v: Viagem): AvaliacaoDocumentosViagem {
  const anexos = v.anexos || {};
  const { necessitaAereo } = obterNecessidadesTransporte(v);

  const exigeVoucherAereo = necessitaAereo;
  const exigeReservaHotel = Boolean(v.hospedagem && v.tipoHosp === 'Hotel');
  const exigeQrCode = Boolean(v.acessoObra || v.qrCode);

  const documentos: DocumentoObrigatorioStatus[] = [
    {
      chave: 'voucherAereo',
      label: 'Voucher Aéreo',
      descricao: exigeVoucherAereo
        ? 'Obrigatório para viagens com trecho aéreo'
        : 'Opcional (viagem sem trecho aéreo)',
      obrigatorio: exigeVoucherAereo,
      anexado: Boolean(anexos.voucherAereo),
      anexo: anexos.voucherAereo,
    },
    {
      chave: 'reservaHotel',
      label: 'PDF de Reserva de Hotel',
      descricao: exigeReservaHotel
        ? 'Obrigatório quando há reserva de hospedagem em hotel'
        : v.hospedagem
        ? 'Opcional (hospedagem em república própria)'
        : 'Não aplicável (sem reserva de hotel)',
      obrigatorio: exigeReservaHotel,
      anexado: Boolean(anexos.reservaHotel),
      anexo: anexos.reservaHotel,
    },
    {
      chave: 'qrCodeAcesso',
      label: 'QR Code de Acesso à Obra',
      descricao: exigeQrCode
        ? 'Obrigatório para liberação de acesso à obra'
        : 'Não aplicável (sem acesso à obra solicitado)',
      obrigatorio: exigeQrCode,
      anexado: Boolean(anexos.qrCodeAcesso),
      anexo: anexos.qrCodeAcesso,
    },
  ];

  const obrigatorios = documentos.filter(d => d.obrigatorio);
  const pendentes = obrigatorios.filter(d => !d.anexado);
  const todosObrigatoriosAnexados = pendentes.length === 0;

  const percentualDocs =
    obrigatorios.length === 0
      ? 100
      : Math.round(((obrigatorios.length - pendentes.length) / obrigatorios.length) * 100);

  const isCancelada = v.ocorrencia === 'Cancelada';
  const idxAtual = ORDEM_ETAPAS.indexOf(v.etapa);

  let statusProcesso: AvaliacaoDocumentosViagem['statusProcesso'] = 'em_andamento';
  let statusProcessoTexto = 'Em Andamento';

  if (isCancelada) {
    statusProcesso = 'cancelada';
    statusProcessoTexto = 'Cancelada';
  } else if (v.etapa === 'realizada' && todosObrigatoriosAnexados) {
    statusProcesso = 'concluida';
    statusProcessoTexto = 'Concluída';
  } else if (v.etapa === 'comprada' && todosObrigatoriosAnexados) {
    statusProcesso = 'pronta_concluir';
    statusProcessoTexto = 'Pronta para Concluir';
  } else if (pendentes.length > 0 && idxAtual >= 3) {
    statusProcesso = 'em_andamento';
    statusProcessoTexto = `Em Andamento (${pendentes.length} doc. obrigatório${pendentes.length > 1 ? 's' : ''} pendente${pendentes.length > 1 ? 's' : ''})`;
  } else {
    statusProcesso = 'em_andamento';
    statusProcessoTexto = 'Em Andamento';
  }

  // Flags de cada etapa do fluxo + documentação obrigatória
  const flagsEtapas: EtapaFlagItem[] = [
    {
      id: 'programada',
      titulo: '1. Programada',
      subtitulo: 'Solicitação criada e inserida no planejamento',
      status: isCancelada ? 'bloqueada' : idxAtual >= 0 ? 'concluida' : 'pendente',
      labelFlag: isCancelada ? 'Cancelada' : 'Concluída',
    },
    {
      id: 'enviada',
      titulo: '2. Enviada para Aprovação',
      subtitulo: 'Lote encaminhado para validação da Gestão / RH',
      status: isCancelada
        ? 'bloqueada'
        : idxAtual >= 1
        ? 'concluida'
        : idxAtual === 0
        ? 'em_andamento'
        : 'pendente',
      labelFlag: isCancelada
        ? 'Cancelada'
        : idxAtual >= 1
        ? 'Concluída'
        : 'Aguardando Envio',
    },
    {
      id: 'aprovada',
      titulo: '3. Aprovada',
      subtitulo: 'Viagem homologada para emissão de bilhetes e reservas',
      status: isCancelada
        ? 'bloqueada'
        : idxAtual >= 2
        ? 'concluida'
        : idxAtual === 1
        ? 'em_andamento'
        : 'pendente',
      labelFlag: isCancelada
        ? 'Cancelada'
        : idxAtual >= 2
        ? 'Aprovada'
        : idxAtual === 1
        ? 'Em Aprovação'
        : 'Pendente',
    },
    {
      id: 'comprada',
      titulo: '4. Passagem Comprada / Emissão',
      subtitulo: 'Custos registrados e localizador/voucher informado',
      status: isCancelada
        ? 'bloqueada'
        : idxAtual >= 3
        ? 'concluida'
        : idxAtual === 2
        ? 'em_andamento'
        : 'pendente',
      labelFlag: isCancelada
        ? 'Cancelada'
        : idxAtual >= 3
        ? 'Emitida'
        : idxAtual === 2
        ? 'Em Emissão'
        : 'Pendente',
    },
    {
      id: 'documentacao',
      titulo: '5. Documentação Obrigatória',
      subtitulo:
        obrigatorios.length === 0
          ? 'Sem documentos obrigatórios pendentes para este perfil'
          : `${obrigatorios.length - pendentes.length} de ${obrigatorios.length} documento(s) obrigatório(s) anexado(s)`,
      status: isCancelada
        ? 'bloqueada'
        : todosObrigatoriosAnexados
        ? 'concluida'
        : idxAtual >= 3
        ? 'bloqueada'
        : 'em_andamento',
      labelFlag: isCancelada
        ? 'Cancelada'
        : todosObrigatoriosAnexados
        ? 'Docs Completos'
        : `Pendente (${pendentes.length})`,
    },
    {
      id: 'realizada',
      titulo: '6. Realizada (Conclusão)',
      subtitulo: todosObrigatoriosAnexados
        ? 'Viagem concluída e ciclo de folga atualizado'
        : 'Bloqueada até anexar todos os documentos obrigatórios',
      status: isCancelada
        ? 'bloqueada'
        : v.etapa === 'realizada' && todosObrigatoriosAnexados
        ? 'concluida'
        : !todosObrigatoriosAnexados
        ? 'bloqueada'
        : idxAtual === 3
        ? 'em_andamento'
        : 'pendente',
      labelFlag: isCancelada
        ? 'Cancelada'
        : v.etapa === 'realizada' && todosObrigatoriosAnexados
        ? 'Concluída'
        : !todosObrigatoriosAnexados
        ? 'Em Andamento (Docs)'
        : 'Pronta',
    },
  ];

  return {
    documentos,
    obrigatorios,
    pendentes,
    todosObrigatoriosAnexados,
    percentualDocs,
    statusProcesso,
    statusProcessoTexto,
    flagsEtapas,
  };
}

export function calcularIndicadoresCAN(
  todasViagens: Viagem[],
  filtroCentroCusto?: string
): IndicadoresCAN {
  // Mapa de consolidação por Centro de Custo (sempre calculado sobre todas as viagens para o quadro comparativo)
  const mapaCC = new Map<string, IndicadorCentroCusto>();

  const garantirCC = (cc: string): IndicadorCentroCusto => {
    const chave = (cc || 'SEM CC').trim().toUpperCase();
    if (!mapaCC.has(chave)) {
      mapaCC.set(chave, {
        centroCusto: chave,
        totalSolicitacoes: 0,
        fichasPadrao: 0,
        totalRealizadas: 0,
        emAndamento: 0,
        dentroDoPrazo: 0,
        foraDoPrazo: 0,
        remarcacoes: 0,
        cancelamentos: 0,
        custoPassagens: 0,
        custoHospedagem: 0,
        custoTotal: 0,
        taxaSLA: 0,
      });
    }
    return mapaCC.get(chave)!;
  };

  todasViagens.forEach(v => {
    const cc = garantirCC(v.centroCusto || v.operacao || 'UMCA');
    if (v.ocorrencia === 'Remarcada') cc.remarcacoes++;
    if (v.ocorrencia === 'Cancelada') {
      cc.cancelamentos++;
      return;
    }

    cc.totalSolicitacoes++;
    if (v.fichaOrigem) cc.fichasPadrao++;

    const antecedencia = diffEmDias(v.ida, v.dataSolicitacao);
    if (antecedencia >= 20) cc.dentroDoPrazo++;
    else cc.foraDoPrazo++;

    if (v.custoPassagem && v.custoPassagem > 0) cc.custoPassagens += Number(v.custoPassagem);
    if (v.custoHospedagem && v.custoHospedagem > 0) cc.custoHospedagem += Number(v.custoHospedagem);
    cc.custoTotal = cc.custoPassagens + cc.custoHospedagem;

    const evalDocs = avaliarDocumentosViagem(v);
    if (v.etapa === 'realizada' && evalDocs.todosObrigatoriosAnexados) {
      cc.totalRealizadas++;
    } else {
      cc.emAndamento++;
    }
  });

  const porCentroCusto = Array.from(mapaCC.values())
    .map(item => ({
      ...item,
      taxaSLA:
        item.totalSolicitacoes > 0
          ? Math.round((item.dentroDoPrazo / item.totalSolicitacoes) * 100)
          : 0,
    }))
    .sort((a, b) => b.totalSolicitacoes - a.totalSolicitacoes);

  // Aplica filtro por Centro de Custo para os KPIs principais
  const viagens =
    filtroCentroCusto && filtroCentroCusto !== 'TODOS'
      ? todasViagens.filter(
          v => (v.centroCusto || v.operacao || 'UMCA').trim().toUpperCase() === filtroCentroCusto.trim().toUpperCase()
        )
      : todasViagens;

  let totalRealizadas = 0;
  let dentroDoPrazo = 0;
  let foraDoPrazo = 0;
  let remarcacoes = 0;
  let cancelamentos = 0;
  let custoPassagens = 0;
  let custoHospedagem = 0;
  let utilizacaoRepublicas = 0;
  let utilizacaoHoteis = 0;
  let conformidadeSim = 0;
  let conformidadeNao = 0;
  let realizadasPrioritarias = 0;
  let totalFichasIntegradas = 0;
  let totalEmAndamentoDocsPendentes = 0;

  const etapasContagem: Record<EtapaViagem, number> = {
    programada: 0,
    enviada: 0,
    aprovada: 0,
    comprada: 0,
    realizada: 0,
  };

  viagens.forEach(v => {
    if (v.ocorrencia === 'Remarcada') remarcacoes++;
    if (v.ocorrencia === 'Cancelada') {
      cancelamentos++;
      return;
    }

    etapasContagem[v.etapa] = (etapasContagem[v.etapa] || 0) + 1;
    if (v.fichaOrigem) totalFichasIntegradas++;

    const evalDocs = avaliarDocumentosViagem(v);
    if (!evalDocs.todosObrigatoriosAnexados && v.etapa !== 'realizada') {
      totalEmAndamentoDocsPendentes++;
    }

    const antecedencia = diffEmDias(v.ida, v.dataSolicitacao);
    if (antecedencia >= 20) {
      dentroDoPrazo++;
    } else {
      foraDoPrazo++;
    }

    if (v.custoPassagem && v.custoPassagem > 0) {
      custoPassagens += Number(v.custoPassagem);
    }
    if (v.custoHospedagem && v.custoHospedagem > 0) {
      custoHospedagem += Number(v.custoHospedagem);
    }

    if (v.hospedagem) {
      if (v.tipoHosp === 'República') utilizacaoRepublicas++;
      if (v.tipoHosp === 'Hotel') utilizacaoHoteis++;
    }

    if (v.folgaConforme) {
      conformidadeSim++;
    } else {
      conformidadeNao++;
    }

    if (v.etapa === 'realizada' && evalDocs.todosObrigatoriosAnexados) {
      totalRealizadas++;
      if (v.dataPrioritaria) {
        realizadasPrioritarias++;
      }
    }
  });

  const totalHospedagens = utilizacaoRepublicas + utilizacaoHoteis;
  const taxaRepublicas =
    totalHospedagens > 0 ? Math.round((utilizacaoRepublicas / totalHospedagens) * 100) : 0;
  const taxaHoteis =
    totalHospedagens > 0 ? Math.round((utilizacaoHoteis / totalHospedagens) * 100) : 0;

  const totalConformidade = conformidadeSim + conformidadeNao;
  const conformidadePlanejamento =
    totalConformidade > 0 ? Math.round((conformidadeSim / totalConformidade) * 100) : 100;

  const percentualDatasPrioritarias =
    totalRealizadas > 0 ? Math.round((realizadasPrioritarias / totalRealizadas) * 100) : 0;

  return {
    totalRealizadas,
    dentroDoPrazo,
    foraDoPrazo,
    remarcacoes,
    cancelamentos,
    custoPassagens,
    custoHospedagem,
    custoTotal: custoPassagens + custoHospedagem,
    utilizacaoRepublicas,
    utilizacaoHoteis,
    taxaRepublicas,
    taxaHoteis,
    conformidadePlanejamento,
    percentualDatasPrioritarias,
    totalSolicitacoesAtivas: dentroDoPrazo + foraDoPrazo,
    etapasContagem,
    totalFichasIntegradas,
    totalEmAndamentoDocsPendentes,
    porCentroCusto,
  };
}

export const MAX_TAMANHO_ANEXO_BYTES = 2 * 1024 * 1024; // 2 MB

export function lerArquivoComoAnexo(file: File, hojeISO: string): Promise<AnexoDocumento> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_TAMANHO_ANEXO_BYTES) {
      reject(new Error('Arquivo excede o limite de 2 MB para armazenamento local.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        nome: file.name,
        tipo: file.type || 'application/octet-stream',
        tamanho: file.size,
        dataUrl: String(reader.result || ''),
        enviadoEm: hojeISO,
      });
    };
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

export function formatarTamanhoArquivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
