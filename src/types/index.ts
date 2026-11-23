export type EscalaPadrao = '90x10' | '60x10' | '60x7' | '45x7' | '35x7' | '30x8' | '7x7' | 'Quinzenal' | 'Personalizada';

export type Operacao = 'UMCA' | 'UMGE' | 'UMBC' | 'UMSS';

export const OPERACOES: Operacao[] = ['UMCA', 'UMGE', 'UMBC', 'UMSS'];

export type UserRole = 'usuario' | 'admin';

export type TipoTransporte = 'Aéreo' | 'Rodoviário' | 'Aéreo + Rodoviário';

export type BeneficiosTipo = 'Passagens rodoviárias e táxi' | 'Passagens aéreas e rodoviárias e táxi';

export type EtapaViagem = 'programada' | 'enviada' | 'aprovada' | 'comprada' | 'realizada';

export type OcorrenciaViagem = 'Sem alteração' | 'Remarcada' | 'Cancelada';

export type TipoHospedagem = 'República' | 'Hotel' | 'N.A';

export type MotivoViagem = 'Folga de campo' | 'Consultoria' | 'Treinamento' | 'Visita técnica' | 'Outro' | 'N.A';

export type TipoColaborador = 'U&M' | 'Terceiro';

export type TipoAviso = 'Voucher' | 'Lembrete' | 'Próxima folga' | 'Remarcação';

export type ChaveAnexo = 'reservaHotel' | 'qrCodeAcesso' | 'voucherAereo';

export interface AnexoDocumento {
  nome: string;
  tipo: string;
  tamanho: number;
  dataUrl: string;
  enviadoEm: string;
}

export interface AnexosViagem {
  reservaHotel?: AnexoDocumento; // PDF de reserva de hotel
  qrCodeAcesso?: AnexoDocumento; // QR Code de acesso à obra
  voucherAereo?: AnexoDocumento; // Voucher aéreo
}

export interface DocumentoObrigatorioStatus {
  chave: ChaveAnexo;
  label: string;
  descricao: string;
  obrigatorio: boolean;
  anexado: boolean;
  anexo?: AnexoDocumento;
}

export type FlagStatus = 'concluida' | 'em_andamento' | 'pendente' | 'bloqueada' | 'na';

export interface EtapaFlagItem {
  id: string;
  titulo: string;
  subtitulo: string;
  status: FlagStatus;
  labelFlag: string;
}

export interface Colaborador {
  id: string;
  chapa: number;
  nome: string;
  funcao: string;
  operacao: Operacao;
  centroCusto?: string;
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
  passageiroNomeAvulso?: string;
  operacao?: Operacao;
  etapa: EtapaViagem;
  motivo: MotivoViagem;
  dataSolicitacao: string; // YYYY-MM-DD
  ida: string; // YYYY-MM-DD
  volta: string; // YYYY-MM-DD (vazio se somenteIda = true)
  somenteIda?: boolean;
  origem: string;
  destino: string;
  transporte: TipoTransporte;
  // Necessidades de transporte (Sim/Não)
  necessitaTaxi?: boolean;
  necessitaAereo?: boolean;
  necessitaRodoviario?: boolean;
  solicitante: string;
  custoPassagem: number | null;
  voucher: string;
  hospedagem: boolean;
  tipoHosp: TipoHospedagem;
  localHosp: string;
  checkInHosp?: string;
  checkOutHosp?: string;
  custoHospedagem: number | null;
  ocorrencia: OcorrenciaViagem;
  dataPrioritaria: boolean;
  folgaConforme: boolean;
  obs: string;
  // Dados de Ficha Padrão e Acesso à Obra
  fichaOrigem?: boolean;
  tipoColaborador?: TipoColaborador;
  centroCusto?: string;
  acessoObra?: boolean;
  obraLocal?: string;
  acessoEntrada?: string;
  acessoSaida?: string;
  qrCode?: boolean;
  motivoVisita?: string;
  diasNaObra?: number;
  enderecoVisitante?: string;
  // Anexos obrigatórios do fluxo de viagem
  anexos?: AnexosViagem;
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

export interface IndicadorCentroCusto {
  centroCusto: string;
  totalSolicitacoes: number;
  fichasPadrao: number;
  totalRealizadas: number;
  emAndamento: number;
  dentroDoPrazo: number;
  foraDoPrazo: number;
  remarcacoes: number;
  cancelamentos: number;
  custoPassagens: number;
  custoHospedagem: number;
  custoTotal: number;
  taxaSLA: number;
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
  totalFichasIntegradas: number;
  totalEmAndamentoDocsPendentes: number;
  porCentroCusto: IndicadorCentroCusto[];
}
