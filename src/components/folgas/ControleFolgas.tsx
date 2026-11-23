import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Search,
  Filter,
  PlusCircle,
  Plane,
  CheckCircle,
  Palmtree,
  Calendar,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { formatarDataBR, diffEmDias } from '../../utils/dateUtils';
import { SituacaoFolgaCor } from '../../types';

export const ControleFolgas: React.FC = () => {
  const {
    calculosFolgas,
    gerarProgramacaoProximos30Dias,
    alternarFeriasColaborador,
    criarViagem,
    setActiveTab,
    hoje,
  } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'todos' | SituacaoFolgaCor>('todos');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  const handleGerar30Dias = () => {
    const qtd = gerarProgramacaoProximos30Dias();
    if (qtd > 0) {
      setMensagemSucesso(`${qtd} viagem(ns) gerada(s) automaticamente na etapa 'Programada'!`);
    } else {
      setMensagemSucesso('Todos os colaboradores com folga nos próximos 30 dias já possuem viagem aberta.');
    }
    setTimeout(() => setMensagemSucesso(null), 4000);
  };

  const handleProgramarIndividual = (cId: string) => {
    const calc = calculosFolgas.find(item => item.colaborador.id === cId);
    if (!calc) return;
    const c = calc.colaborador;

    const ida = calc.diasAteFolga < 0 ? hoje : calc.proximaData;
    const volta = new Date(new Date(ida).getTime() + (c.folga || 10) * 86400000)
      .toISOString()
      .split('T')[0];

    criarViagem({
      colabId: c.id,
      etapa: 'programada',
      motivo: 'Folga de campo',
      dataSolicitacao: hoje,
      ida,
      volta,
      origem: c.origem,
      destino: c.destino,
      transporte: c.transporte,
      solicitante: 'Logística UMCA',
      custoPassagem: null,
      voucher: '',
      hospedagem: c.transporte.includes('Aéreo'),
      tipoHosp: c.transporte.includes('Aéreo') ? 'República' : 'N.A',
      localHosp: c.transporte.includes('Aéreo') ? 'República UMCA' : 'N.A',
      custoHospedagem: null,
      ocorrencia: 'Sem alteração',
      dataPrioritaria: false,
      folgaConforme: true,
      obs: `Programação manual direta para escala ${c.trab}x${c.folga}.`,
      tipoColaborador: c.tipo || 'U&M',
      centroCusto: 'UMCA',
    });

    setMensagemSucesso(`Viagem programada para ${c.nome}!`);
    setTimeout(() => setMensagemSucesso(null), 3000);
  };

  // Filtragem da tabela
  const listaFiltrada = useMemo(() => {
    return calculosFolgas.filter(item => {
      const c = item.colaborador;
      const matchBusca =
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        String(c.chapa).includes(busca) ||
        c.funcao.toLowerCase().includes(busca.toLowerCase()) ||
        c.destino.toLowerCase().includes(busca.toLowerCase()) ||
        c.origem.toLowerCase().includes(busca.toLowerCase());

      if (!matchBusca) return false;

      if (filtroSituacao === 'todos') return true;
      return item.situacaoCor === filtroSituacao;
    });
  }, [calculosFolgas, busca, filtroSituacao]);

  // Contadores de situação
  const contadores = useMemo(() => {
    const mapa = {
      todos: calculosFolgas.length,
      vermelho: 0,
      amarelo: 0,
      verde: 0,
      azul: 0,
      cinza: 0,
    };
    calculosFolgas.forEach(item => {
      mapa[item.situacaoCor]++;
    });
    return mapa;
  }, [calculosFolgas]);

  return (
    <div className="space-y-6">
      {/* Top Banner de Título da Planilha Oficial */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Aba Oficial
              </span>
              <span className="text-xs text-slate-500 font-mono">
                CONTROLE DE FOLGAS – UMCA – 2026
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Controle Individual de Folgas de Campo
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Cálculo baseado na escala real de cada colaborador (não fixo em +90d). Ciclo de trabalho e folga com atualização automática.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleGerar30Dias}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Gerar programação dos próximos 30 dias</span>
            </button>
          </div>
        </div>

        {mensagemSucesso && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{mensagemSucesso}</span>
            </div>
            <button
              onClick={() => setActiveTab('viagens')}
              className="font-bold underline ml-3 cursor-pointer"
            >
              Ir para Viagens &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Legenda de Formatação Condicional e Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700 mr-1">Filtro de Situação:</span>

            <button
              onClick={() => setFiltroSituacao('todos')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filtroSituacao === 'todos'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos ({contadores.todos})
            </button>

            <button
              onClick={() => setFiltroSituacao('vermelho')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                filtroSituacao === 'vermelho'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              Vermelho: Vencida ({contadores.vermelho})
            </button>

            <button
              onClick={() => setFiltroSituacao('amarelo')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                filtroSituacao === 'amarelo'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
            >
              Amarelo: Próximos 30d ({contadores.amarelo})
            </button>

            <button
              onClick={() => setFiltroSituacao('verde')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                filtroSituacao === 'verde'
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Verde: +30 dias ({contadores.verde})
            </button>

            <button
              onClick={() => setFiltroSituacao('azul')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                filtroSituacao === 'azul'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              }`}
            >
              Azul: Passagem Comprada ({contadores.azul})
            </button>

            <button
              onClick={() => setFiltroSituacao('cinza')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                filtroSituacao === 'cinza'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              Cinza: Férias ({contadores.cinza})
            </button>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador, chapa, função..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Tabela Principal de Controle de Folgas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Chapa</th>
                <th className="py-3 px-3">Colaborador</th>
                <th className="py-3 px-3">Função</th>
                <th className="py-3 px-3">Periodicidade</th>
                <th className="py-3 px-3">Origem</th>
                <th className="py-3 px-3">Destino</th>
                <th className="py-3 px-3">Última Folga</th>
                <th className="py-3 px-3">Próxima Data</th>
                <th className="py-3 px-3">Ciclo Atual (Progresso)</th>
                <th className="py-3 px-3">Situação</th>
                <th className="py-3 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listaFiltrada.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500">
                    Nenhum colaborador encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                listaFiltrada.map(item => {
                  const c = item.colaborador;
                  const viagem = item.viagemAtiva;

                  // Estilização condicional de acordo com a regra estrita
                  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                  let rowBorder = '';

                  if (item.situacaoCor === 'vermelho') {
                    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
                    rowBorder = 'bg-rose-50/30';
                  } else if (item.situacaoCor === 'amarelo') {
                    badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
                  } else if (item.situacaoCor === 'verde') {
                    badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium';
                  } else if (item.situacaoCor === 'azul') {
                    badgeClass = 'bg-blue-100 text-blue-900 border-blue-300 font-bold';
                    rowBorder = 'bg-blue-50/20';
                  } else if (item.situacaoCor === 'cinza') {
                    badgeClass = 'bg-slate-200 text-slate-700 border-slate-300';
                    rowBorder = 'opacity-70 bg-slate-50';
                  }

                  return (
                    <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${rowBorder}`}>
                      {/* Chapa */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900" data-tabular="true">
                        {c.chapa}
                      </td>

                      {/* Colaborador */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{c.nome}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{c.telefone}</span>
                          <span>·</span>
                          <span>{c.beneficios.includes('aéreas') ? 'Aéreo/Rodov.' : 'Rodov.'}</span>
                        </div>
                      </td>

                      {/* Função */}
                      <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                        {c.funcao}
                      </td>

                      {/* Periodicidade */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                          {c.trab}x{c.folga}
                        </span>
                      </td>

                      {/* Origem */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{c.origem}</td>

                      {/* Destino */}
                      <td className="py-3 px-3 text-slate-900 font-medium whitespace-nowrap">
                        {c.destino}
                      </td>

                      {/* Última Folga */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatarDataBR(c.ultimaFolga)}
                      </td>

                      {/* Próxima Data (Calculada com escala individual) */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatarDataBR(item.proximaData)}
                      </td>

                      {/* Barra do Ciclo Atual (Dia X de trab+folga com marcador de hoje) */}
                      <td className="py-3 px-3 min-w-[150px]">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span>Dia {item.diasDecorridoCiclo} de {item.diasTotalCiclo}</span>
                          <span className="font-mono">{item.percentualCiclo}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 relative overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              item.situacaoCor === 'vermelho'
                                ? 'bg-rose-500'
                                : item.situacaoCor === 'azul'
                                ? 'bg-blue-600'
                                : item.situacaoCor === 'amarelo'
                                ? 'bg-amber-500'
                                : item.situacaoCor === 'cinza'
                                ? 'bg-slate-400'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${item.percentualCiclo}%` }}
                          />
                        </div>
                      </td>

                      {/* Situação (Cores condicionais) */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-1 rounded text-[11px] border ${badgeClass}`}>
                          {item.situacaoTexto}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {viagem ? (
                            <button
                              onClick={() => setActiveTab('viagens')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                              title={`Viagem na etapa: ${viagem.etapa}`}
                            >
                              <Plane className="w-3 h-3" />
                              <span>Ver Viagem</span>
                            </button>
                          ) : !c.ferias ? (
                            <button
                              onClick={() => handleProgramarIndividual(c.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Criar viagem na etapa Programada"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>Programar</span>
                            </button>
                          ) : null}

                          <button
                            onClick={() => alternarFeriasColaborador(c.id)}
                            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                              c.ferias
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                            title={c.ferias ? 'Retornar das férias' : 'Marcar férias'}
                          >
                            <Palmtree className="w-3.5 h-3.5" />
                          </button>
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
    </div>
  );
};
