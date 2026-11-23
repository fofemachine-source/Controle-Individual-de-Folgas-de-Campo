export type EscalaPadrao = '90x10' | '60x10' | '60x7' | '45x7' | '35x7' | '30x8' | '7x7' | 'Quinzenal' | 'Personalizada';

export type TipoTransporte = 'Aéreo' | 'Rodoviário' | 'Aéreo + Rodoviário';

export type BeneficiosTipo = 'Passagens rodoviárias e táxi' | 'Passagens aéreas e rodoviárias e táxi';

export type EtapaViagem = 'programada' | 'enviada' | 'aprovada' | 'comprada' | 'realizada';

export type OcorrenciaViagem = 'Sem alteração' | 'Remarcada' | 'Cancelada';

export type TipoHospedagem = 'República' | 'Hotel' | 'N.A';

export type MotivoViagem = 'Folga de campo' | 'Consultoria' | 'Treinamento' | 'Visita técnica' | 'Outro';

export type TipoColaborador = 'U&M' | 'Terceiro';

export type TipoAviso = 'Voucher' | 'Lembrete' | 'Próxima folga' | 'Remarcação';

export interface Colaborador {
  id: string;
  chapa: number;
  nome: string;
  funcao: string;
  trab: number; // dias de trabalho
  folga: number; // dias de folga
  escalaNome?: string;
  transporte: TipoTransporte;
  origem: string;
  destino: string;
  beneficios: BeneficiosTipo;
  telefone: string;
  ultimaFolga: string; // YYYY-MM-DD
  ferias: boolean;
  // Campos complementares para Ficha padrão
  tipo?: TipoColaborador;
  cpfMascarado?: string;
  rgMascarado?: string;
  dataNascimento?: string;
}

export interface Viagem {
  id: string;
  colabId: string;
  etapa: EtapaViagem;
  motivo: MotivoViagem;
  dataSolicitacao: string; // YYYY-MM-DD
  ida: string; // YYYY-MM-DD
  volta: string; // YYYY-MM-DD
  origem: string;
  destino: string;
  transporte: TipoTransporte;
  solicitante: string;
  custoPassagem: number | null;
  voucher: string;
  hospedagem: boolean;
  tipoHosp: TipoHospedagem;
  localHosp: string;
  custoHospedagem: number | null;
  ocorrencia: OcorrenciaViagem;
  dataPrioritaria: boolean;
  folgaConforme: boolean;
  obs: string;
  // Dados de Ficha
  tipoColaborador?: TipoColaborador;
  centroCusto?: string;
  qrCode?: boolean;
  motivoVisita?: string;
  diasNaObra?: number;
  enderecoVisitante?: string;
}

export interface Aviso {
  id: string;
  key: string;
  colabId: string;
  tipo: TipoAviso;
  texto: string;
  criado: string; // YYYY-MM-DD
  enviado: boolean;
  dataEnvio?: string;
}

export type SituacaoFolgaCor = 'vermelho' | 'amarelo' | 'verde' | 'azul' | 'cinza';

export interface CalculoFolga {
  colaborador: Colaborador;
  proximaData: string; // YYYY-MM-DD
  diasAteFolga: number;
  diasDecorridoCiclo: number;
  diasTotalCiclo: number;
  percentualCiclo: number;
  situacaoTexto: string;
  situacaoCor: SituacaoFolgaCor;
  viagemAtiva?: Viagem;
}

export interface IndicadoresCAN {
  totalRealizadas: number;
  dentroDoPrazo: number;
  foraDoPrazo: number;
  remarcacoes: number;
  cancelamentos: number;
  custoPassagens: number;
  custoHospedagem: number;
  custoTotal: number;
  utilizacaoRepublicas: number;
  utilizacaoHoteis: number;
  taxaRepublicas: number;
  taxaHoteis: number;
  conformidadePlanejamento: number; // %
  percentualDatasPrioritarias: number; // %
  totalSolicitacoesAtivas: number;
  etapasContagem: Record<EtapaViagem, number>;
}
