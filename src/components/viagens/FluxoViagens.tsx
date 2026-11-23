import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Plane,
  Check,
  Send,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Plus,
  Copy,
  Search,
  Calendar,
  X,
  Edit2,
  Ban,
  Flag,
  Paperclip,
  Upload,
  Lock,
  Unlock,
  Car,
  Bus,
} from 'lucide-react';
import { formatarDataBR, diffEmDias } from '../../utils/dateUtils';
import { formatarMoeda, parseMoeda } from '../../utils/formatters';
import {
  EtapaViagem,
  Viagem,
  OcorrenciaViagem,
  TipoHospedagem,
  Operacao,
  OPERACOES,
  AnexoDocumento,
  ChaveAnexo,
} from '../../types';
import {
  avaliarDocumentosViagem,
  obterNecessidadesTransporte,
  derivarTipoTransporte,
  lerArquivoComoAnexo,
} from '../../utils/viagemUtils';
import { EtapaAtualModal } from './EtapaAtualModal';
import { CalendarioViagens } from './CalendarioViagens';

export const FluxoViagens: React.FC = () => {
  const {
    viagens,
    colaboradores,
    avancarEtapaViagem,
    retrocederEtapaViagem,
    atualizarViagem,
    cancelarViagem,
    enviarLoteAprovacao,
    aprovadorNome,
    setAprovadorNome,
    criarViagem,
    hoje,
    isAdmin,
  } = useApp();

  const [modoVisualizacao, setModoVisualizacao] = useState<'tabela' | 'pipeline' | 'calendario'>('tabela');
  const [busca, setBusca] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<'todas' | EtapaViagem | 'canceladas'>('todas');
  const [viagensSelecionadas, setViagensSelecionadas] = useState<string[]>([]);
  const [alertaFluxo, setAlertaFluxo] = useState<string | null>(null);

  // Nova Janela: Etapa Atual
  const [etapaAtualViagemId, setEtapaAtualViagemId] = useState<string | null>(null);

  // Modal Passagem Comprada (com suporte a anexos)
  const [modalPassagemViagemId, setModalPassagemViagemId] = useState<string | null>(null);
  const [custoPassagemInput, setCustoPassagemInput] = useState('');
  const [voucherInput, setVoucherInput] = useState('');
  const [hospedagemInput, setHospedagemInput] = useState(false);
  const [tipoHospInput, setTipoHospInput] = useState<TipoHospedagem>('República');
  const [localHospInput, setLocalHospInput] = useState('');
  const [custoHospInput, setCustoHospInput] = useState('');
  const [anexosPassagemTemp, setAnexosPassagemTemp] = useState<Partial<Record<ChaveAnexo, AnexoDocumento>>>({});
  const [erroPassagem, setErroPassagem] = useState<string | null>(null);

  // Modal Envio Lote Aprovação
  const [modalAprovacaoTexto, setModalAprovacaoTexto] = useState<string | null>(null);
  const [copiadoTexto, setCopiadoTexto] = useState(false);
  const [avisoLoteVazio, setAvisoLoteVazio] = useState<string | null>(null);

  // Modal Nova / Editar Viagem
  const [modalEditarViagem, setModalEditarViagem] = useState<Viagem | null>(null);
  const [editarSomenteIdaDestravado, setEditarSomenteIdaDestravado] = useState(false);
  const [erroEdicaoViagem, setErroEdicaoViagem] = useState<string | null>(null);
  const [erroNovaViagem, setErroNovaViagem] = useState<string | null>(null);
  const [viagemParaCancelar, setViagemParaCancelar] = useState<Viagem | null>(null);
  const [modalNovaViagem, setModalNovaViagem] = useState(false);

  // Formulário Nova Viagem
  const [novaColabId, setNovaColabId] = useState('');
  const [novaOperacao, setNovaOperacao] = useState<Operacao>('UMCA');
  const [novaCentroCusto, setNovaCentroCusto] = useState('UMCA');
  const [novaIda, setNovaIda] = useState(hoje);
  const [novaVolta, setNovaVolta] = useState('');
  const [novaSomenteIda, setNovaSomenteIda] = useState(false);
  const [novaSomenteIdaDestravado, setNovaSomenteIdaDestravado] = useState(false);
  const [novaMotivo, setNovaMotivo] = useState<Viagem['motivo']>('Folga de campo');
  const [novaNecessitaTaxi, setNovaNecessitaTaxi] = useState(true);
  const [novaNecessitaAereo, setNovaNecessitaAereo] = useState(true);
  const [novaNecessitaRodoviario, setNovaNecessitaRodoviario] = useState(false);
  const [novaOrigem, setNovaOrigem] = useState('Parauapebas');
  const [novaDestino, setNovaDestino] = useState('');
  const [novaSolicitante, setNovaSolicitante] = useState('Logística UMCA');
  const [novaAcessoObra, setNovaAcessoObra] = useState(false);
  const [novaHospedagem, setNovaHospedagem] = useState(false);
  const [novaTipoHosp, setNovaTipoHosp] = useState<TipoHospedagem>('Hotel');
  const [novaLocalHosp, setNovaLocalHosp] = useState('');
  const [novaDataPrioritaria, setNovaDataPrioritaria] = useState(false);
  const [novaFolgaConforme, setNovaFolgaConforme] = useState(true);
  const [novaObs, setNovaObs] = useState('');

  const etapas: { id: EtapaViagem; nome: string; cor: string }[] = [
    { id: 'programada', nome: '1. Programada', cor: 'border-slate-300 text-slate-700 bg-slate-100' },
    { id: 'enviada', nome: '2. Enviada para Aprovação', cor: 'border-amber-300 text-amber-800 bg-amber-50' },
    { id: 'aprovada', nome: '3. Aprovada', cor: 'border-indigo-300 text-indigo-800 bg-indigo-50' },
    { id: 'comprada', nome: '4. Passagem Comprada', cor: 'border-blue-300 text-blue-800 bg-blue-50' },
    { id: 'realizada', nome: '5. Realizada', cor: 'border-emerald-300 text-emerald-800 bg-emerald-50' },
  ];

  const getColab = (cId: string) => colaboradores.find(c => c.id === cId);
  const getNomePassageiro = (v: Viagem) =>
    v.passageiroNomeAvulso || getColab(v.colabId)?.nome || 'Não identificado';

  // Filtragem
  const viagensFiltradas = useMemo(() => {
    return viagens.filter(v => {
      const colab = getColab(v.colabId);
      const nome = getNomePassageiro(v);
      const texto = `${nome} ${colab?.chapa || ''} ${v.origem} ${v.destino} ${v.voucher || ''} ${v.centroCusto || ''} ${v.operacao || ''}`.toLowerCase();
      const matchBusca = texto.includes(busca.toLowerCase());
      if (!matchBusca) return false;

      if (filtroEtapa === 'canceladas') {
        return v.ocorrencia === 'Cancelada';
      }
      if (v.ocorrencia === 'Cancelada') {
        return false;
      }
      if (filtroEtapa === 'todas') return true;
      return v.etapa === filtroEtapa;
    });
  }, [viagens, colaboradores, busca, filtroEtapa]);

  const abrirModalPassagem = (v: Viagem) => {
    setModalPassagemViagemId(v.id);
    setCustoPassagemInput(v.custoPassagem ? String(v.custoPassagem) : '');
    setVoucherInput(v.voucher || '');
    setHospedagemInput(v.hospedagem);
    setTipoHospInput(v.tipoHosp !== 'N.A' ? v.tipoHosp : 'Hotel');
    setLocalHospInput(v.localHosp !== 'N.A' ? v.localHosp : '');
    setCustoHospInput(v.custoHospedagem ? String(v.custoHospedagem) : '');
    setAnexosPassagemTemp({});
    setErroPassagem(null);
  };

  // Ação de avançar etapa com verificação de documentos obrigatórios
  const handleAvancarOK = (v: Viagem) => {
    setAlertaFluxo(null);
    if (v.etapa === 'aprovada') {
      abrirModalPassagem(v);
      return;
    }

    const res = avancarEtapaViagem(v.id);
    if (!res.ok && res.erro) {
      setAlertaFluxo(res.erro);
      // Abre automaticamente a janela Etapa Atual para o usuário anexar os documentos faltantes
      setEtapaAtualViagemId(v.id);
    }
  };

  const handleUploadNoModalPassagem = async (chave: ChaveAnexo, file?: File) => {
    if (!file) return;
    setErroPassagem(null);
    try {
      const anexo = await lerArquivoComoAnexo(file, hoje);
      setAnexosPassagemTemp(prev => ({ ...prev, [chave]: anexo }));
    } catch (err: any) {
      setErroPassagem(err?.message || 'Erro ao carregar arquivo.');
    }
  };

  const handleSalvarPassagemComprada = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPassagemViagemId) return;

    const custo = parseMoeda(custoPassagemInput);
    if (!custo || custo <= 0) {
      setErroPassagem('Por favor, informe o custo efetivo da passagem (R$). É obrigatório para emissão.');
      return;
    }
    if (!voucherInput.trim()) {
      setErroPassagem('Por favor, informe o número do Voucher ou Localizador da passagem.');
      return;
    }
    setErroPassagem(null);

    const res = avancarEtapaViagem(modalPassagemViagemId, {
      custoPassagem: custo,
      voucher: voucherInput.trim(),
      hospedagem: hospedagemInput,
      tipoHosp: hospedagemInput ? tipoHospInput : 'N.A',
      localHosp: hospedagemInput ? localHospInput : 'N.A',
      custoHospedagem: hospedagemInput && custoHospInput ? parseMoeda(custoHospInput) : null,
      anexosNovos: anexosPassagemTemp,
    });

    if (res.ok) {
      setModalPassagemViagemId(null);
    } else if (res.erro) {
      setErroPassagem(res.erro);
    }
  };

  // Enviar Lote para Aprovação
  const handleDispararEnvioAprovacao = () => {
    const idsParaEnviar =
      viagensSelecionadas.length > 0
        ? viagensSelecionadas
        : viagens.filter(v => v.etapa === 'programada' && v.ocorrencia !== 'Cancelada').map(v => v.id);

    if (idsParaEnviar.length === 0) {
      setAvisoLoteVazio('Nenhuma viagem na etapa "Programada" selecionada.');
      setTimeout(() => setAvisoLoteVazio(null), 3500);
      return;
    }

    const texto = enviarLoteAprovacao(idsParaEnviar);
    setModalAprovacaoTexto(texto);
    setViagensSelecionadas([]);
  };

  const copiarTextoAprovacao = () => {
    if (modalAprovacaoTexto) {
      navigator.clipboard.writeText(modalAprovacaoTexto);
      setCopiadoTexto(true);
      setTimeout(() => setCopiadoTexto(false), 2500);
    }
  };

  const handleAbrirNovaViagem = () => {
    const c = colaboradores[0];
    setNovaColabId(c?.id || '');
    setErroNovaViagem(null);
    setNovaSomenteIda(false);
    setNovaSomenteIdaDestravado(false);
    setNovaAcessoObra(false);
    setNovaHospedagem(false);
    setNovaTipoHosp('Hotel');
    setNovaLocalHosp('');
    if (c) {
      const op = c.operacao || 'UMCA';
      setNovaOperacao(op);
      setNovaCentroCusto(c.centroCusto || op);
      setNovaOrigem(c.origem);
      setNovaDestino(c.destino);
      setNovaNecessitaAereo(c.transporte.includes('Aéreo'));
      setNovaNecessitaRodoviario(c.transporte.includes('Rodoviário'));
      setNovaNecessitaTaxi(c.beneficios.toLowerCase().includes('táxi'));
      setNovaSolicitante(`Logística ${op}`);
      setNovaIda(hoje);
      setNovaVolta(new Date(new Date(hoje).getTime() + c.folga * 86400000).toISOString().split('T')[0]);
    }
    setModalNovaViagem(true);
  };

  const handleSalvarNovaViagem = (e: React.FormEvent) => {
    e.preventDefault();
    setErroNovaViagem(null);
    const efetivoSomenteIda = isAdmin && novaSomenteIdaDestravado ? novaSomenteIda : false;

    if (!novaColabId || !novaIda || (!efetivoSomenteIda && !novaVolta)) {
      setErroNovaViagem('Preencha os campos obrigatórios (Colaborador, Data de Ida e Volta).');
      return;
    }
    if (!efetivoSomenteIda && novaVolta < novaIda) {
      setErroNovaViagem('Validação: A data de volta não pode ser anterior à data de ida.');
      return;
    }
    if (!novaNecessitaAereo && !novaNecessitaRodoviario && !novaNecessitaTaxi) {
      setErroNovaViagem('Marque ao menos uma necessidade de transporte (Táxi, Aéreo ou Rodoviário).');
      return;
    }

    const colab = getColab(novaColabId);
    const transporte = derivarTipoTransporte(novaNecessitaAereo, novaNecessitaRodoviario);

    criarViagem({
      colabId: novaColabId,
      operacao: novaOperacao,
      etapa: 'programada',
      motivo: novaMotivo,
      dataSolicitacao: hoje,
      ida: novaIda,
      volta: efetivoSomenteIda ? '' : novaVolta,
      somenteIda: efetivoSomenteIda,
      origem: novaOrigem,
      destino: novaDestino,
      transporte,
      necessitaTaxi: novaNecessitaTaxi,
      necessitaAereo: novaNecessitaAereo,
      necessitaRodoviario: novaNecessitaRodoviario,
      solicitante: novaSolicitante,
      custoPassagem: null,
      voucher: '',
      hospedagem: novaHospedagem,
      tipoHosp: novaHospedagem ? novaTipoHosp : 'N.A',
      localHosp: novaHospedagem ? novaLocalHosp || 'A definir' : 'N.A',
      custoHospedagem: null,
      ocorrencia: 'Sem alteração',
      dataPrioritaria: novaDataPrioritaria,
      folgaConforme: novaFolgaConforme,
      obs: novaObs,
      tipoColaborador: colab?.tipo || 'U&M',
      centroCusto: (novaCentroCusto || novaOperacao).trim().toUpperCase(),
      acessoObra: novaAcessoObra,
      obraLocal: novaAcessoObra ? novaOperacao : undefined,
      qrCode: novaAcessoObra,
      anexos: {},
    });

    setModalNovaViagem(false);
  };

  const handleAbrirEditarViagem = (v: Viagem) => {
    const { necessitaTaxi, necessitaAereo, necessitaRodoviario } = obterNecessidadesTransporte(v);
    setModalEditarViagem({
      ...v,
      necessitaTaxi,
      necessitaAereo,
      necessitaRodoviario,
      somenteIda: Boolean(v.somenteIda),
    });
    setEditarSomenteIdaDestravado(false);
    setErroEdicaoViagem(null);
  };

  const handleSalvarEdicaoViagem = (e: React.FormEvent) => {
    e.preventDefault();
    setErroEdicaoViagem(null);
    if (!modalEditarViagem) return;
    const efetivoSomenteIda =
      isAdmin && editarSomenteIdaDestravado ? Boolean(modalEditarViagem.somenteIda) : false;

    if (!efetivoSomenteIda && (!modalEditarViagem.volta || modalEditarViagem.volta < modalEditarViagem.ida)) {
      setErroEdicaoViagem('Validação: Informe uma data de volta igual ou posterior à data de ida.');
      return;
    }

    const transporte = derivarTipoTransporte(
      Boolean(modalEditarViagem.necessitaAereo),
      Boolean(modalEditarViagem.necessitaRodoviario)
    );

    const res = atualizarViagem(modalEditarViagem.id, {
      ...modalEditarViagem,
      somenteIda: efetivoSomenteIda,
      volta: efetivoSomenteIda ? '' : modalEditarViagem.volta,
      transporte,
    });

    if (!res.ok && res.erro) {
      setErroEdicaoViagem(res.erro);
      return;
    }

    setModalEditarViagem(null);
  };

  const viagemEtapaAtualSelecionada = etapaAtualViagemId
    ? viagens.find(v => v.id === etapaAtualViagemId) || null
    : null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Aba Oficial
              </span>
              <span className="text-xs text-slate-500 font-mono">
                BASE_INDICADORES · Fluxo, Anexos & Calendário de Planejamento
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Gestão de Viagens, Planejamento & Etapa Atual
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Acompanhe cada viagem com flags na janela <strong>Etapa Atual</strong>, anexe documentos obrigatórios (PDF Hotel, QR Code, Voucher Aéreo) e otimize voos/táxis no <strong>Calendário</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDispararEnvioAprovacao}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-sm transition-all cursor-pointer"
              title="Gera tabela de aprovação para o RH / Gestão e avança para 'Enviada'"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>Enviar para Aprovação {viagensSelecionadas.length > 0 ? `(${viagensSelecionadas.length})` : '(Lote)'}</span>
            </button>

            <button
              onClick={handleAbrirNovaViagem}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Nova Viagem</span>
            </button>
          </div>
        </div>

        {avisoLoteVazio && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{avisoLoteVazio}</span>
          </div>
        )}

        {alertaFluxo && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{alertaFluxo}</span>
            </div>
            <button
              type="button"
              onClick={() => setAlertaFluxo(null)}
              className="text-rose-500 hover:text-rose-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Controles de Filtro e Modos de Visualização (Tabela | Esteira Kanban | Calendário) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          {/* Filtros de Etapa */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFiltroEtapa('todas')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filtroEtapa === 'todas'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todas Ativas ({viagens.filter(v => v.ocorrencia !== 'Cancelada').length})
            </button>

            {etapas.map(e => {
              const count = viagens.filter(v => v.etapa === e.id && v.ocorrencia !== 'Cancelada').length;
              return (
                <button
                  key={e.id}
                  onClick={() => setFiltroEtapa(e.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                    filtroEtapa === e.id
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {e.nome} ({count})
                </button>
              );
            })}

            <button
              onClick={() => setFiltroEtapa('canceladas')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                filtroEtapa === 'canceladas'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              Canceladas ({viagens.filter(v => v.ocorrencia === 'Cancelada').length})
            </button>
          </div>

          {/* Busca e Alternância Tabela / Kanban / Calendário */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar nome, CC, trecho..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setModoVisualizacao('tabela')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  modoVisualizacao === 'tabela' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tabela
              </button>
              <button
                onClick={() => setModoVisualizacao('pipeline')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  modoVisualizacao === 'pipeline' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kanban
              </button>
              <button
                onClick={() => setModoVisualizacao('calendario')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  modoVisualizacao === 'calendario' ? 'bg-blue-600 text-white shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Calendário</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visão 3: Calendário de Planejamento de Viagens */}
      {modoVisualizacao === 'calendario' && (
        <CalendarioViagens
          viagens={viagensFiltradas}
          colaboradores={colaboradores}
          hoje={hoje}
          onAbrirEtapaAtual={v => setEtapaAtualViagemId(v.id)}
        />
      )}

      {/* Visão 1: Tabela Completa */}
      {modoVisualizacao === 'tabela' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        viagensSelecionadas.length > 0 &&
                        viagensSelecionadas.length === viagensFiltradas.filter(v => v.etapa === 'programada').length
                      }
                      onChange={e => {
                        if (e.target.checked) {
                          setViagensSelecionadas(
                            viagensFiltradas.filter(v => v.etapa === 'programada').map(v => v.id)
                          );
                        } else {
                          setViagensSelecionadas([]);
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Selecionar viagens programadas"
                    />
                  </th>
                  <th className="py-3 px-3">Colaborador / CC</th>
                  <th className="py-3 px-3">Etapa Atual (Flags)</th>
                  <th className="py-3 px-3">Data Ida / Volta</th>
                  <th className="py-3 px-3">Trecho & Necessidades</th>
                  <th className="py-3 px-3">Docs & Anexos</th>
                  <th className="py-3 px-3">Prazo</th>
                  <th className="py-3 px-3">Custos</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viagensFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500">
                      Nenhuma viagem encontrada para este filtro.
                    </td>
                  </tr>
                ) : (
                  viagensFiltradas.map(v => {
                    const colab = getColab(v.colabId);
                    const nomeExib = getNomePassageiro(v);
                    const antecedencia = diffEmDias(v.ida, v.dataSolicitacao);
                    const dentroDoPrazo = antecedencia >= 20;
                    const isCancelada = v.ocorrencia === 'Cancelada';
                    const avaliacao = avaliarDocumentosViagem(v);
                    const { necessitaTaxi, necessitaAereo, necessitaRodoviario } = obterNecessidadesTransporte(v);
                    const anexosCount = Object.values(v.anexos || {}).filter(Boolean).length;

                    return (
                      <tr
                        key={v.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isCancelada
                            ? 'bg-rose-50/20 opacity-70'
                            : v.etapa === 'realizada'
                            ? 'bg-emerald-50/15'
                            : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-3">
                          {v.etapa === 'programada' && !isCancelada && (
                            <input
                              type="checkbox"
                              checked={viagensSelecionadas.includes(v.id)}
                              onChange={e => {
                                if (e.target.checked) {
                                  setViagensSelecionadas(prev => [...prev, v.id]);
                                } else {
                                  setViagensSelecionadas(prev => prev.filter(id => id !== v.id));
                                }
                              }}
                              className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          )}
                        </td>

                        {/* Colaborador & Centro de Custo */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{nomeExib}</div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                              CC: {v.centroCusto || v.operacao || 'UMCA'}
                            </span>
                            {colab && <span className="font-mono">Chapa {colab.chapa}</span>}
                            <span>· {v.motivo}</span>
                          </div>
                        </td>

                        {/* Etapa Atual (Flags + Botão Janela) */}
                        <td className="py-3 px-3 min-w-[175px]">
                          <button
                            type="button"
                            onClick={() => setEtapaAtualViagemId(v.id)}
                            className="group text-left w-full p-1.5 -m-1.5 rounded-lg hover:bg-blue-50/70 transition-colors cursor-pointer"
                            title="Abrir janela Etapa Atual (Flags e Anexos)"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                  avaliacao.statusProcesso === 'concluida'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : avaliacao.statusProcesso === 'cancelada'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : avaliacao.pendentes.length > 0 && v.etapa === 'comprada'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}
                              >
                                <Flag className="w-3 h-3" />
                                <span className="capitalize">{v.etapa}</span>
                              </span>
                            </div>
                            <div className="text-[10px] font-semibold text-blue-700 group-hover:underline mt-1 flex items-center gap-1">
                              <span>{avaliacao.statusProcessoTexto}</span>
                            </div>
                          </button>
                        </td>

                        {/* Data Ida / Volta */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-mono font-medium text-slate-900">
                            {formatarDataBR(v.ida)} &rarr; {v.somenteIda ? 'Somente Ida' : formatarDataBR(v.volta)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Solicitado em {formatarDataBR(v.dataSolicitacao)}
                          </div>
                        </td>

                        {/* Trecho & Necessidades (Táxi / Aéreo / Rodoviário) */}
                        <td className="py-3 px-3">
                          <div className="text-slate-800 font-medium whitespace-nowrap">
                            {v.origem} &rarr; {v.destino}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1 text-[10px] font-semibold">
                            {necessitaAereo && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                Aéreo
                              </span>
                            )}
                            {necessitaTaxi && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                Táxi
                              </span>
                            )}
                            {necessitaRodoviario && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Rodov.
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Documentos & Anexos */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEtapaAtualViagemId(v.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                              avaliacao.todosObrigatoriosAnexados
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Clique para gerenciar anexos (PDF Reserva Hotel, QR Code, Voucher Aéreo)"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>
                              {avaliacao.obrigatorios.length === 0
                                ? `${anexosCount} anexo(s)`
                                : `${avaliacao.obrigatorios.length - avaliacao.pendentes.length}/${avaliacao.obrigatorios.length} obrig.`}
                            </span>
                          </button>
                          {v.voucher && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[120px]">
                              {v.voucher}
                            </div>
                          )}
                        </td>

                        {/* Prazo */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                              dentroDoPrazo
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                            }`}
                          >
                            {dentroDoPrazo ? 'No prazo' : 'Fora prazo'} ({antecedencia}d)
                          </span>
                          {v.ocorrencia !== 'Sem alteração' && (
                            <div className="mt-1">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  v.ocorrencia === 'Remarcada'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {v.ocorrencia}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Custos */}
                        <td className="py-3 px-3 font-mono whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {v.custoPassagem ? formatarMoeda(v.custoPassagem) : 'R$ —'}
                          </div>
                          {v.hospedagem && v.custoHospedagem ? (
                            <div className="text-[11px] text-slate-500">
                              Hosp: {formatarMoeda(v.custoHospedagem)}
                            </div>
                          ) : null}
                        </td>

                        {/* Ações */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEtapaAtualViagemId(v.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                              title="Abrir janela Etapa Atual (Flags e Anexos)"
                            >
                              <Flag className="w-3 h-3" />
                              <span>Etapa Atual</span>
                            </button>

                            {!isCancelada && v.etapa !== 'realizada' && (
                              <button
                                onClick={() => handleAvancarOK(v)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs transition-colors cursor-pointer ${
                                  v.etapa === 'comprada' && !avaliacao.todosObrigatoriosAnexados
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                                title={
                                  v.etapa === 'comprada' && !avaliacao.todosObrigatoriosAnexados
                                    ? 'Anexe os documentos obrigatórios para concluir'
                                    : 'Avançar para a próxima etapa (OK)'
                                }
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>OK</span>
                              </button>
                            )}

                            {v.etapa === 'realizada' && !isCancelada && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 px-2 py-1 bg-emerald-50 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Concluída</span>
                              </span>
                            )}

                            <button
                              onClick={() => handleAbrirEditarViagem(v)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Editar dados da viagem"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {!isCancelada && (
                              <button
                                onClick={() => setViagemParaCancelar(v)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Cancelar viagem"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visão 2: Esteira Kanban */}
      {modoVisualizacao === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {etapas.map((etapa, idx) => {
            const viagensNestaEtapa = viagensFiltradas.filter(
              v => v.etapa === etapa.id && v.ocorrencia !== 'Cancelada'
            );

            return (
              <div
                key={etapa.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col min-h-[500px]"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900">{etapa.nome}</span>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    {viagensNestaEtapa.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {viagensNestaEtapa.length === 0 ? (
                    <div className="h-28 flex items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg">
                      Nenhuma nesta etapa
                    </div>
                  ) : (
                    viagensNestaEtapa.map(v => {
                      const colab = getColab(v.colabId);
                      const nomeExib = getNomePassageiro(v);
                      const antecedencia = diffEmDias(v.ida, v.dataSolicitacao);
                      const dentroDoPrazo = antecedencia >= 20;
                      const avaliacao = avaliarDocumentosViagem(v);

                      return (
                        <div
                          key={v.id}
                          className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2 hover:border-blue-400 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="font-semibold text-xs text-slate-900">{nomeExib}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                CC: {v.centroCusto || v.operacao || 'UMCA'}
                                {colab ? ` · Chapa ${colab.chapa}` : ''}
                              </div>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                dentroDoPrazo ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {dentroDoPrazo ? '≥20d' : '<20d'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded font-mono">
                            <div>Ida: {formatarDataBR(v.ida)}</div>
                            <div>Volta: {v.somenteIda ? 'Somente Ida' : formatarDataBR(v.volta)}</div>
                          </div>

                          <div className="text-[11px] text-slate-700 font-medium">
                            {v.origem} &rarr; {v.destino}
                          </div>

                          {/* Flag de Documentos */}
                          <button
                            type="button"
                            onClick={() => setEtapaAtualViagemId(v.id)}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                              avaliacao.todosObrigatoriosAnexados
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <Flag className="w-3 h-3" />
                              <span>Etapa Atual</span>
                            </span>
                            <span>
                              {avaliacao.todosObrigatoriosAnexados
                                ? 'Docs OK'
                                : `${avaliacao.pendentes.length} pend.`}
                            </span>
                          </button>

                          {v.custoPassagem && (
                            <div className="text-xs font-mono font-bold text-slate-900">
                              {formatarMoeda(v.custoPassagem)}
                            </div>
                          )}

                          <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                            {idx > 0 && (
                              <button
                                onClick={() => retrocederEtapaViagem(v.id)}
                                className="text-[10px] text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Voltar etapa anterior"
                              >
                                &larr; Voltar
                              </button>
                            )}

                            {etapa.id !== 'realizada' && (
                              <button
                                onClick={() => handleAvancarOK(v)}
                                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                                <span>OK</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NOVA JANELA: ETAPA ATUAL (Flags + Anexos Obrigatórios) */}
      {viagemEtapaAtualSelecionada && (
        <EtapaAtualModal
          viagem={viagemEtapaAtualSelecionada}
          colaborador={getColab(viagemEtapaAtualSelecionada.colabId)}
          onClose={() => setEtapaAtualViagemId(null)}
          onSolicitarModalPassagem={v => {
            setEtapaAtualViagemId(null);
            abrirModalPassagem(v);
          }}
        />
      )}

      {/* MODAL 1: Passagem Comprada (com upload de PDF Hotel, QR Code e Voucher Aéreo) */}
      {modalPassagemViagemId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Registrar Passagem Comprada</h3>
                  <p className="text-xs text-slate-500">Etapa 4: Custos, localizador e anexos do fluxo</p>
                </div>
              </div>
              <button
                onClick={() => setModalPassagemViagemId(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarPassagemComprada} className="space-y-4 text-xs">
              {erroPassagem && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{erroPassagem}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Custo da Passagem (R$) *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1450,80"
                    value={custoPassagemInput}
                    onChange={e => setCustoPassagemInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Voucher / Localizador *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: AZUL-7789A"
                    value={voucherInput}
                    onChange={e => setVoucherInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Opções de Hospedagem */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hospedagemInput}
                    onChange={e => setHospedagemInput(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-800">Inclui reserva de hospedagem</span>
                </label>

                {hospedagemInput && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-600 mb-0.5">Tipo</label>
                        <select
                          value={tipoHospInput}
                          onChange={e => setTipoHospInput(e.target.value as TipoHospedagem)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-900"
                        >
                          <option value="Hotel">Hotel</option>
                          <option value="República">República</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-600 mb-0.5">Custo Hospedagem (R$)</label>
                        <input
                          type="text"
                          placeholder="Ex: 350,00"
                          value={custoHospInput}
                          onChange={e => setCustoHospInput(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs font-mono text-slate-900"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5">Local / Nome do Hotel ou República</label>
                      <input
                        type="text"
                        placeholder="Ex: Hotel Ibis Marabá ou República UMCA Quarto 2"
                        value={localHospInput}
                        onChange={e => setLocalHospInput(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Upload de Documentos direto na Emissão */}
              <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-200 space-y-2.5">
                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Anexar Documentos do Fluxo (PDF / Imagem)</span>
                </div>
                {(
                  [
                    { chave: 'voucherAereo', label: 'Voucher Aéreo' },
                    { chave: 'reservaHotel', label: 'PDF de Reserva de Hotel' },
                    { chave: 'qrCodeAcesso', label: 'QR Code de Acesso' },
                  ] as { chave: ChaveAnexo; label: string }[]
                ).map(item => {
                  const arq = anexosPassagemTemp[item.chave];
                  return (
                    <div
                      key={item.chave}
                      className="flex items-center justify-between gap-2 bg-white px-2.5 py-2 rounded border border-slate-200"
                    >
                      <div className="truncate">
                        <div className="font-semibold text-slate-800">{item.label}</div>
                        {arq ? (
                          <div className="text-[10px] font-mono text-emerald-700 truncate">{arq.nome}</div>
                        ) : (
                          <div className="text-[10px] text-slate-400">Nenhum arquivo selecionado</div>
                        )}
                      </div>
                      <label className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer shrink-0">
                        <Upload className="w-3 h-3" />
                        <span>{arq ? 'Trocar' : 'Anexar'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadNoModalPassagem(item.chave, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalPassagemViagemId(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                >
                  Confirmar Emissão da Passagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Resumo e Texto de Envio para Aprovação */}
      {modalAprovacaoTexto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Lote Enviado para Aprovação</h3>
                  <p className="text-xs text-slate-500">
                    As viagens selecionadas mudaram para a etapa "Enviada para aprovação"
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAprovacaoTexto(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Aprovador Configurado:
                </label>
                <input
                  type="text"
                  value={aprovadorNome}
                  onChange={e => setAprovadorNome(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Texto Gerado para Envio (WhatsApp / E-mail / Teams):
                  </label>
                  <button
                    onClick={copiarTextoAprovacao}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiadoTexto ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={modalAprovacaoTexto}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-mono text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalAprovacaoTexto(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Nova Viagem Manual (com Somente Ida travado + Necessidades Sim/Não + CC) */}
      {modalNovaViagem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Nova Programação de Viagem</h3>
                  <p className="text-xs text-slate-500">Inicia na etapa 'Programada' e integra ao Calendário & Indicadores</p>
                </div>
              </div>
              <button
                onClick={() => setModalNovaViagem(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovaViagem} className="space-y-3 text-xs">
              {erroNovaViagem && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{erroNovaViagem}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Colaborador *</label>
                  <select
                    value={novaColabId}
                    onChange={e => {
                      setNovaColabId(e.target.value);
                      const c = getColab(e.target.value);
                      if (c) {
                        const op = c.operacao || 'UMCA';
                        setNovaOperacao(op);
                        setNovaCentroCusto(c.centroCusto || op);
                        setNovaOrigem(c.origem);
                        setNovaDestino(c.destino);
                        setNovaNecessitaAereo(c.transporte.includes('Aéreo'));
                        setNovaNecessitaRodoviario(c.transporte.includes('Rodoviário'));
                        setNovaNecessitaTaxi(c.beneficios.toLowerCase().includes('táxi'));
                        setNovaSolicitante(`Logística ${op}`);
                        setNovaVolta(
                          new Date(new Date(novaIda).getTime() + c.folga * 86400000).toISOString().split('T')[0]
                        );
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900"
                    required
                  >
                    {colaboradores.map(c => (
                      <option key={c.id} value={c.id}>
                        [{c.operacao || 'UMCA'}] {c.nome} (Chapa {c.chapa})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operação</label>
                  <select
                    value={novaOperacao}
                    onChange={e => {
                      const op = e.target.value as Operacao;
                      setNovaOperacao(op);
                      setNovaCentroCusto(op);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900"
                  >
                    {OPERACOES.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Centro de Custo</label>
                  <input
                    type="text"
                    value={novaCentroCusto}
                    onChange={e => setNovaCentroCusto(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data de Ida *</label>
                  <input
                    type="date"
                    value={novaIda}
                    onChange={e => setNovaIda(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Data de Volta {novaSomenteIda ? '(N.A)' : '*'}
                  </label>
                  <input
                    type="date"
                    value={novaSomenteIda ? '' : novaVolta}
                    onChange={e => setNovaVolta(e.target.value)}
                    disabled={novaSomenteIda}
                    className={`w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs ${
                      novaSomenteIda ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-slate-900'
                    }`}
                    required={!novaSomenteIda}
                  />
                </div>
                {/* Campo Travado: Somente Ida */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 flex items-center gap-1">
                      {isAdmin && novaSomenteIdaDestravado ? (
                        <Unlock className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Lock className="w-3 h-3 text-amber-600" />
                      )}
                      <span>Somente Ida</span>
                    </label>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (novaSomenteIdaDestravado) {
                            setNovaSomenteIda(false);
                            setNovaSomenteIdaDestravado(false);
                          } else {
                            setNovaSomenteIdaDestravado(true);
                          }
                        }}
                        className="text-[10px] text-blue-600 font-bold underline cursor-pointer"
                      >
                        {novaSomenteIdaDestravado ? 'Travar' : 'Destravar'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-semibold">Travado</span>
                    )}
                  </div>
                  <select
                    value={novaSomenteIda ? 'Sim' : 'Não'}
                    onChange={e => setNovaSomenteIda(e.target.value === 'Sim')}
                    disabled={!(isAdmin && novaSomenteIdaDestravado)}
                    className={`w-full border rounded-lg px-2 py-1.5 font-semibold ${
                      isAdmin && novaSomenteIdaDestravado
                        ? 'bg-white border-emerald-400 text-slate-900'
                        : 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <option value="Não">Não (Travado)</option>
                    <option value="Sim">Sim (Somente Ida)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Origem</label>
                  <input
                    type="text"
                    value={novaOrigem}
                    onChange={e => setNovaOrigem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destino</label>
                  <input
                    type="text"
                    value={novaDestino}
                    onChange={e => setNovaDestino(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Necessidades de Transporte (Sim / Não) */}
              <div className="grid grid-cols-3 gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-amber-600" />
                    <span>Necessita táxi?</span>
                  </label>
                  <select
                    value={novaNecessitaTaxi ? 'Sim' : 'Não'}
                    onChange={e => setNovaNecessitaTaxi(e.target.value === 'Sim')}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-semibold text-slate-900"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Plane className="w-3.5 h-3.5 text-blue-600" />
                    <span>Necessita aéreo?</span>
                  </label>
                  <select
                    value={novaNecessitaAereo ? 'Sim' : 'Não'}
                    onChange={e => setNovaNecessitaAereo(e.target.value === 'Sim')}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-semibold text-slate-900"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Bus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Rodoviário?</span>
                  </label>
                  <select
                    value={novaNecessitaRodoviario ? 'Sim' : 'Não'}
                    onChange={e => setNovaNecessitaRodoviario(e.target.value === 'Sim')}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-semibold text-slate-900"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Motivo</label>
                  <select
                    value={novaMotivo}
                    onChange={e => setNovaMotivo(e.target.value as Viagem['motivo'])}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900"
                  >
                    <option value="Folga de campo">Folga de campo</option>
                    <option value="Consultoria">Consultoria</option>
                    <option value="Treinamento">Treinamento</option>
                    <option value="Visita técnica">Visita técnica</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Solicitante</label>
                  <input
                    type="text"
                    value={novaSolicitante}
                    onChange={e => setNovaSolicitante(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Hospedagem & Acesso à Obra */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaHospedagem}
                    onChange={e => setNovaHospedagem(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">Reserva de Hospedagem</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaAcessoObra}
                    onChange={e => setNovaAcessoObra(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">Acesso à Obra (QR Code)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaDataPrioritaria}
                    onChange={e => setNovaDataPrioritaria(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">Data Prioritária</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaFolgaConforme}
                    onChange={e => setNovaFolgaConforme(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-semibold text-slate-700">Folga Conforme</span>
                </label>
              </div>

              {novaHospedagem && (
                <div className="grid grid-cols-2 gap-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tipo Hospedagem</label>
                    <select
                      value={novaTipoHosp}
                      onChange={e => setNovaTipoHosp(e.target.value as TipoHospedagem)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-900"
                    >
                      <option value="Hotel">Hotel (exige PDF reserva)</option>
                      <option value="República">República</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Local Hospedagem</label>
                    <input
                      type="text"
                      value={novaLocalHosp}
                      onChange={e => setNovaLocalHosp(e.target.value)}
                      placeholder="Ex: Hotel Ibis Parauapebas"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações</label>
                <input
                  type="text"
                  placeholder="Ex: agrupar táxi com equipe do turno A"
                  value={novaObs}
                  onChange={e => setNovaObs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNovaViagem(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Criar Viagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Editar Viagem */}
      {modalEditarViagem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Editar Viagem</h3>
              <button
                onClick={() => setModalEditarViagem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoViagem} className="space-y-3 text-xs">
              {erroEdicaoViagem && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{erroEdicaoViagem}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data de Ida</label>
                  <input
                    type="date"
                    value={modalEditarViagem.ida}
                    onChange={e => setModalEditarViagem({ ...modalEditarViagem, ida: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data de Volta</label>
                  <input
                    type="date"
                    value={modalEditarViagem.somenteIda ? '' : modalEditarViagem.volta}
                    onChange={e => setModalEditarViagem({ ...modalEditarViagem, volta: e.target.value })}
                    disabled={Boolean(modalEditarViagem.somenteIda)}
                    className={`w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono ${
                      modalEditarViagem.somenteIda ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-slate-900'
                    }`}
                    required={!modalEditarViagem.somenteIda}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700 flex items-center gap-1">
                      {isAdmin && editarSomenteIdaDestravado ? (
                        <Unlock className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Lock className="w-3 h-3 text-amber-600" />
                      )}
                      <span>Somente Ida</span>
                    </label>
                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => setEditarSomenteIdaDestravado(!editarSomenteIdaDestravado)}
                        className="text-[10px] font-bold text-blue-600 underline cursor-pointer"
                      >
                        {editarSomenteIdaDestravado ? 'Travar' : 'Destravar'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-semibold">Travado</span>
                    )}
                  </div>
                  <select
                    value={modalEditarViagem.somenteIda ? 'Sim' : 'Não'}
                    onChange={e =>
                      setModalEditarViagem({ ...modalEditarViagem, somenteIda: e.target.value === 'Sim' })
                    }
                    disabled={!(isAdmin && editarSomenteIdaDestravado)}
                    className={`w-full border rounded px-2 py-1.5 font-semibold ${
                      isAdmin && editarSomenteIdaDestravado
                        ? 'bg-white border-emerald-400 text-slate-900'
                        : 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <option value="Não">Não (Travado)</option>
                    <option value="Sim">Sim (Somente Ida)</option>
                  </select>
                </div>
              </div>

              {/* Necessidades de Transporte (Sim / Não) */}
              <div className="grid grid-cols-3 gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Necessita táxi?</label>
                  <select
                    value={modalEditarViagem.necessitaTaxi ? 'Sim' : 'Não'}
                    onChange={e =>
                      setModalEditarViagem({ ...modalEditarViagem, necessitaTaxi: e.target.value === 'Sim' })
                    }
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Necessita aéreo?</label>
                  <select
                    value={modalEditarViagem.necessitaAereo ? 'Sim' : 'Não'}
                    onChange={e =>
                      setModalEditarViagem({ ...modalEditarViagem, necessitaAereo: e.target.value === 'Sim' })
                    }
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rodoviário?</label>
                  <select
                    value={modalEditarViagem.necessitaRodoviario ? 'Sim' : 'Não'}
                    onChange={e =>
                      setModalEditarViagem({
                        ...modalEditarViagem,
                        necessitaRodoviario: e.target.value === 'Sim',
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900"
                  >
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Centro de Custo</label>
                  <input
                    type="text"
                    value={modalEditarViagem.centroCusto || ''}
                    onChange={e =>
                      setModalEditarViagem({ ...modalEditarViagem, centroCusto: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Voucher / Localizador</label>
                  <input
                    type="text"
                    value={modalEditarViagem.voucher}
                    onChange={e => setModalEditarViagem({ ...modalEditarViagem, voucher: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custo Passagem (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={modalEditarViagem.custoPassagem ?? ''}
                    onChange={e =>
                      setModalEditarViagem({
                        ...modalEditarViagem,
                        custoPassagem: parseFloat(e.target.value) || null,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ocorrência</label>
                  <select
                    value={modalEditarViagem.ocorrencia}
                    onChange={e =>
                      setModalEditarViagem({
                        ...modalEditarViagem,
                        ocorrencia: e.target.value as OcorrenciaViagem,
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-900"
                  >
                    <option value="Sem alteração">Sem alteração</option>
                    <option value="Remarcada">Remarcada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Etapa Atual</label>
                  <select
                    value={modalEditarViagem.etapa}
                    onChange={e =>
                      setModalEditarViagem({ ...modalEditarViagem, etapa: e.target.value as EtapaViagem })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-900"
                  >
                    <option value="programada">1. Programada</option>
                    <option value="enviada">2. Enviada para aprovação</option>
                    <option value="aprovada">3. Aprovada</option>
                    <option value="comprada">4. Passagem comprada</option>
                    <option value="realizada">5. Realizada (exige docs obrigatórios)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações</label>
                <input
                  type="text"
                  value={modalEditarViagem.obs}
                  onChange={e => setModalEditarViagem({ ...modalEditarViagem, obs: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEditarViagem(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Cancelar Viagem */}
      {viagemParaCancelar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600">
              <Ban className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">Cancelar Viagem</h3>
            </div>
            <p className="text-xs text-slate-600">
              Deseja cancelar a viagem de <strong>{getNomePassageiro(viagemParaCancelar)}</strong>? Ela sairá do fluxo ativo e dos custos nos indicadores.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViagemParaCancelar(null)}
                className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  cancelarViagem(viagemParaCancelar.id);
                  setViagemParaCancelar(null);
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs cursor-pointer"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
