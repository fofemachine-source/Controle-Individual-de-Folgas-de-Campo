import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Search,
  PlusCircle,
  Plane,
  CheckCircle,
  Palmtree,
  Lock,
  ShieldCheck,
  AlertCircle,
  Pencil,
  Check,
  X,
  Building2,
} from 'lucide-react';
import { formatarDataBR } from '../../utils/dateUtils';
import { SituacaoFolgaCor, Operacao, OPERACOES } from '../../types';

export const ControleFolgas: React.FC = () => {
  const {
    calculosFolgas,
    gerarProgramacaoProximos30Dias,
    alternarFeriasColaborador,
    atualizarColaborador,
    criarViagem,
    setActiveTab,
    hoje,
    isAdmin,
    autenticarAdmin,
  } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState<'todos' | SituacaoFolgaCor>('todos');
  const [filtroOperacao, setFiltroOperacao] = useState<'todas' | Operacao>('todas');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Edição inline do nome do colaborador
  const [editandoNomeId, setEditandoNomeId] = useState<string | null>(null);
  const [nomeTemp, setNomeTemp] = useState('');

  // Login inline para tela restrita
  const [senhaAdmin, setSenhaAdmin] = useState('');
  const [erroLogin, setErroLogin] = useState<string | null>(null);

  const handleLoginAdminInline = (e: React.FormEvent) => {
    e.preventDefault();
    setErroLogin(null);
    if (autenticarAdmin(senhaAdmin)) {
      setSenhaAdmin('');
    } else {
      setErroLogin('Senha de Administrador incorreta. Tente novamente.');
    }
  };

  const iniciarEdicaoNome = (id: string, nomeAtual: string) => {
    setEditandoNomeId(id);
    setNomeTemp(nomeAtual);
  };

  const salvarNomeInline = (id: string) => {
    const limpo = nomeTemp.trim();
    if (limpo.length >= 2) {
      atualizarColaborador(id, { nome: limpo });
      setMensagemSucesso(`Nome atualizado para "${limpo}".`);
      setTimeout(() => setMensagemSucesso(null), 3000);
    }
    setEditandoNomeId(null);
    setNomeTemp('');
  };

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

    const op = c.operacao || 'UMCA';

    criarViagem({
      colabId: c.id,
      operacao: op,
      etapa: 'programada',
      motivo: 'Folga de campo',
      dataSolicitacao: hoje,
      ida,
      volta,
      somenteIda: false,
      origem: c.origem,
      destino: c.destino,
      transporte: c.transporte,
      necessitaTaxi: c.beneficios.toLowerCase().includes('táxi'),
      necessitaAereo: c.transporte.includes('Aéreo'),
      necessitaRodoviario: c.transporte.includes('Rodoviário'),
      solicitante: `Logística ${op}`,
      custoPassagem: null,
      voucher: '',
      hospedagem: c.transporte.includes('Aéreo'),
      tipoHosp: c.transporte.includes('Aéreo') ? 'República' : 'N.A',
      localHosp: c.transporte.includes('Aéreo') ? `República ${op}` : 'N.A',
      custoHospedagem: null,
      ocorrencia: 'Sem alteração',
      dataPrioritaria: false,
      folgaConforme: true,
      obs: `Programação manual direta para escala ${c.trab}x${c.folga} (${op}).`,
      tipoColaborador: c.tipo || 'U&M',
      centroCusto: c.centroCusto || op,
      acessoObra: false,
      qrCode: false,
      anexos: {},
    });

    setMensagemSucesso(`Viagem programada para ${c.nome} (${op})!`);
    setTimeout(() => setMensagemSucesso(null), 3000);
  };

  // Base filtrada por Operação (para contadores de situação coerentes)
  const basePorOperacao = useMemo(() => {
    if (filtroOperacao === 'todas') return calculosFolgas;
    return calculosFolgas.filter(item => (item.colaborador.operacao || 'UMCA') === filtroOperacao);
  }, [calculosFolgas, filtroOperacao]);

  // Contadores por Operação
  const contadoresOperacao = useMemo(() => {
    const mapa: Record<'todas' | Operacao, number> = {
      todas: calculosFolgas.length,
      UMCA: 0,
      UMGE: 0,
      UMBC: 0,
      UMSS: 0,
    };
    calculosFolgas.forEach(item => {
      const op = item.colaborador.operacao || 'UMCA';
      if (op in mapa) {
        mapa[op]++;
      }
    });
    return mapa;
  }, [calculosFolgas]);

  // Filtragem completa da tabela
  const listaFiltrada = useMemo(() => {
    return basePorOperacao.filter(item => {
      const c = item.colaborador;
      const matchBusca =
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        String(c.chapa).includes(busca) ||
        c.funcao.toLowerCase().includes(busca.toLowerCase()) ||
        c.destino.toLowerCase().includes(busca.toLowerCase()) ||
        c.origem.toLowerCase().includes(busca.toLowerCase()) ||
        (c.operacao || '').toLowerCase().includes(busca.toLowerCase());

      if (!matchBusca) return false;

      if (filtroSituacao === 'todos') return true;
      return item.situacaoCor === filtroSituacao;
    });
  }, [basePorOperacao, busca, filtroSituacao]);

  // Contadores de situação (refletindo a operação selecionada)
  const contadores = useMemo(() => {
    const mapa = {
      todos: basePorOperacao.length,
      vermelho: 0,
      amarelo: 0,
      verde: 0,
      azul: 0,
      cinza: 0,
    };
    basePorOperacao.forEach(item => {
      mapa[item.situacaoCor]++;
    });
    return mapa;
  }, [basePorOperacao]);

  // RESTRIÇÃO DE ACESSO: Apenas Administrador
  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto my-10 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
          <Lock className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
            Acesso Restrito
          </span>
          <h1 className="text-xl font-bold text-slate-900">
            Controle de Folgas Exclusivo ao Administrador
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Por política de segurança e governança operacional (UMCA, UMGE, UMBC e UMSS), o módulo <strong>Controle de Folgas</strong> pode ser acessado apenas com credenciais de Administrador.
          </p>
        </div>

        <form onSubmit={handleLoginAdminInline} className="space-y-3 text-left pt-2">
          {erroLogin && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erroLogin}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Senha do Administrador
            </label>
            <input
              type="password"
              value={senhaAdmin}
              onChange={e => setSenhaAdmin(e.target.value)}
              placeholder="Digite a senha de Administrador"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Senha padrão inicial: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700">admin123</code>
            </p>
          </div>
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Desbloquear como Administrador</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Aba Oficial
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Acesso Administrador</span>
              </span>
              <span className="text-xs text-slate-500 font-mono">
                CONTROLE DE FOLGAS · {filtroOperacao === 'todas' ? 'TODAS OPERAÇÕES' : filtroOperacao}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Controle Individual de Folgas de Campo
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Filtro por operação (UMCA, UMGE, UMBC, UMSS) e edição rápida inline dos nomes dos colaboradores. Clique no ícone de lápis ao lado do nome para corrigir.
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

      {/* Filtros: Operação + Situação + Busca */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        {/* Linha 1: Filtro por Operação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Operação:</span>
            </span>
            <button
              onClick={() => setFiltroOperacao('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                filtroOperacao === 'todas'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todas ({contadoresOperacao.todas})
            </button>
            {OPERACOES.map(op => (
              <button
                key={op}
                onClick={() => setFiltroOperacao(op)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border font-mono ${
                  filtroOperacao === op
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50/50 text-blue-900 border-blue-200 hover:bg-blue-100'
                }`}
              >
                {op} ({contadoresOperacao[op]})
              </button>
            ))}
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

        {/* Linha 2: Filtro de Situação */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700 mr-1">Situação:</span>

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
      </div>

      {/* Tabela Principal de Controle de Folgas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Chapa</th>
                <th className="py-3 px-3">Operação</th>
                <th className="py-3 px-3">Colaborador (Edição Rápida)</th>
                <th className="py-3 px-3">Função</th>
                <th className="py-3 px-3">Escala</th>
                <th className="py-3 px-3">Origem &rarr; Destino</th>
                <th className="py-3 px-3">Última Folga</th>
                <th className="py-3 px-3">Próxima Data</th>
                <th className="py-3 px-3">Ciclo Atual</th>
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
                  const estaEditando = editandoNomeId === c.id;

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

                      {/* Operação */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                          {c.operacao || 'UMCA'}
                        </span>
                      </td>

                      {/* Colaborador com Edição Inline */}
                      <td className="py-3 px-3 min-w-[210px]">
                        {estaEditando ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={nomeTemp}
                              onChange={e => setNomeTemp(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') salvarNomeInline(c.id);
                                if (e.key === 'Escape') setEditandoNomeId(null);
                              }}
                              autoFocus
                              className="w-full bg-white border border-blue-500 rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                            <button
                              type="button"
                              onClick={() => salvarNomeInline(c.id)}
                              className="p-1 text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer"
                              title="Salvar nome"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoNomeId(null)}
                              className="p-1 text-slate-600 bg-slate-200 hover:bg-slate-300 rounded cursor-pointer"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="group flex items-center gap-1.5">
                            <span
                              onClick={() => iniciarEdicaoNome(c.id, c.nome)}
                              className="font-semibold text-slate-900 hover:text-blue-700 cursor-pointer"
                              title="Clique para corrigir o nome do funcionário"
                            >
                              {c.nome}
                            </span>
                            <button
                              type="button"
                              onClick={() => iniciarEdicaoNome(c.id, c.nome)}
                              className="p-0.5 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                              title="Corrigir nome do funcionário"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{c.telefone}</span>
                          <span>·</span>
                          <span>{c.beneficios.includes('aéreas') ? 'Aéreo/Rodov.' : 'Rodov.'}</span>
                        </div>
                      </td>

                      {/* Função */}
                      <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                        {c.funcao}
                      </td>

                      {/* Escala */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                          {c.trab}x{c.folga}
                        </span>
                      </td>

                      {/* Origem -> Destino */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="text-slate-900 font-medium">
                          {c.origem} &rarr; {c.destino}
                        </div>
                      </td>

                      {/* Última Folga */}
                      <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {formatarDataBR(c.ultimaFolga)}
                      </td>

                      {/* Próxima Data */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {formatarDataBR(item.proximaData)}
                      </td>

                      {/* Ciclo Atual */}
                      <td className="py-3 px-3 min-w-[130px]">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span>Dia {item.diasDecorridoCiclo}/{item.diasTotalCiclo}</span>
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

                      {/* Situação */}
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
