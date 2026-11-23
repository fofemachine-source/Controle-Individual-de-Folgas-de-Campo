import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Printer,
  Shield,
  Eye,
  EyeOff,
  Send,
  CheckCircle,
  Calendar,
  AlertTriangle,
  Lock,
  Unlock,
  Car,
  Plane,
  Bus,
  Building2,
  HardHat,
  BarChart3,
} from 'lucide-react';
import { formatarDataBR, diffEmDias } from '../../utils/dateUtils';
import { mascararCPF, mascararRG } from '../../utils/formatters';
import { OPERACOES, Operacao, TipoHospedagem } from '../../types';
import { derivarTipoTransporte } from '../../utils/viagemUtils';

export const FichaSolicitacao: React.FC = () => {
  const { colaboradores, criarViagem, setActiveTab, hoje, isAdmin } = useApp();

  const colabInicial = colaboradores[0];
  const [colabSelecionadoId, setColabSelecionadoId] = useState<string>(colabInicial?.id || '');
  const [mostrarDadosSensiveis, setMostrarDadosSensiveis] = useState(false);

  // Campos do formulário oficial — Ficha Padrão
  const [tipoColab, setTipoColab] = useState<'U&M' | 'Terceiro'>(colabInicial?.tipo || 'U&M');
  const [nomeAvulso, setNomeAvulso] = useState(colabInicial?.nome || '');
  const [telefone, setTelefone] = useState(colabInicial?.telefone || '(94) 90000-0011');
  const [cpf, setCpf] = useState('000.000.000-00');
  const [rg, setRg] = useState('00.000.000-0');
  const [dataNascimento, setDataNascimento] = useState('1988-05-14');

  // Operação e Centro de Custo (integração direta aos Indicadores)
  const [operacao, setOperacao] = useState<Operacao>(colabInicial?.operacao || 'UMCA');
  const [centroCusto, setCentroCusto] = useState<string>(colabInicial?.centroCusto || colabInicial?.operacao || 'UMCA');

  // Itinerário e Trava "Somente Ida"
  const [motivoViagem, setMotivoViagem] = useState('Folga de campo');
  const [dataIda, setDataIda] = useState(hoje);
  const [dataVolta, setDataVolta] = useState(() => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + (colabInicial?.folga || 10));
    return d.toISOString().split('T')[0];
  });
  const [somenteIda, setSomenteIda] = useState<boolean>(false);
  const [somenteIdaDestravado, setSomenteIdaDestravado] = useState<boolean>(false);

  // Necessidades de transporte (Sim / Não)
  const [necessitaTaxi, setNecessitaTaxi] = useState<boolean>(true);
  const [necessitaAereo, setNecessitaAereo] = useState<boolean>(
    colabInicial ? colabInicial.transporte.includes('Aéreo') : true
  );
  const [necessitaRodoviario, setNecessitaRodoviario] = useState<boolean>(
    colabInicial ? colabInicial.transporte.includes('Rodoviário') : false
  );

  const [origem, setOrigem] = useState(colabInicial?.origem || 'Parauapebas');
  const [destino, setDestino] = useState(colabInicial?.destino || 'Belo Horizonte');
  const [solicitante, setSolicitante] = useState(`Logística ${colabInicial?.operacao || 'UMCA'}`);

  // Bloco Acesso à Obra (replicando o padrão exato da Solicitação de Hospedagem)
  const [acessoObra, setAcessoObra] = useState<boolean>(false);
  const [obraLocal, setObraLocal] = useState<string>(colabInicial?.operacao || 'UMCA');
  const [qrCode, setQrCode] = useState<boolean>(true);
  const [acessoEntrada, setAcessoEntrada] = useState<string>(hoje);
  const [acessoSaida, setAcessoSaida] = useState<string>('');
  const [diasNaObra, setDiasNaObra] = useState<string>('');
  const [motivoVisita, setMotivoVisita] = useState<string>('');
  const [enderecoVisitante, setEnderecoVisitante] = useState<string>('');

  // Bloco Hospedagem
  const [hospedagem, setHospedagem] = useState<boolean>(false);
  const [tipoHosp, setTipoHosp] = useState<TipoHospedagem>('Hotel');
  const [localHospedagem, setLocalHospedagem] = useState<string>('');
  const [checkIn, setCheckIn] = useState<string>('');
  const [checkOut, setCheckOut] = useState<string>('');

  const [observacoes, setObservacoes] = useState('Viagem programada para escala de campo');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const transporteDerivado = derivarTipoTransporte(necessitaAereo, necessitaRodoviario);

  // Ao trocar colaborador no select
  const handleSelecionarColab = (id: string) => {
    setColabSelecionadoId(id);
    if (id === 'avulso') {
      setTipoColab('Terceiro');
      setNomeAvulso('');
      setTelefone('');
      setOrigem('Parauapebas');
      setDestino('');
      return;
    }

    const c = colaboradores.find(col => col.id === id);
    if (c) {
      const op = c.operacao || 'UMCA';
      setTipoColab(c.tipo || 'U&M');
      setNomeAvulso(c.nome);
      setTelefone(c.telefone);
      setOperacao(op);
      setCentroCusto(c.centroCusto || op);
      setObraLocal(op);
      setSolicitante(`Logística ${op}`);
      setOrigem(c.origem);
      setDestino(c.destino);
      setNecessitaAereo(c.transporte.includes('Aéreo'));
      setNecessitaRodoviario(c.transporte.includes('Rodoviário'));
      setNecessitaTaxi(c.beneficios.toLowerCase().includes('táxi'));
      const dVolta = new Date(new Date(dataIda).getTime() + (c.folga || 10) * 86400000)
        .toISOString()
        .split('T')[0];
      setDataVolta(dVolta);
    }
  };

  const handleTrocarOperacao = (novaOp: Operacao) => {
    setOperacao(novaOp);
    if (OPERACOES.includes(centroCusto as Operacao) || !centroCusto.trim()) {
      setCentroCusto(novaOp);
    }
    setObraLocal(novaOp);
    setSolicitante(`Logística ${novaOp}`);
  };

  const handleImprimir = () => {
    window.print();
  };

  const handleCriarSolicitacao = (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro(null);

    if (!centroCusto.trim()) {
      setMensagemErro('Informe o Centro de Custo para consolidação na base de indicadores.');
      return;
    }
    if (!necessitaAereo && !necessitaRodoviario && !necessitaTaxi) {
      setMensagemErro('Selecione pelo menos uma necessidade de transporte (Táxi, Aéreo ou Rodoviário).');
      return;
    }
    if (!dataIda) {
      setMensagemErro('Preencha a data de ida.');
      return;
    }
    const efetivoSomenteIda = isAdmin && somenteIdaDestravado ? somenteIda : false;
    if (!efetivoSomenteIda && !dataVolta) {
      setMensagemErro('Preencha a data de volta (o campo "Somente Ida" está travado em Não).');
      return;
    }
    if (!efetivoSomenteIda && dataVolta < dataIda) {
      setMensagemErro('Validação: A data de volta não pode ser anterior à data de ida.');
      return;
    }

    const isAvulso = colabSelecionadoId === 'avulso';
    const cId = isAvulso ? 'avulso' : colabSelecionadoId;

    if (isAvulso && !nomeAvulso.trim()) {
      setMensagemErro('Informe o nome completo do passageiro avulso/terceiro.');
      return;
    }

    const ccNormalizado = centroCusto.trim().toUpperCase();

    const novaId = criarViagem({
      colabId: cId,
      passageiroNomeAvulso: isAvulso ? nomeAvulso.trim() : undefined,
      operacao,
      etapa: 'programada',
      motivo: motivoViagem as any,
      dataSolicitacao: hoje,
      ida: dataIda,
      volta: efetivoSomenteIda ? '' : dataVolta,
      somenteIda: efetivoSomenteIda,
      origem: origem.trim(),
      destino: destino.trim(),
      transporte: transporteDerivado,
      necessitaTaxi,
      necessitaAereo,
      necessitaRodoviario,
      solicitante: solicitante.trim(),
      custoPassagem: null,
      voucher: '',
      hospedagem,
      tipoHosp: hospedagem ? tipoHosp : 'N.A',
      localHosp: hospedagem ? localHospedagem || 'A definir' : 'N.A',
      checkInHosp: hospedagem ? checkIn : undefined,
      checkOutHosp: hospedagem ? checkOut : undefined,
      custoHospedagem: null,
      ocorrencia: 'Sem alteração',
      dataPrioritaria: false,
      folgaConforme: true,
      obs: observacoes,
      fichaOrigem: true,
      tipoColaborador: tipoColab,
      centroCusto: ccNormalizado,
      acessoObra,
      obraLocal: acessoObra ? obraLocal || operacao : undefined,
      acessoEntrada: acessoObra ? acessoEntrada : undefined,
      acessoSaida: acessoObra ? acessoSaida : undefined,
      qrCode: acessoObra ? qrCode : false,
      motivoVisita: acessoObra ? motivoVisita || 'Visita operacional' : 'N.A',
      diasNaObra: acessoObra && diasNaObra ? Number(diasNaObra) : undefined,
      enderecoVisitante: acessoObra ? enderecoVisitante || 'N.A' : 'N.A',
      anexos: {},
    });

    setMensagemSucesso(
      `Ficha Padrão #${novaId} registrada e integrada à Base de Indicadores no Centro de Custo ${ccNormalizado}!`
    );
  };

  const colabAtual = colaboradores.find(c => c.id === colabSelecionadoId);
  const antecedenciaDias = diffEmDias(dataIda, hoje);
  const podeAlterarSomenteIda = isAdmin && somenteIdaDestravado;

  const renderSimNao = (
    label: string,
    icon: React.ReactNode,
    valor: boolean,
    onChange: (v: boolean) => void
  ) => (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-2">
      <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`py-1.5 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
            valor
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
          }`}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`py-1.5 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
            !valor
              ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
          }`}
        >
          Não
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Aba Oficial
              </span>
              <span className="text-xs text-slate-500 font-mono">
                FICHA PADRÃO INTEGRADA · BASE_INDICADORES (CENTRO DE CUSTO)
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Ficha Padrão de Solicitação de Viagem, Hospedagem & Acesso à Obra
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Todas as solicitações preenchidas nesta Ficha Padrão alimentam automaticamente o Fluxo de Viagens e a Base de Indicadores consolidada por Centro de Custo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleImprimir}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Seleção Rápida de Colaborador + LGPD */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1">
            <span className="font-semibold text-slate-700 whitespace-nowrap">Carregar Colaborador:</span>
            <select
              value={colabSelecionadoId}
              onChange={e => handleSelecionarColab(e.target.value)}
              className="w-full sm:max-w-md bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium"
            >
              {colaboradores.map(c => (
                <option key={c.id} value={c.id}>
                  [{c.operacao || 'UMCA'}] {c.nome} (Chapa {c.chapa}) - {c.origem} &rarr; {c.destino}
                </option>
              ))}
              <option value="avulso">+ Novo Terceiro / Prestador Avulso</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600">Dados sensíveis (CPF/RG):</span>
            <button
              type="button"
              onClick={() => setMostrarDadosSensiveis(!mostrarDadosSensiveis)}
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              {mostrarDadosSensiveis ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ocultar</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Revelar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {mensagemErro && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{mensagemErro}</span>
          </div>
        )}

        {mensagemSucesso && (
          <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{mensagemSucesso}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('indicadores')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded font-semibold cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Ver Indicadores por CC</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('viagens')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 text-white hover:bg-emerald-800 rounded font-semibold cursor-pointer"
              >
                <span>Ir para Fluxo &rarr;</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formulário / Ficha Padrão Oficial */}
      <div className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 shadow-sm print:shadow-none print:border-none print:p-0 max-w-4xl mx-auto">
        {/* Cabeçalho Oficial */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Logística de Campo & Manutenção · U&M
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                FICHA PADRÃO DE SOLICITAÇÃO DE VIAGEM
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Centro de Operações CAN · Operação {operacao} · Integrada à Base de Indicadores
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded">
                CC: {centroCusto || 'NÃO DEFINIDO'}
              </span>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Data: {formatarDataBR(hoje)}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleCriarSolicitacao} className="space-y-6 text-xs">
          {/* SEÇÃO 1: DADOS DO PASSAGEIRO E CENTRO DE CUSTO */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>1. Dados do Passageiro & Centro de Custo</span>
              <span className="text-[11px] font-normal text-slate-500 lowercase">
                * integrado à consolidação de indicadores
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={colabAtual ? colabAtual.nome : nomeAvulso}
                  onChange={e => setNomeAvulso(e.target.value)}
                  readOnly={Boolean(colabAtual)}
                  className={`w-full border border-slate-300 rounded px-3 py-1.5 font-medium text-slate-900 ${
                    colabAtual ? 'bg-slate-100' : 'bg-slate-50'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operação *</label>
                <select
                  value={operacao}
                  onChange={e => handleTrocarOperacao(e.target.value as Operacao)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-900"
                >
                  {OPERACOES.map(op => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Centro de Custo *</span>
                </label>
                <input
                  type="text"
                  list="centros-custo-padrao"
                  value={centroCusto}
                  onChange={e => setCentroCusto(e.target.value.toUpperCase())}
                  placeholder="Ex: UMCA, UMGE, CC-1040"
                  className="w-full bg-blue-50/40 border border-blue-300 rounded px-2.5 py-1.5 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <datalist id="centros-custo-padrao">
                  {OPERACOES.map(op => (
                    <option key={op} value={op} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Vínculo</label>
                <select
                  value={tipoColab}
                  onChange={e => setTipoColab(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                >
                  <option value="U&M">U&M (Próprio)</option>
                  <option value="Terceiro">Terceiro / Consultoria</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Telefone (WhatsApp)</label>
                <input
                  type="text"
                  value={telefone}
                  onChange={e => setTelefone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data de Nascimento</label>
                <input
                  type={mostrarDadosSensiveis ? 'date' : 'text'}
                  value={mostrarDadosSensiveis ? dataNascimento : '••/••/••••'}
                  onChange={e => setDataNascimento(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">CPF (LGPD)</label>
                <input
                  type="text"
                  value={mostrarDadosSensiveis ? cpf : mascararCPF(cpf)}
                  onChange={e => setCpf(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">RG (LGPD)</label>
                <input
                  type="text"
                  value={mostrarDadosSensiveis ? rg : mascararRG(rg)}
                  onChange={e => setRg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: ITINERÁRIO, TRAVA "SOMENTE IDA" E NECESSIDADES DE TRANSPORTE */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              <span>2. Itinerário e Necessidades de Transporte</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo da Viagem</label>
                <select
                  value={motivoViagem}
                  onChange={e => setMotivoViagem(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                >
                  <option value="Folga de campo">Folga de campo</option>
                  <option value="Consultoria">Consultoria</option>
                  <option value="Treinamento">Treinamento</option>
                  <option value="Visita técnica">Visita técnica</option>
                  <option value="Outro">Outro</option>
                  <option value="N.A">N.A</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Solicitante</label>
                <input
                  type="text"
                  value={solicitante}
                  onChange={e => setSolicitante(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                />
              </div>

              {/* Campo Travado: Somente Ida */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 flex items-center gap-1">
                    {podeAlterarSomenteIda ? (
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>Somente Ida</span>
                  </label>
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (somenteIdaDestravado) {
                          setSomenteIda(false);
                          setSomenteIdaDestravado(false);
                        } else {
                          setSomenteIdaDestravado(true);
                        }
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      {somenteIdaDestravado ? 'Travar' : 'Destravar (Admin)'}
                    </button>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      Travado
                    </span>
                  )}
                </div>
                <select
                  value={somenteIda ? 'Sim' : 'Não'}
                  onChange={e => setSomenteIda(e.target.value === 'Sim')}
                  disabled={!podeAlterarSomenteIda}
                  title={
                    podeAlterarSomenteIda
                      ? 'Campo destravado pelo Administrador'
                      : 'Campo travado em "Não" (Ida e Volta obrigatório) para impedir alterações indevidas'
                  }
                  className={`w-full border rounded px-2.5 py-1.5 font-semibold ${
                    podeAlterarSomenteIda
                      ? 'bg-white border-emerald-400 text-slate-900'
                      : 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <option value="Não">Não (Ida e Volta obrigatório)</option>
                  <option value="Sim">Sim (Somente Ida)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Origem *</label>
                <input
                  type="text"
                  value={origem}
                  onChange={e => setOrigem(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destino *</label>
                <input
                  type="text"
                  value={destino}
                  onChange={e => setDestino(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data de Ida *</label>
                <input
                  type="date"
                  value={dataIda}
                  onChange={e => setDataIda(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Data de Volta {somenteIda ? '(N.A)' : '*'}
                </label>
                <input
                  type="date"
                  value={somenteIda ? '' : dataVolta}
                  onChange={e => setDataVolta(e.target.value)}
                  disabled={somenteIda}
                  className={`w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono ${
                    somenteIda ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 text-slate-900'
                  }`}
                  required={!somenteIda}
                />
              </div>
            </div>

            {/* Necessidades de Transporte (Sim / Não) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Necessidades de Transporte (Sim / Não):</span>
                <span className="text-[11px] font-mono text-slate-500">
                  Resumo: <strong className="text-slate-800">{transporteDerivado}</strong>
                  {necessitaTaxi ? ' + Táxi' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {renderSimNao(
                  'Necessita táxi?',
                  <Car className="w-4 h-4 text-amber-600" />,
                  necessitaTaxi,
                  setNecessitaTaxi
                )}
                {renderSimNao(
                  'Necessita aéreo?',
                  <Plane className="w-4 h-4 text-blue-600" />,
                  necessitaAereo,
                  setNecessitaAereo
                )}
                {renderSimNao(
                  'Necessita transporte rodoviário?',
                  <Bus className="w-4 h-4 text-emerald-600" />,
                  necessitaRodoviario,
                  setNecessitaRodoviario
                )}
              </div>
            </div>

            {/* Aviso de antecedência / SLA */}
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded bg-slate-50 border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-slate-600">
                Antecedência da data de ida: <strong className="font-mono text-slate-900">{antecedenciaDias} dias</strong>.
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  antecedenciaDias >= 20
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {antecedenciaDias >= 20 ? 'Dentro do prazo CAN (≥ 20d)' : 'Atenção: Fora do prazo padrão (< 20d)'}
              </span>
            </div>
          </div>

          {/* SEÇÃO 3: SOLICITAÇÃO DE ACESSO À OBRA & HOSPEDAGEM (MESMO PADRÃO VISUAL E FUNCIONAL) */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              <span>3. Solicitação de Acesso à Obra & Reserva de Hospedagem</span>
            </div>

            {/* Bloco 3A: Solicitação de Acesso à Obra (Replicando o padrão exato da Hospedagem) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={acessoObra}
                    onChange={e => setAcessoObra(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <HardHat className="w-4 h-4 text-amber-600" />
                  <span>Necessita de Solicitação de Acesso à Obra?</span>
                </label>
                {acessoObra && qrCode && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                    QR Code Obrigatório no Fluxo
                  </span>
                )}
              </div>

              {acessoObra ? (
                <div className="space-y-3 pt-2.5 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Local / Obra</label>
                      <select
                        value={obraLocal}
                        onChange={e => setObraLocal(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-medium"
                      >
                        {OPERACOES.map(op => (
                          <option key={op} value={op}>
                            Operação {op}
                          </option>
                        ))}
                        <option value="Outra Unidade">Outra Unidade</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Exige QR Code?</label>
                      <select
                        value={qrCode ? 'Sim' : 'Não'}
                        onChange={e => setQrCode(e.target.value === 'Sim')}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                      >
                        <option value="Sim">Sim</option>
                        <option value="Não">Não</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Entrada na Obra</label>
                      <input
                        type="date"
                        value={acessoEntrada}
                        onChange={e => setAcessoEntrada(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Saída da Obra</label>
                      <input
                        type="date"
                        value={acessoSaida}
                        onChange={e => setAcessoSaida(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Dias na Obra</label>
                      <input
                        type="number"
                        min={1}
                        placeholder="Ex: 5"
                        value={diasNaObra}
                        onChange={e => setDiasNaObra(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Motivo da Visita / Atividade na Obra
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Alinhamento de manutenção preventiva, auditoria técnica..."
                        value={motivoVisita}
                        onChange={e => setMotivoVisita(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Endereço Residencial Completo do Visitante / Colaborador
                    </label>
                    <input
                      type="text"
                      placeholder="Rua, Número, Bairro, Cidade/UF"
                      value={enderecoVisitante}
                      onChange={e => setEnderecoVisitante(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">
                  Acesso à Obra: N.A (sem necessidade de liberação de acesso ou emissão de QR Code).
                </div>
              )}
            </div>

            {/* Bloco 3B: Solicitação de Hospedagem */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={hospedagem}
                    onChange={e => setHospedagem(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Necessita de Reserva de Hospedagem?</span>
                </label>
                {hospedagem && tipoHosp === 'Hotel' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                    PDF Reserva Obrigatório no Fluxo
                  </span>
                )}
              </div>

              {hospedagem ? (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2.5 border-t border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tipo</label>
                    <select
                      value={tipoHosp}
                      onChange={e => setTipoHosp(e.target.value as TipoHospedagem)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    >
                      <option value="Hotel">Hotel</option>
                      <option value="República">República</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Local da Hospedagem</label>
                    <input
                      type="text"
                      placeholder="Ex: Hotel Ibis ou República UMCA"
                      value={localHospedagem}
                      onChange={e => setLocalHospedagem(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Check-in</label>
                    <input
                      type="date"
                      value={checkIn}
                      onChange={e => setCheckIn(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Check-out</label>
                    <input
                      type="date"
                      value={checkOut}
                      onChange={e => setCheckOut(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500">
                  Hospedagem: N.A (colaborador em residência própria ou sem pernoite).
                </div>
              )}
            </div>

            {/* Observações */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Observações Gerais (ex.: "destino final Oriximiná", restrições de escala)
              </label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-slate-900 text-xs"
              />
            </div>
          </div>

          {/* Assinaturas para Impressão */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-b border-slate-400 mb-1 h-8"></div>
              <div className="font-semibold text-slate-800">Assinatura do Solicitante</div>
              <div className="text-[10px] text-slate-500">{solicitante} · CC {centroCusto}</div>
            </div>
            <div>
              <div className="border-b border-slate-400 mb-1 h-8"></div>
              <div className="font-semibold text-slate-800">Aprovação Gestão / RH</div>
              <div className="text-[10px] text-slate-500">CAN – Logística de Manutenção</div>
            </div>
          </div>

          {/* Botão de Envio */}
          <div className="no-print pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>Registrar Ficha & Integrar aos Indicadores</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
