import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Plane,
  Car,
  Bus,
  Sparkles,
  Flag,
  MapPin,
} from 'lucide-react';
import { Viagem, Colaborador } from '../../types';
import { formatarDataBR } from '../../utils/dateUtils';
import { obterNecessidadesTransporte, avaliarDocumentosViagem } from '../../utils/viagemUtils';

interface CalendarioViagensProps {
  viagens: Viagem[];
  colaboradores: Colaborador[];
  hoje: string;
  onAbrirEtapaAtual: (viagem: Viagem) => void;
}

interface EventoCalendario {
  viagem: Viagem;
  colaborador?: Colaborador;
  nomeExibicao: string;
  tipoMovimento: 'ida' | 'volta';
  dataISO: string;
  trecho: string;
  necessitaTaxi: boolean;
  necessitaAereo: boolean;
  necessitaRodoviario: boolean;
}

const MESES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const CalendarioViagens: React.FC<CalendarioViagensProps> = ({
  viagens,
  colaboradores,
  hoje,
  onAbrirEtapaAtual,
}) => {
  const [anoMes, setAnoMes] = useState<{ ano: number; mes: number }>(() => {
    const [y, m] = (hoje || '2026-11-10').split('-').map(Number);
    return { ano: y || 2026, mes: (m || 11) - 1 };
  });

  const [tipoFiltroMovimento, setTipoFiltroMovimento] = useState<'ambos' | 'ida' | 'volta'>('ambos');
  const [dataSelecionada, setDataSelecionada] = useState<string>(hoje || '2026-11-15');

  const getColab = (id: string) => colaboradores.find(c => c.id === id);

  // Mapeia todas as viagens ativas (não canceladas) para eventos por data ISO
  const eventosPorData = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>();

    const adicionar = (dataISO: string, ev: EventoCalendario) => {
      if (!dataISO) return;
      const lista = mapa.get(dataISO) || [];
      lista.push(ev);
      mapa.set(dataISO, lista);
    };

    viagens
      .filter(v => v.ocorrencia !== 'Cancelada')
      .forEach(v => {
        const colab = getColab(v.colabId);
        const nomeExibicao = v.passageiroNomeAvulso || colab?.nome || 'Colaborador';
        const { necessitaTaxi, necessitaAereo, necessitaRodoviario } = obterNecessidadesTransporte(v);

        if (v.ida && (tipoFiltroMovimento === 'ambos' || tipoFiltroMovimento === 'ida')) {
          adicionar(v.ida, {
            viagem: v,
            colaborador: colab,
            nomeExibicao,
            tipoMovimento: 'ida',
            dataISO: v.ida,
            trecho: `${v.origem} → ${v.destino}`,
            necessitaTaxi,
            necessitaAereo,
            necessitaRodoviario,
          });
        }

        if (
          v.volta &&
          !v.somenteIda &&
          (tipoFiltroMovimento === 'ambos' || tipoFiltroMovimento === 'volta')
        ) {
          adicionar(v.volta, {
            viagem: v,
            colaborador: colab,
            nomeExibicao,
            tipoMovimento: 'volta',
            dataISO: v.volta,
            trecho: `${v.destino} → ${v.origem}`,
            necessitaTaxi,
            necessitaAereo,
            necessitaRodoviario,
          });
        }
      });

    return mapa;
  }, [viagens, colaboradores, tipoFiltroMovimento]);

  // Grade do mês atual
  const diasGrade = useMemo(() => {
    const primeiroDia = new Date(Date.UTC(anoMes.ano, anoMes.mes, 1));
    const diaSemanaInicio = primeiroDia.getUTCDay();
    const totalDiasMes = new Date(Date.UTC(anoMes.ano, anoMes.mes + 1, 0)).getUTCDate();

    const celulas: { dataISO: string | null; dia: number | null }[] = [];
    for (let i = 0; i < diaSemanaInicio; i++) {
      celulas.push({ dataISO: null, dia: null });
    }
    for (let d = 1; d <= totalDiasMes; d++) {
      const mStr = String(anoMes.mes + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      celulas.push({
        dataISO: `${anoMes.ano}-${mStr}-${dStr}`,
        dia: d,
      });
    }
    return celulas;
  }, [anoMes]);

  // Estatísticas de otimização do mês exibido
  const statsMes = useMemo(() => {
    const prefixo = `${anoMes.ano}-${String(anoMes.mes + 1).padStart(2, '0')}-`;
    let totalEmbarques = 0;
    let diasComAgrupamento = 0;
    let totalAereo = 0;
    let totalTaxi = 0;
    let totalRodov = 0;

    eventosPorData.forEach((lista, data) => {
      if (!data.startsWith(prefixo)) return;
      totalEmbarques += lista.length;
      if (lista.length >= 2) diasComAgrupamento++;
      lista.forEach(ev => {
        if (ev.necessitaAereo) totalAereo++;
        if (ev.necessitaTaxi) totalTaxi++;
        if (ev.necessitaRodoviario) totalRodov++;
      });
    });

    return { totalEmbarques, diasComAgrupamento, totalAereo, totalTaxi, totalRodov };
  }, [eventosPorData, anoMes]);

  const navegarMes = (delta: number) => {
    setAnoMes(prev => {
      const novoMes = prev.mes + delta;
      if (novoMes < 0) return { ano: prev.ano - 1, mes: 11 };
      if (novoMes > 11) return { ano: prev.ano + 1, mes: 0 };
      return { ano: prev.ano, mes: novoMes };
    });
  };

  const irParaHoje = () => {
    const [y, m] = (hoje || '2026-11-10').split('-').map(Number);
    setAnoMes({ ano: y || 2026, mes: (m || 11) - 1 });
    setDataSelecionada(hoje);
  };

  // Análise de agrupamento do dia selecionado
  const eventosDiaSelecionado = eventosPorData.get(dataSelecionada) || [];
  const agrupamentoPorTrecho = useMemo(() => {
    const mapa = new Map<string, EventoCalendario[]>();
    eventosDiaSelecionado.forEach(ev => {
      const lista = mapa.get(ev.trecho) || [];
      lista.push(ev);
      mapa.set(ev.trecho, lista);
    });
    return Array.from(mapa.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [eventosDiaSelecionado]);

  const qtdTaxiDia = eventosDiaSelecionado.filter(e => e.necessitaTaxi).length;
  const qtdAereoDia = eventosDiaSelecionado.filter(e => e.necessitaAereo).length;

  return (
    <div className="space-y-4">
      {/* Banner de Otimização de Voo & Táxi */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/70 to-emerald-50/60 border border-blue-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Calendário de Planejamento de Viagens (Otimização de Voo & Táxi)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Visualize todos os colaboradores programados em cada data para concentrar o maior número de pessoas no mesmo voo e táxi, reduzindo custos operacionais.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-mono">
            <span className="text-slate-500">Embarques:</span>{' '}
            <strong className="text-slate-900">{statsMes.totalEmbarques}</strong>
          </div>
          <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg px-3 py-1.5 font-semibold">
            {statsMes.diasComAgrupamento} dia(s) p/ agrupar
          </div>
          <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center gap-2 font-mono text-[11px]">
            <span className="flex items-center gap-1 text-blue-700 font-bold">
              <Plane className="w-3.5 h-3.5" /> {statsMes.totalAereo}
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-amber-700 font-bold">
              <Car className="w-3.5 h-3.5" /> {statsMes.totalTaxi}
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-emerald-700 font-bold">
              <Bus className="w-3.5 h-3.5" /> {statsMes.totalRodov}
            </span>
          </div>
        </div>
      </div>

      {/* Layout Duplo: Grade do Calendário + Painel de Agrupamento do Dia */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Coluna Esquerda: Calendário Mensal */}
        <div className="xl:col-span-8 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
          {/* Controles de Mês e Movimento */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navegarMes(-1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                title="Mês anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="min-w-[165px] text-center font-bold text-sm text-slate-900">
                {MESES_PT[anoMes.mes]} de {anoMes.ano}
              </div>
              <button
                type="button"
                onClick={() => navegarMes(1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                title="Próximo mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={irParaHoje}
                className="ml-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
              >
                Hoje
              </button>
            </div>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {(
                [
                  { id: 'ambos', label: 'Idas e Voltas' },
                  { id: 'ida', label: 'Só Idas' },
                  { id: 'volta', label: 'Só Voltas' },
                ] as const
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTipoFiltroMovimento(opt.id)}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    tipoFiltroMovimento === opt.id
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cabeçalho Dias da Semana */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-slate-500">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Grade de Dias */}
          <div className="grid grid-cols-7 gap-1.5">
            {diasGrade.map((cell, index) => {
              if (!cell.dataISO || !cell.dia) {
                return <div key={`empty-${index}`} className="min-h-[96px] bg-slate-50/50 rounded-lg" />;
              }

              const eventos = eventosPorData.get(cell.dataISO) || [];
              const isHoje = cell.dataISO === hoje;
              const isSelecionado = cell.dataISO === dataSelecionada;
              const temAgrupamento = eventos.length >= 2;

              return (
                <button
                  key={cell.dataISO}
                  type="button"
                  onClick={() => setDataSelecionada(cell.dataISO!)}
                  className={`min-h-[98px] p-1.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    isSelecionado
                      ? 'border-blue-600 ring-2 ring-blue-200 bg-blue-50/40'
                      : temAgrupamento
                      ? 'border-emerald-300 bg-emerald-50/40 hover:border-emerald-500'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono font-bold px-1.5 py-0.2 rounded ${
                        isHoje
                          ? 'bg-blue-600 text-white'
                          : isSelecionado
                          ? 'text-blue-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {cell.dia}
                    </span>

                    {temAgrupamento && (
                      <span
                        className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white"
                        title={`${eventos.length} colaboradores nesta data — oportunidade de agrupar voo/táxi`}
                      >
                        <Users className="w-2.5 h-2.5" />
                        {eventos.length}
                      </span>
                    )}
                  </div>

                  {/* Lista de nomes dos colaboradores na data */}
                  <div className="space-y-1 w-full overflow-hidden">
                    {eventos.slice(0, 3).map((ev, idx) => (
                      <div
                        key={`${ev.viagem.id}-${ev.tipoMovimento}-${idx}`}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold truncate flex items-center justify-between gap-1 ${
                          ev.tipoMovimento === 'ida'
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                        }`}
                        title={`${ev.nomeExibicao} (${ev.tipoMovimento === 'ida' ? 'Ida' : 'Volta'}: ${ev.trecho})`}
                      >
                        <span className="truncate">
                          {ev.tipoMovimento === 'ida' ? '↗' : '↙'} {ev.nomeExibicao.split(' ')[0]}
                        </span>
                        <span className="flex items-center gap-0.5 shrink-0 opacity-80">
                          {ev.necessitaAereo && <Plane className="w-2.5 h-2.5" />}
                          {ev.necessitaTaxi && <Car className="w-2.5 h-2.5" />}
                        </span>
                      </div>
                    ))}
                    {eventos.length > 3 && (
                      <div className="text-[10px] font-bold text-emerald-700 pl-1">
                        +{eventos.length - 3} colaborador(es)
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" />
              ↗ Data de Ida
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300 inline-block" />
              ↙ Data de Volta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400 inline-block" />
              2+ colaboradores (Oportunidade de compartilhar Voo/Táxi)
            </span>
          </div>
        </div>

        {/* Coluna Direita: Detalhes & Consolidação de Voo/Táxi da Data Selecionada */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-4">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Viajantes na Data</span>
              </span>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                {formatarDataBR(dataSelecionada)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {eventosDiaSelecionado.length === 0
                ? 'Nenhum colaborador programado para esta data.'
                : `${eventosDiaSelecionado.length} embarque(s) previsto(s) nesta data.`}
            </p>
          </div>

          {/* Alerta Inteligente de Otimização (Voo / Táxi compartilhado) */}
          {eventosDiaSelecionado.length >= 2 && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Oportunidade de Otimização de Custos</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                {qtdAereoDia >= 2 && (
                  <li>
                    <strong>{qtdAereoDia} colaboradores</strong> precisam de <strong>Aéreo</strong> nesta data — verifique concentração no mesmo voo.
                  </li>
                )}
                {qtdTaxiDia >= 2 && (
                  <li>
                    <strong>{qtdTaxiDia} colaboradores</strong> precisam de <strong>Táxi</strong> nesta data — possível compartilhar traslado!
                  </li>
                )}
                {agrupamentoPorTrecho.some(([, list]) => list.length >= 2) && (
                  <li>
                    Há colaboradores compartilhando exatamente o <strong>mesmo trecho</strong> abaixo.
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Lista Agrupada por Trecho */}
          {eventosDiaSelecionado.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-4 border border-dashed border-slate-200 rounded-xl text-slate-400">
              <CalendarIcon className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-xs font-medium text-slate-500">Nenhuma viagem nesta data</p>
              <p className="text-[11px] mt-1">
                Clique em uma data destacada no calendário para ver os colaboradores e oportunidades de compartilhamento.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-0.5">
              {agrupamentoPorTrecho.map(([trecho, lista]) => (
                <div key={trecho} className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{trecho}</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-mono shrink-0 ${
                        lista.length >= 2
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {lista.length} {lista.length > 1 ? 'pessoas' : 'pessoa'}
                    </span>
                  </div>

                  {lista.map((ev, idx) => {
                    const evalDocs = avaliarDocumentosViagem(ev.viagem);
                    return (
                      <div
                        key={`${ev.viagem.id}-${ev.tipoMovimento}-${idx}`}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900">{ev.nomeExibicao}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              CC: {ev.viagem.centroCusto || ev.viagem.operacao || 'UMCA'} ·{' '}
                              {ev.tipoMovimento === 'ida' ? 'Embarque Ida' : 'Retorno Volta'}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                              ev.tipoMovimento === 'ida'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {ev.tipoMovimento}
                          </span>
                        </div>

                        {/* Necessidades de transporte */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                              ev.necessitaAereo
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          >
                            <Plane className="w-3 h-3" /> Aéreo: {ev.necessitaAereo ? 'Sim' : 'Não'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                              ev.necessitaTaxi
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          >
                            <Car className="w-3 h-3" /> Táxi: {ev.necessitaTaxi ? 'Sim' : 'Não'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${
                              ev.necessitaRodoviario
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200'
                            }`}
                          >
                            <Bus className="w-3 h-3" /> Rodov.: {ev.necessitaRodoviario ? 'Sim' : 'Não'}
                          </span>
                        </div>

                        {/* Botão rápido para Etapa Atual */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                              evalDocs.todosObrigatoriosAnexados ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            <Flag className="w-3 h-3" />
                            <span>{evalDocs.statusProcessoTexto}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => onAbrirEtapaAtual(ev.viagem)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          >
                            Abrir Etapa Atual &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
