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
  Building,
  Home,
  Clock,
  ArrowRight,
  Filter,
  Search,
  Calendar,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  Ban,
  FileSpreadsheet,
} from 'lucide-react';
import { formatarDataBR, diffEmDias } from '../../utils/dateUtils';
import { formatarMoeda, parseMoeda } from '../../utils/formatters';
import { EtapaViagem, Viagem, OcorrenciaViagem, TipoHospedagem } from '../../types';

export const FluxoViagens: React.FC = () => {
  const {
    viagens,
    colaboradores,
    avancarEtapaViagem,
    retrocederEtapaViagem,
    atualizarViagem,
    removerViagem,
    cancelarViagem,
    enviarLoteAprovacao,
    aprovadorNome,
    setAprovadorNome,
    criarViagem,
    hoje,
  } = useApp();

  const [modoVisualizacao, setModoVisualizacao] = useState<'tabela' | 'pipeline'>('tabela');
  const [busca, setBusca] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<'todas' | EtapaViagem | 'canceladas'>('todas');
  const [viagensSelecionadas, setViagensSelecionadas] = useState<string[]>([]);

  // Modais
  const [modalPassagemViagemId, setModalPassagemViagemId] = useState<string | null>(null);
  const [custoPassagemInput, setCustoPassagemInput] = useState('');
  const [voucherInput, setVoucherInput] = useState('');
  const [hospedagemInput, setHospedagemInput] = useState(false);
  const [tipoHospInput, setTipoHospInput] = useState<TipoHospedagem>('República');
  const [localHospInput, setLocalHospInput] = useState('');
  const [custoHospInput, setCustoHospInput] = useState('');
  const [erroPassagem, setErroPassagem] = useState<string | null>(null);

  // Modal Envio Lote Aprovação
  const [modalAprovacaoTexto, setModalAprovacaoTexto] = useState<string | null>(null);
  const [copiadoTexto, setCopiadoTexto] = useState(false);
  const [avisoLoteVazio, setAvisoLoteVazio] = useState<string | null>(null);

  // Modal Nova / Editar Viagem
  const [modalEditarViagem, setModalEditarViagem] = useState<Viagem | null>(null);
  const [erroEdicaoViagem, setErroEdicaoViagem] = useState<string | null>(null);
  const [erroNovaViagem, setErroNovaViagem] = useState<string | null>(null);
  const [viagemParaCancelar, setViagemParaCancelar] = useState<Viagem | null>(null);
  const [modalNovaViagem, setModalNovaViagem] = useState(false);

  // Formulário Nova Viagem
  const [novaColabId, setNovaColabId] = useState('');
  const [novaIda, setNovaIda] = useState(hoje);
  const [novaVolta, setNovaVolta] = useState('');
  const [novaMotivo, setNovaMotivo] = useState<Viagem['motivo']>('Folga de campo');
  const [novaTransporte, setNovaTransporte] = useState<Viagem['transporte']>('Aéreo');
  const [novaOrigem, setNovaOrigem] = useState('Parauapebas');
  const [novaDestino, setNovaDestino] = useState('');
  const [novaSolicitante, setNovaSolicitante] = useState('Logística UMCA');
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

  // Helper para buscar colaborador
  const getColab = (cId: string) => colaboradores.find(c => c.id === cId);

  // Filtragem
  const viagensFiltradas = useMemo(() => {
    return viagens.filter(v => {
      const colab = getColab(v.colabId);
      const texto = `${colab?.nome || ''} ${colab?.chapa || ''} ${v.origem} ${v.destino} ${v.voucher || ''}`.toLowerCase();
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

  // Ação de avançar etapa com verificação
  const handleAvancarOK = (v: Viagem) => {
    if (v.etapa === 'aprovada') {
      // Próxima é "comprada" -> Abre modal de preenchimento obrigatório de custos
      setModalPassagemViagemId(v.id);
      setCustoPassagemInput(v.custoPassagem ? String(v.custoPassagem) : '');
      setVoucherInput(v.voucher || '');
      setHospedagemInput(v.hospedagem);
      setTipoHospInput(v.tipoHosp || 'República');
      setLocalHospInput(v.localHosp || '');
      setCustoHospInput(v.custoHospedagem ? String(v.custoHospedagem) : '');
      return;
    }

    avancarEtapaViagem(v.id);
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

    const sucesso = avancarEtapaViagem(modalPassagemViagemId, {
      custoPassagem: custo,
      voucher: voucherInput.trim(),
      hospedagem: hospedagemInput,
      tipoHosp: hospedagemInput ? tipoHospInput : 'N.A',
      localHosp: hospedagemInput ? localHospInput : 'N.A',
      custoHospedagem: hospedagemInput && custoHospInput ? parseMoeda(custoHospInput) : null,
    });

    if (sucesso) {
      setModalPassagemViagemId(null);
    }
  };

  // Enviar Lote para Aprovação
  const handleDispararEnvioAprovacao = () => {
    const idsParaEnviar = viagensSelecionadas.length > 0
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
    setNovaColabId(colaboradores[0]?.id || '');
    setErroNovaViagem(null);
    const c = colaboradores[0];
    if (c) {
      setNovaOrigem(c.origem);
      setNovaDestino(c.destino);
      setNovaTransporte(c.transporte);
      setNovaIda(hoje);
      setNovaVolta(new Date(new Date(hoje).getTime() + c.folga * 86400000).toISOString().split('T')[0]);
    }
    setModalNovaViagem(true);
  };

  const handleSalvarNovaViagem = (e: React.FormEvent) => {
    e.preventDefault();
    setErroNovaViagem(null);
    if (!novaColabId || !novaIda || !novaVolta) {
      setErroNovaViagem('Preencha os campos obrigatórios (Colaborador, Data de Ida e Volta).');
      return;
    }
    if (novaVolta < novaIda) {
      setErroNovaViagem('Validação: A data de volta não pode ser anterior à data de ida.');
      return;
    }

    const colab = getColab(novaColabId);

    criarViagem({
      colabId: novaColabId,
      etapa: 'programada',
      motivo: novaMotivo,
      dataSolicitacao: hoje,
      ida: novaIda,
      volta: novaVolta,
      origem: novaOrigem,
      destino: novaDestino,
      transporte: novaTransporte,
      solicitante: novaSolicitante,
      custoPassagem: null,
      voucher: '',
      hospedagem: novaTransporte.includes('Aéreo'),
      tipoHosp: novaTransporte.includes('Aéreo') ? 'República' : 'N.A',
      localHosp: novaTransporte.includes('Aéreo') ? 'República UMCA' : 'N.A',
      custoHospedagem: null,
      ocorrencia: 'Sem alteração',
      dataPrioritaria: novaDataPrioritaria,
      folgaConforme: novaFolgaConforme,
      obs: novaObs,
      tipoColaborador: colab?.tipo || 'U&M',
      centroCusto: 'UMCA',
    });

    setModalNovaViagem(false);
  };

  const handleSalvarEdicaoViagem = (e: React.FormEvent) => {
    e.preventDefault();
    setErroEdicaoViagem(null);
    if (!modalEditarViagem) return;
    if (modalEditarViagem.volta < modalEditarViagem.ida) {
      setErroEdicaoViagem('Validação: A data de volta não pode ser anterior à data de ida.');
      return;
    }

    atualizarViagem(modalEditarViagem.id, modalEditarViagem);
    setModalEditarViagem(null);
  };

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
                BASE_INDICADORES · Fluxo de Etapas
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Gestão de Viagens & Esteira de Aprovações
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Fluxo ordenado: 1. Programada &rarr; 2. Enviada para aprovação &rarr; 3. Aprovada &rarr; 4. Passagem comprada &rarr; 5. Realizada.
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
      </div>

      {/* Controles de Filtro e Modos de Visualização */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
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

          {/* Busca e Alternância Tabela/Pipeline */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, chapa, trecho..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setModoVisualizacao('tabela')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  modoVisualizacao === 'tabela' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tabela
              </button>
              <button
                onClick={() => setModoVisualizacao('pipeline')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  modoVisualizacao === 'pipeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Esteira Kanban
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visão 1: Tabela Completa (Regulamentar CAN) */}
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
                  <th className="py-3 px-3">Colaborador</th>
                  <th className="py-3 px-3">Etapa Atual</th>
                  <th className="py-3 px-3">Data Ida / Volta</th>
                  <th className="py-3 px-3">Trecho & Transporte</th>
                  <th className="py-3 px-3">Prazo (Antecedência)</th>
                  <th className="py-3 px-3">Hospedagem</th>
                  <th className="py-3 px-3">Custos (Passagem / Hosp.)</th>
                  <th className="py-3 px-3">Voucher / Ocorrência</th>
                  <th className="py-3 px-3 text-right">Avançar Fluxo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viagensFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-500">
                      Nenhuma viagem encontrada para este filtro.
                    </td>
                  </tr>
                ) : (
                  viagensFiltradas.map(v => {
                    const colab = getColab(v.colabId);
                    const antecedencia = diffEmDias(v.ida, v.dataSolicitacao);
                    const dentroDoPrazo = antecedencia >= 20;
                    const ordemEtapas: EtapaViagem[] = ['programada', 'enviada', 'aprovada', 'comprada', 'realizada'];
                    const idxEtapa = ordemEtapas.indexOf(v.etapa);
                    const isCancelada = v.ocorrencia === 'Cancelada';

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

                        {/* Colaborador */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900">{colab?.nome || 'Não identificado'}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                            <span className="font-mono">Chapa {colab?.chapa || '—'}</span>
                            <span>·</span>
                            <span>{v.motivo}</span>
                          </div>
                        </td>

                        {/* Etapa com Barra de Progresso Mini */}
                        <td className="py-3 px-3 min-w-[140px]">
                          <div className="flex items-center gap-1 mb-1">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${
                                v.etapa === 'realizada'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : v.etapa === 'comprada'
                                  ? 'bg-blue-100 text-blue-800'
                                  : v.etapa === 'aprovada'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : v.etapa === 'enviada'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {v.etapa}
                            </span>
                          </div>
                          {/* 5-step visual indicator */}
                          <div className="flex items-center gap-0.5 w-full">
                            {ordemEtapas.map((step, i) => (
                              <div
                                key={step}
                                className={`h-1.5 flex-1 rounded-sm ${
                                  i <= idxEtapa
                                    ? step === 'realizada'
                                      ? 'bg-emerald-500'
                                      : 'bg-blue-600'
                                    : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </td>

                        {/* Data Ida / Volta */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-mono font-medium text-slate-900">
                            {formatarDataBR(v.ida)} &rarr; {formatarDataBR(v.volta)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Solicitado em {formatarDataBR(v.dataSolicitacao)}
                          </div>
                        </td>

                        {/* Trecho & Transporte */}
                        <td className="py-3 px-3">
                          <div className="text-slate-800 font-medium whitespace-nowrap">
                            {v.origem} &rarr; {v.destino}
                          </div>
                          <div className="text-[11px] text-slate-500">{v.transporte}</div>
                        </td>

                        {/* Prazo (Antecedência) */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                dentroDoPrazo
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                              }`}
                            >
                              {dentroDoPrazo ? 'Dentro do prazo' : 'Fora do prazo'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {antecedencia} dias de antecedência
                          </div>
                        </td>

                        {/* Hospedagem */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {v.hospedagem ? (
                            <div>
                              <span className="font-semibold text-slate-800">{v.tipoHosp}</span>
                              <div className="text-[11px] text-slate-500 truncate max-w-[140px]" title={v.localHosp}>
                                {v.localHosp || 'Local pendente'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">N.A</span>
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

                        {/* Voucher / Ocorrência */}
                        <td className="py-3 px-3">
                          {v.voucher ? (
                            <span className="font-mono text-xs font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200 block truncate max-w-[130px]">
                              {v.voucher}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Pendente</span>
                          )}

                          {v.ocorrencia !== 'Sem alteração' && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded mt-1 inline-block ${
                                v.ocorrencia === 'Remarcada'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {v.ocorrencia}
                            </span>
                          )}
                        </td>

                        {/* Botão OK e Ações */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isCancelada && v.etapa !== 'realizada' && (
                              <button
                                onClick={() => handleAvancarOK(v)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                                title="Avançar para a próxima etapa (OK)"
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

                            {/* Editar */}
                            <button
                              onClick={() => setModalEditarViagem(v)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                              title="Editar dados da viagem"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Cancelar */}
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

      {/* Visão 2: Esteira Kanban (Pipeline de 5 Etapas) */}
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
                {/* Cabeçalho da Etapa */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-900">{etapa.nome}</span>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    {viagensNestaEtapa.length}
                  </span>
                </div>

                {/* Cards das Viagens */}
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {viagensNestaEtapa.length === 0 ? (
                    <div className="h-28 flex items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg">
                      Nenhuma nesta etapa
                    </div>
                  ) : (
                    viagensNestaEtapa.map(v => {
                      const colab = getColab(v.colabId);
                      const antecedencia = diffEmDias(v.ida, v.dataSolicitacao);
                      const dentroDoPrazo = antecedencia >= 20;

                      return (
                        <div
                          key={v.id}
                          className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs space-y-2 hover:border-blue-400 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <div className="font-semibold text-xs text-slate-900">{colab?.nome}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Chapa {colab?.chapa}</div>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                dentroDoPrazo
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {dentroDoPrazo ? '≥20d' : '<20d'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded font-mono">
                            <div>Ida: {formatarDataBR(v.ida)}</div>
                            <div>Volta: {formatarDataBR(v.volta)}</div>
                          </div>

                          <div className="text-[11px] text-slate-700 font-medium">
                            {v.origem} &rarr; {v.destino}
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {v.transporte}
                            </span>
                          </div>

                          {v.voucher && (
                            <div className="text-[10px] font-mono bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 truncate">
                              Voucher: {v.voucher}
                            </div>
                          )}

                          {v.custoPassagem && (
                            <div className="text-xs font-mono font-bold text-slate-900">
                              {formatarMoeda(v.custoPassagem)}
                            </div>
                          )}

                          {/* Botão de avanço rápido */}
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

      {/* MODAL 1: Passagem Comprada (Exige Custo da Passagem e Voucher) */}
      {modalPassagemViagemId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Registrar Passagem Comprada</h3>
                  <p className="text-xs text-slate-500">Etapa 4: Obrigatório registrar custo e voucher</p>
                </div>
              </div>
              <button
                onClick={() => setModalPassagemViagemId(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Custo da Passagem (R$) * <span className="text-rose-500 font-normal">obrigatório</span>
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
                  Voucher / Código Localizador * <span className="text-rose-500 font-normal">obrigatório</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: AZUL-7789A ou ROD-PA-1234"
                  value={voucherInput}
                  onChange={e => setVoucherInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
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
                          <option value="República">República</option>
                          <option value="Hotel">Hotel</option>
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

              <div className="text-[11px] text-slate-500 bg-blue-50 p-2.5 rounded text-blue-800 border border-blue-200">
                Ao confirmar, o colaborador ficará com a cor <strong>AZUL</strong> no Controle de Folgas e um aviso WhatsApp com os dados do bilhete será gerado na aba de Avisos.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalPassagemViagemId(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
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
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
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
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
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
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Nova Viagem Manual */}
      {modalNovaViagem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Nova Programação de Viagem</h3>
                  <p className="text-xs text-slate-500">Inicia na etapa 'Programada'</p>
                </div>
              </div>
              <button
                onClick={() => setModalNovaViagem(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Colaborador *</label>
                <select
                  value={novaColabId}
                  onChange={e => {
                    setNovaColabId(e.target.value);
                    const c = getColab(e.target.value);
                    if (c) {
                      setNovaOrigem(c.origem);
                      setNovaDestino(c.destino);
                      setNovaTransporte(c.transporte);
                      setNovaVolta(new Date(new Date(novaIda).getTime() + c.folga * 86400000).toISOString().split('T')[0]);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                  required
                >
                  {colaboradores.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} (Chapa {c.chapa} - {c.funcao}) - Escala {c.trab}x{c.folga}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block font-semibold text-slate-700 mb-1">Data de Volta *</label>
                  <input
                    type="date"
                    value={novaVolta}
                    onChange={e => setNovaVolta(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Origem</label>
                  <input
                    type="text"
                    value={novaOrigem}
                    onChange={e => setNovaOrigem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destino</label>
                  <input
                    type="text"
                    value={novaDestino}
                    onChange={e => setNovaDestino(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Transporte</label>
                  <select
                    value={novaTransporte}
                    onChange={e => setNovaTransporte(e.target.value as Viagem['transporte'])}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-900"
                  >
                    <option value="Aéreo">Aéreo</option>
                    <option value="Rodoviário">Rodoviário</option>
                    <option value="Aéreo + Rodoviário">Aéreo + Rodoviário</option>
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

              <div className="flex items-center gap-4 pt-2">
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
                  <span className="font-semibold text-slate-700">Folga Conforme Planejamento</span>
                </label>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações</label>
                <input
                  type="text"
                  placeholder="Ex: destino final Oriximiná"
                  value={novaObs}
                  onChange={e => setNovaObs(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNovaViagem(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Criar Viagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Editar Viagem (detecta remarcação se alterar data de ida) */}
      {modalEditarViagem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Editar Viagem</h3>
              <button
                onClick={() => setModalEditarViagem(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data de Ida</label>
                  <input
                    type="date"
                    value={modalEditarViagem.ida}
                    onChange={e => setModalEditarViagem({ ...modalEditarViagem, ida: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900"
                    required
                  />
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    * Alterar data de ida após definida marca Ocorrência como "Remarcada"
                  </p>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data de Volta</label>
                  <input
                    type="date"
                    value={modalEditarViagem.volta}
                    onChange={e => setModalEditarViagem({ ...modalEditarViagem, volta: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    onChange={e => setModalEditarViagem({ ...modalEditarViagem, custoPassagem: parseFloat(e.target.value) || null })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ocorrência</label>
                  <select
                    value={modalEditarViagem.ocorrencia}
                    onChange={e => setModalEditarViagem({ ...modalEditarViagem, ocorrencia: e.target.value as OcorrenciaViagem })}
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
                    onChange={e => setModalEditarViagem({ ...modalEditarViagem, etapa: e.target.value as EtapaViagem })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-xs text-slate-900"
                  >
                    <option value="programada">1. Programada</option>
                    <option value="enviada">2. Enviada para aprovação</option>
                    <option value="aprovada">3. Aprovada</option>
                    <option value="comprada">4. Passagem comprada</option>
                    <option value="realizada">5. Realizada</option>
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
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
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
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600">
              <Ban className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">Cancelar Viagem</h3>
            </div>
            <p className="text-xs text-slate-600">
              Deseja cancelar a viagem de <strong>{getColab(viagemParaCancelar.colabId)?.nome || 'colaborador'}</strong>? Ela sairá do fluxo ativo e dos custos nos indicadores.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViagemParaCancelar(null)}
                className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  cancelarViagem(viagemParaCancelar.id);
                  setViagemParaCancelar(null);
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs"
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
