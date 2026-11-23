import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  UserPlus,
  Search,
  Edit,
  Trash2,
  Palmtree,
  CheckCircle,
  X,
  Phone,
  Plane,
  MapPin,
  Calendar,
  AlertCircle,
  Pencil,
  Check,
} from 'lucide-react';
import { Colaborador, TipoTransporte, BeneficiosTipo, Operacao, OPERACOES } from '../../types';
import { formatarDataBR } from '../../utils/dateUtils';

const ESCALAS_PRESET = [
  { label: '90x10 (90 dias trab x 10 folga)', trab: 90, folga: 10 },
  { label: '60x10 (60 dias trab x 10 folga)', trab: 60, folga: 10 },
  { label: '60x7 (60 dias trab x 7 folga)', trab: 60, folga: 7 },
  { label: '45x7 (45 dias trab x 7 folga)', trab: 45, folga: 7 },
  { label: '35x7 (35 dias trab x 7 folga)', trab: 35, folga: 7 },
  { label: '30x8 (30 dias trab x 8 folga)', trab: 30, folga: 8 },
  { label: '7x7 (7 dias trab x 7 folga)', trab: 7, folga: 7 },
  { label: 'Quinzenal (14x14)', trab: 14, folga: 14 },
];

export const CadastroColaboradores: React.FC = () => {
  const {
    colaboradores,
    adicionarColaborador,
    atualizarColaborador,
    removerColaborador,
    alternarFeriasColaborador,
    hoje,
  } = useApp();

  const [busca, setBusca] = useState('');
  const [filtroOperacao, setFiltroOperacao] = useState<'todas' | Operacao>('todas');
  const [filtroEscala, setFiltroEscala] = useState('todas');
  const [filtroFerias, setFiltroFerias] = useState<'todos' | 'ferias' | 'ativos'>('todos');

  // Edição rápida inline do nome
  const [editandoNomeId, setEditandoNomeId] = useState<string | null>(null);
  const [nomeInlineTemp, setNomeInlineTemp] = useState('');

  // Modais
  const [modalNovo, setModalNovo] = useState(false);
  const [modalEditar, setModalEditar] = useState<Colaborador | null>(null);
  const [colaboradorParaRemover, setColaboradorParaRemover] = useState<Colaborador | null>(null);

  // Form states
  const [formChapa, setFormChapa] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formOperacao, setFormOperacao] = useState<Operacao>('UMCA');
  const [formCentroCusto, setFormCentroCusto] = useState('UMCA');
  const [formFuncao, setFormFuncao] = useState('Eletricista III');
  const [formTrab, setFormTrab] = useState(60);
  const [formFolga, setFormFolga] = useState(10);
  const [formTransporte, setFormTransporte] = useState<TipoTransporte>('Aéreo');
  const [formOrigem, setFormOrigem] = useState('Parauapebas');
  const [formDestino, setFormDestino] = useState('Belo Horizonte');
  const [formBeneficios, setFormBeneficios] = useState<BeneficiosTipo>('Passagens aéreas e rodoviárias e táxi');
  const [formTelefone, setFormTelefone] = useState('(94) 90000-0099');
  const [formUltimaFolga, setFormUltimaFolga] = useState('2026-10-01');
  const [formFerias, setFormFerias] = useState(false);

  // Preenche dados ao abrir edição
  const handleAbrirEditar = (c: Colaborador) => {
    setModalEditar(c);
  };

  const handleSalvarEdicao = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditar) return;
    atualizarColaborador(modalEditar.id, modalEditar);
    setModalEditar(null);
  };

  const handleAbrirNovo = () => {
    const proximaChapa = Math.max(...colaboradores.map(c => c.chapa), 10800) + 1;
    setFormChapa(String(proximaChapa));
    setFormNome('');
    setFormOperacao('UMCA');
    setFormCentroCusto('UMCA');
    setFormFuncao('Mecânico III');
    setFormTrab(60);
    setFormFolga(10);
    setFormTransporte('Aéreo');
    setFormOrigem('Parauapebas');
    setFormDestino('');
    setFormBeneficios('Passagens aéreas e rodoviárias e táxi');
    setFormTelefone(`(94) 90000-00${Math.floor(Math.random() * 90 + 10)}`);
    setFormUltimaFolga('2026-10-15');
    setFormFerias(false);
    setModalNovo(true);
  };

  const [formErro, setFormErro] = useState<string | null>(null);

  const handleSalvarNovo = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErro(null);
    if (!formNome || !formChapa || !formDestino) {
      setFormErro('Preencha os campos obrigatórios (Chapa, Nome e Destino).');
      return;
    }

    adicionarColaborador({
      chapa: Number(formChapa),
      nome: formNome.trim(),
      operacao: formOperacao,
      centroCusto: (formCentroCusto || formOperacao).trim().toUpperCase(),
      funcao: formFuncao,
      trab: Number(formTrab),
      folga: Number(formFolga),
      transporte: formTransporte,
      origem: formOrigem,
      destino: formDestino.trim(),
      beneficios: formBeneficios,
      telefone: formTelefone,
      ultimaFolga: formUltimaFolga,
      ferias: formFerias,
      tipo: 'U&M',
    });

    setModalNovo(false);
  };

  const salvarNomeInline = (id: string) => {
    const limpo = nomeInlineTemp.trim();
    if (limpo.length >= 2) {
      atualizarColaborador(id, { nome: limpo });
    }
    setEditandoNomeId(null);
    setNomeInlineTemp('');
  };

  // Filtragem
  const colaboradoresFiltrados = useMemo(() => {
    return colaboradores.filter(c => {
      const matchTexto =
        c.nome.toLowerCase().includes(busca.toLowerCase()) ||
        String(c.chapa).includes(busca) ||
        c.funcao.toLowerCase().includes(busca.toLowerCase()) ||
        c.destino.toLowerCase().includes(busca.toLowerCase()) ||
        (c.operacao || '').toLowerCase().includes(busca.toLowerCase());

      if (!matchTexto) return false;

      if (filtroOperacao !== 'todas' && (c.operacao || 'UMCA') !== filtroOperacao) {
        return false;
      }

      if (filtroEscala !== 'todas') {
        const escalaStr = `${c.trab}x${c.folga}`;
        if (escalaStr !== filtroEscala) return false;
      }

      if (filtroFerias === 'ferias' && !c.ferias) return false;
      if (filtroFerias === 'ativos' && c.ferias) return false;

      return true;
    });
  }, [colaboradores, busca, filtroOperacao, filtroEscala, filtroFerias]);

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                Aba Oficial
              </span>
              <span className="text-xs text-slate-500 font-mono">
                CONTROLE · Cadastro de Colaboradores
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Quadro de Colaboradores de Campo
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Gestão cadastral, escalas individuais de trabalho x folga, origens, destinos e benefícios de transporte.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAbrirNovo}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Cadastrar Colaborador</span>
            </button>
          </div>
        </div>
      </div>

      {/* Controles e Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, chapa, função, destino..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Filtro Operação */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Operação:</span>
            <select
              value={filtroOperacao}
              onChange={e => setFiltroOperacao(e.target.value as 'todas' | Operacao)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-900"
            >
              <option value="todas">Todas</option>
              {OPERACOES.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {/* Filtro Escala */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Escala:</span>
            <select
              value={filtroEscala}
              onChange={e => setFiltroEscala(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900"
            >
              <option value="todas">Todas as Escalas</option>
              <option value="90x10">90x10</option>
              <option value="60x10">60x10</option>
              <option value="60x7">60x7</option>
              <option value="45x7">45x7</option>
              <option value="35x7">35x7</option>
              <option value="30x8">30x8</option>
              <option value="7x7">7x7</option>
              <option value="14x14">Quinzenal (14x14)</option>
            </select>
          </div>

          {/* Filtro Férias */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Status:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setFiltroFerias('todos')}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                  filtroFerias === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Todos ({colaboradores.length})
              </button>
              <button
                onClick={() => setFiltroFerias('ativos')}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                  filtroFerias === 'ativos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Ativos ({colaboradores.filter(c => !c.ferias).length})
              </button>
              <button
                onClick={() => setFiltroFerias('ferias')}
                className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                  filtroFerias === 'ferias' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
                }`}
              >
                Férias ({colaboradores.filter(c => c.ferias).length})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Colaboradores */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Chapa</th>
                <th className="py-3 px-3">Operação / CC</th>
                <th className="py-3 px-3">Nome do Colaborador</th>
                <th className="py-3 px-3">Função</th>
                <th className="py-3 px-3">Escala (Trab x Folga)</th>
                <th className="py-3 px-3">Origem & Destino</th>
                <th className="py-3 px-3">Transporte & Benefícios</th>
                <th className="py-3 px-3">Telefone (WhatsApp)</th>
                <th className="py-3 px-3">Última Folga</th>
                <th className="py-3 px-3">Férias</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {colaboradoresFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-500">
                    Nenhum colaborador encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                colaboradoresFiltrados.map(c => (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      c.ferias ? 'bg-slate-50/60 opacity-80' : ''
                    }`}
                  >
                    {/* Chapa */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900" data-tabular="true">
                      {c.chapa}
                    </td>

                    {/* Operação / CC */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                        {c.operacao || 'UMCA'}
                      </span>
                      {c.centroCusto && c.centroCusto !== c.operacao && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">CC: {c.centroCusto}</div>
                      )}
                    </td>

                    {/* Nome com edição rápida inline */}
                    <td className="py-3 px-3 min-w-[200px]">
                      {editandoNomeId === c.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={nomeInlineTemp}
                            onChange={e => setNomeInlineTemp(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') salvarNomeInline(c.id);
                              if (e.key === 'Escape') setEditandoNomeId(null);
                            }}
                            autoFocus
                            className="w-full bg-white border border-blue-500 rounded px-2 py-1 text-xs font-semibold text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => salvarNomeInline(c.id)}
                            className="p-1 text-white bg-emerald-600 hover:bg-emerald-700 rounded cursor-pointer"
                            title="Salvar nome"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoNomeId(null)}
                            className="p-1 text-slate-600 bg-slate-200 hover:bg-slate-300 rounded cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => {
                              setEditandoNomeId(c.id);
                              setNomeInlineTemp(c.nome);
                            }}
                            className="font-semibold text-slate-900 hover:text-blue-700 cursor-pointer"
                            title="Clique para corrigir o nome"
                          >
                            {c.nome}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoNomeId(c.id);
                              setNomeInlineTemp(c.nome);
                            }}
                            className="p-0.5 text-slate-400 hover:text-blue-600 rounded cursor-pointer"
                            title="Corrigir nome"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 font-mono">ID: {c.id}</div>
                    </td>

                    {/* Função */}
                    <td className="py-3 px-3 text-slate-700 font-medium whitespace-nowrap">
                      {c.funcao}
                    </td>

                    {/* Escala */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-900 border border-slate-200">
                        {c.trab} trab x {c.folga} folga
                      </span>
                    </td>

                    {/* Origem & Destino */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-900">{c.origem} &rarr; {c.destino}</div>
                      <div className="text-[11px] text-slate-500">Destino: {c.destino}</div>
                    </td>

                    {/* Transporte & Benefícios */}
                    <td className="py-3 px-3">
                      <div className="text-slate-800 font-medium">{c.transporte}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[170px]" title={c.beneficios}>
                        {c.beneficios}
                      </div>
                    </td>

                    {/* Telefone */}
                    <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                      {c.telefone}
                    </td>

                    {/* Última Folga */}
                    <td className="py-3 px-3 font-mono text-slate-800 whitespace-nowrap">
                      {formatarDataBR(c.ultimaFolga)}
                    </td>

                    {/* Férias */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <button
                        onClick={() => alternarFeriasColaborador(c.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer border ${
                          c.ferias
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <Palmtree className="w-3 h-3" />
                        <span>{c.ferias ? 'Em Férias' : 'Ativo'}</span>
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleAbrirEditar(c)}
                          className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Editar colaborador"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setColaboradorParaRemover(c)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Excluir colaborador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Cadastrar Novo Colaborador */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Novo Colaborador</h3>
                  <p className="text-xs text-slate-500">Cadastro no controle e cálculo de folgas</p>
                </div>
              </div>
              <button
                onClick={() => setModalNovo(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarNovo} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chapa (Matrícula) *</label>
                  <input
                    type="number"
                    value={formChapa}
                    onChange={e => setFormChapa(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={formNome}
                    onChange={e => setFormNome(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    placeholder="Ex: Carlos Eduardo Silveira"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operação *</label>
                  <select
                    value={formOperacao}
                    onChange={e => {
                      const op = e.target.value as Operacao;
                      setFormOperacao(op);
                      setFormCentroCusto(op);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-900"
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
                    value={formCentroCusto}
                    onChange={e => setFormCentroCusto(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-900"
                    placeholder="Ex: UMCA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Função / Cargo</label>
                  <input
                    type="text"
                    value={formFuncao}
                    onChange={e => setFormFuncao(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    placeholder="Ex: Eletricista III, Mecânico III..."
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telefone (WhatsApp)</label>
                  <input
                    type="text"
                    value={formTelefone}
                    onChange={e => setFormTelefone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                    placeholder="(94) 90000-00XX"
                  />
                </div>
              </div>

              {/* Escala (Guardada como 2 números separados trab x folga) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <label className="block font-semibold text-slate-800">
                  Periodicidade / Escala de Campo (Trabalho x Folga)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Dias de Trabalho</label>
                    <input
                      type="number"
                      value={formTrab}
                      onChange={e => setFormTrab(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-slate-900 font-bold"
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Dias de Folga</label>
                    <input
                      type="number"
                      value={formFolga}
                      onChange={e => setFormFolga(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-slate-900 font-bold"
                      min={1}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 mr-1">Predefinições rápidas:</span>
                  {ESCALAS_PRESET.map(pre => (
                    <button
                      key={pre.label}
                      type="button"
                      onClick={() => {
                        setFormTrab(pre.trab);
                        setFormFolga(pre.folga);
                      }}
                      className="text-[10px] bg-white border border-slate-200 hover:border-blue-400 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      {pre.trab}x{pre.folga}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Origem</label>
                  <input
                    type="text"
                    value={formOrigem}
                    onChange={e => setFormOrigem(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    placeholder="Parauapebas / Marabá"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destino (Residência) *</label>
                  <input
                    type="text"
                    value={formDestino}
                    onChange={e => setFormDestino(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    placeholder="Ex: Santarém, Belém, BH..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Transporte</label>
                  <select
                    value={formTransporte}
                    onChange={e => setFormTransporte(e.target.value as TipoTransporte)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-900"
                  >
                    <option value="Aéreo">Aéreo</option>
                    <option value="Rodoviário">Rodoviário</option>
                    <option value="Aéreo + Rodoviário">Aéreo + Rodoviário</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Benefícios</label>
                  <select
                    value={formBeneficios}
                    onChange={e => setFormBeneficios(e.target.value as BeneficiosTipo)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-900"
                  >
                    <option value="Passagens aéreas e rodoviárias e táxi">
                      Passagens aéreas e rodoviárias e táxi
                    </option>
                    <option value="Passagens rodoviárias e táxi">
                      Passagens rodoviárias e táxi
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data da Última Folga</label>
                  <input
                    type="date"
                    value={formUltimaFolga}
                    onChange={e => setFormUltimaFolga(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                    required
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formFerias}
                      onChange={e => setFormFerias(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">Colaborador em Férias</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNovo(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Colaborador */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Editar Cadastro: {modalEditar.nome}</h3>
              <button
                onClick={() => setModalEditar(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chapa</label>
                  <input
                    type="number"
                    value={modalEditar.chapa}
                    onChange={e => setModalEditar({ ...modalEditar, chapa: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={modalEditar.nome}
                    onChange={e => setModalEditar({ ...modalEditar, nome: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operação</label>
                  <select
                    value={modalEditar.operacao || 'UMCA'}
                    onChange={e => {
                      const op = e.target.value as Operacao;
                      setModalEditar({
                        ...modalEditar,
                        operacao: op,
                        centroCusto: modalEditar.centroCusto || op,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-900"
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
                    value={modalEditar.centroCusto || modalEditar.operacao || 'UMCA'}
                    onChange={e =>
                      setModalEditar({ ...modalEditar, centroCusto: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Função</label>
                  <input
                    type="text"
                    value={modalEditar.funcao}
                    onChange={e => setModalEditar({ ...modalEditar, funcao: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Telefone (WhatsApp)</label>
                  <input
                    type="text"
                    value={modalEditar.telefone}
                    onChange={e => setModalEditar({ ...modalEditar, telefone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dias Trabalho</label>
                  <input
                    type="number"
                    value={modalEditar.trab}
                    onChange={e => setModalEditar({ ...modalEditar, trab: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-slate-900 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dias Folga</label>
                  <input
                    type="number"
                    value={modalEditar.folga}
                    onChange={e => setModalEditar({ ...modalEditar, folga: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1.5 font-mono text-slate-900 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Origem</label>
                  <input
                    type="text"
                    value={modalEditar.origem}
                    onChange={e => setModalEditar({ ...modalEditar, origem: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destino</label>
                  <input
                    type="text"
                    value={modalEditar.destino}
                    onChange={e => setModalEditar({ ...modalEditar, destino: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data da Última Folga</label>
                  <input
                    type="date"
                    value={modalEditar.ultimaFolga}
                    onChange={e => setModalEditar({ ...modalEditar, ultimaFolga: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                    required
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modalEditar.ferias}
                      onChange={e => setModalEditar({ ...modalEditar, ferias: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-700">Colaborador em Férias</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEditar(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Salvar Edição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Confirmação de Exclusão */}
      {colaboradorParaRemover && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">Remover Colaborador</h3>
            </div>
            <p className="text-xs text-slate-600">
              Tem certeza que deseja remover <strong>{colaboradorParaRemover.nome}</strong> (Chapa {colaboradorParaRemover.chapa}) do quadro?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setColaboradorParaRemover(null)}
                className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  removerColaborador(colaboradorParaRemover.id);
                  setColaboradorParaRemover(null);
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded shadow-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
