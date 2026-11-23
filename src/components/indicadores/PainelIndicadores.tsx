import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  XCircle,
  CreditCard,
  Building,
  Building2,
  Home,
  Star,
  Target,
  ArrowRight,
  TrendingUp,
  CalendarDays,
  Plane,
  FileText,
  FileCheck2,
  Filter,
} from 'lucide-react';
import { formatarMoeda } from '../../utils/formatters';
import { formatarDataBR } from '../../utils/dateUtils';
import { calcularIndicadoresCAN } from '../../utils/viagemUtils';

export const PainelIndicadores: React.FC = () => {
  const { viagens, calculosFolgas, setActiveTab, hoje, setHoje, isAdmin } = useApp();
  const [filtroCC, setFiltroCC] = useState<string>('TODOS');

  // Recalcula indicadores dinamicamente conforme o Centro de Custo selecionado
  const indicadores = useMemo(() => {
    return calcularIndicadoresCAN(viagens, filtroCC);
  }, [viagens, filtroCC]);

  const centrosDeCusto = useMemo(() => {
    return indicadores.porCentroCusto.map(item => item.centroCusto);
  }, [indicadores.porCentroCusto]);

  // Filtra folgas dos próximos 30 dias (respeitando Centro de Custo / Operação se selecionado)
  const folgasProximos30d = useMemo(() => {
    return calculosFolgas
      .filter(item => {
        if (item.colaborador.ferias || item.diasAteFolga > 30) return false;
        if (filtroCC !== 'TODOS') {
          const ccColab = (item.colaborador.centroCusto || item.colaborador.operacao || 'UMCA').toUpperCase();
          return ccColab === filtroCC;
        }
        return true;
      })
      .sort((a, b) => a.diasAteFolga - b.diasAteFolga);
  }, [calculosFolgas, filtroCC]);

  const etapasInfo = [
    { key: 'programada', label: '1. Programada' },
    { key: 'enviada', label: '2. Enviada para Aprovação' },
    { key: 'aprovada', label: '3. Aprovada' },
    { key: 'comprada', label: '4. Passagem Comprada' },
    { key: 'realizada', label: '5. Realizada' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Painel de Indicadores | CAN – Controle de Viagens
            </h1>
            <p className="mt-1 text-sm text-slate-600 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-rose-600">Regra de Operação:</span>
              <span>Prazo mínimo de solicitação: 20 dias antes da ida</span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                <FileCheck2 className="w-3.5 h-3.5" />
                {indicadores.totalFichasIntegradas} Ficha(s) Padrão integradas
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('ficha')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Nova Ficha Padrão</span>
            </button>

            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5 border border-slate-200 text-xs text-slate-700">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Data Base:</span>
              <input
                type="date"
                value={hoje}
                onChange={e => e.target.value && setHoje(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Barra de Filtro por Centro de Custo */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Consolidar por Centro de Custo:</span>
          </span>

          <button
            type="button"
            onClick={() => setFiltroCC('TODOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filtroCC === 'TODOS'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todos os Centros de Custo ({viagens.filter(v => v.ocorrencia !== 'Cancelada').length})
          </button>

          {centrosDeCusto.map(cc => {
            const info = indicadores.porCentroCusto.find(item => item.centroCusto === cc);
            return (
              <button
                key={cc}
                type="button"
                onClick={() => setFiltroCC(cc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono border transition-colors cursor-pointer ${
                  filtroCC === cc
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50/60 text-blue-900 border-blue-200 hover:bg-blue-100'
                }`}
              >
                {cc} ({info?.totalSolicitacoes || 0})
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid com os 12 Indicadores Oficiais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Viagens Realizadas */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>1. Viagens Realizadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-slate-900" data-tabular="true">
            {indicadores.totalRealizadas}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Concluídas com documentação completa
          </p>
        </div>

        {/* 2. Solicitações Dentro do Prazo */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>2. Dentro do Prazo (≥ 20d)</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-blue-700" data-tabular="true">
            {indicadores.dentroDoPrazo}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {indicadores.totalSolicitacoesAtivas > 0
              ? `${Math.round((indicadores.dentroDoPrazo / indicadores.totalSolicitacoesAtivas) * 100)}% de conformidade de SLA`
              : 'Sem solicitações'}
          </p>
        </div>

        {/* 3. Solicitações Fora do Prazo */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>3. Fora do Prazo (&lt; 20d)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-amber-700" data-tabular="true">
            {indicadores.foraDoPrazo}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Solicitadas com antecedência insuficiente
          </p>
        </div>

        {/* 4. Remarcações */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>4. Remarcações</span>
            <RefreshCw className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-purple-700" data-tabular="true">
            {indicadores.remarcacoes}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Datas de ida alteradas pós-emissão
          </p>
        </div>

        {/* 5. Cancelamentos */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>5. Cancelamentos</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-rose-700" data-tabular="true">
            {indicadores.cancelamentos}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Excluídos dos custos e fluxo ativo
          </p>
        </div>

        {/* 6. Custo de Passagens */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>6. Custo de Passagens</span>
            <Plane className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-slate-900" data-tabular="true">
            {formatarMoeda(indicadores.custoPassagens)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Valores efetivos aéreo/rodoviário
          </p>
        </div>

        {/* 7. Custo de Hospedagem */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>7. Custo de Hospedagem</span>
            <CreditCard className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-slate-900" data-tabular="true">
            {formatarMoeda(indicadores.custoHospedagem)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Hotéis e acomodações externas
          </p>
        </div>

        {/* Custo Total Combinado */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Custo Total ({filtroCC === 'TODOS' ? 'Geral' : filtroCC})</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-emerald-700" data-tabular="true">
            {formatarMoeda(indicadores.custoTotal)}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Passagens + Hospedagens
          </p>
        </div>

        {/* 8. Utilização de Repúblicas */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>8. Utilização de Repúblicas</span>
            <Home className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-slate-900" data-tabular="true">
            {indicadores.utilizacaoRepublicas}{' '}
            <span className="text-sm font-normal text-slate-500">({indicadores.taxaRepublicas}%)</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Acomodações próprias da empresa
          </p>
        </div>

        {/* 9. Utilização de Hotéis */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>9. Utilização de Hotéis</span>
            <Building className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-slate-900" data-tabular="true">
            {indicadores.utilizacaoHoteis}{' '}
            <span className="text-sm font-normal text-slate-500">({indicadores.taxaHoteis}%)</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Rede hoteleira credenciada
          </p>
        </div>

        {/* 10. Conformidade de Planejamento */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>10. Conformidade c/ Planejamento</span>
            <Target className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-indigo-700" data-tabular="true">
            {indicadores.conformidadePlanejamento}%
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Folgas realizadas na data prevista
          </p>
        </div>

        {/* 11. Datas Prioritárias */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>11. Viagens em Datas Prioritárias</span>
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-amber-600" data-tabular="true">
            {indicadores.percentualDatasPrioritarias}%
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Calendário prioritário homologado CAN
          </p>
        </div>
      </div>

      {/* Consolidação por Centro de Custo (Integrada à Ficha Padrão) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Consolidação por Centro de Custo (Base Integrada da Ficha Padrão)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Clique em um Centro de Custo abaixo para filtrar todos os cartões do painel acima.
            </p>
          </div>
          {filtroCC !== 'TODOS' && (
            <button
              type="button"
              onClick={() => setFiltroCC('TODOS')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              Limpar filtro ({filtroCC})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">Centro de Custo</th>
                <th className="py-2.5 px-3 text-center">Solicitações</th>
                <th className="py-2.5 px-3 text-center">Via Ficha Padrão</th>
                <th className="py-2.5 px-3 text-center">Realizadas</th>
                <th className="py-2.5 px-3 text-center">Em Andamento</th>
                <th className="py-2.5 px-3 text-center">SLA (≥20d)</th>
                <th className="py-2.5 px-3 text-center">Remarc. / Canc.</th>
                <th className="py-2.5 px-3 text-right">Custo Passagens</th>
                <th className="py-2.5 px-3 text-right">Custo Hosp.</th>
                <th className="py-2.5 px-3 text-right">Custo Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {indicadores.porCentroCusto.map(row => {
                const selecionado = filtroCC === row.centroCusto;
                return (
                  <tr
                    key={row.centroCusto}
                    onClick={() => setFiltroCC(selecionado ? 'TODOS' : row.centroCusto)}
                    className={`cursor-pointer transition-colors ${
                      selecionado ? 'bg-blue-50/80 font-semibold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                          selecionado
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 text-slate-900 border-slate-200'
                        }`}
                      >
                        {row.centroCusto}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                      {row.totalSolicitacoes}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {row.fichasPadrao}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-emerald-700 font-bold">
                      {row.totalRealizadas}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-amber-700 font-semibold">
                      {row.emAndamento}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                          row.taxaSLA >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.taxaSLA >= 50
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {row.taxaSLA}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {row.remarcacoes} / {row.cancelamentos}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {formatarMoeda(row.custoPassagens)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                      {formatarMoeda(row.custoHospedagem)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatarMoeda(row.custoTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Painel Duplo: Distribuição por Etapas + Folgas Próximos 30 Dias */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Distribuição por Etapa */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">
              Viagens por Etapa do Fluxo
            </h2>
            <button
              onClick={() => setActiveTab('viagens')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Ver fluxo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {etapasInfo.map(etapa => {
              const qtd = indicadores.etapasContagem[etapa.key as keyof typeof indicadores.etapasContagem] || 0;
              const totalAtivas = Object.values(indicadores.etapasContagem).reduce((a, b) => a + b, 0);
              const pct = totalAtivas > 0 ? Math.round((qtd / totalAtivas) * 100) : 0;
              return (
                <div key={etapa.key} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{etapa.label}</span>
                    <span className="font-mono font-bold text-slate-900" data-tabular="true">
                      {qtd} <span className="text-[11px] font-normal text-slate-500">({pct}%)</span>
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Folgas dos Próximos 30 Dias */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-600" />
                <span>Folgas dos Próximos 30 Dias ({folgasProximos30d.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filtroCC === 'TODOS'
                  ? 'Colaboradores com folga a vencer ou já vencida (todas as operações)'
                  : `Filtrado para o Centro de Custo / Operação ${filtroCC}`}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('folgas')}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                <span>Ver controle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {folgasProximos30d.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-lg">
              <p className="text-sm text-slate-500">
                Nenhum colaborador com folga prevista para os próximos 30 dias neste filtro.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="py-2 px-2">Colaborador</th>
                    <th className="py-2 px-2">Op.</th>
                    <th className="py-2 px-2">Escala</th>
                    <th className="py-2 px-2">Próxima Folga</th>
                    <th className="py-2 px-2">Prazo</th>
                    <th className="py-2 px-2 text-right">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {folgasProximos30d.map(item => {
                    const c = item.colaborador;
                    const vencida = item.diasAteFolga <= 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 font-medium text-slate-900">
                          <div>{c.nome}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Chapa {c.chapa} · {c.funcao}
                          </div>
                        </td>
                        <td className="py-2.5 px-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800">
                            {c.operacao || 'UMCA'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-700">{c.trab}x{c.folga}</td>
                        <td className="py-2.5 px-2 font-mono font-medium text-slate-900">
                          {formatarDataBR(item.proximaData)}
                        </td>
                        <td className="py-2.5 px-2 font-mono">
                          {vencida ? (
                            <span className="text-rose-600 font-bold">
                              {item.diasAteFolga === 0 ? 'Hoje' : `${Math.abs(item.diasAteFolga)}d atrás`}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium">
                              Em {item.diasAteFolga} dias
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          <span
                            className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${
                              item.situacaoCor === 'vermelho'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : item.situacaoCor === 'azul'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {item.situacaoTexto}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
