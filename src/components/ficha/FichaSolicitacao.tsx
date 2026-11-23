import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Printer,
  Shield,
  Eye,
  EyeOff,
  Send,
  CheckCircle,
  Building2,
  Calendar,
  MapPin,
  QrCode,
  AlertTriangle,
} from 'lucide-react';
import { formatarDataBR, diffEmDias } from '../../utils/dateUtils';
import { mascararCPF, mascararRG } from '../../utils/formatters';

export const FichaSolicitacao: React.FC = () => {
  const { colaboradores, criarViagem, setActiveTab, hoje } = useApp();

  const [colabSelecionadoId, setColabSelecionadoId] = useState<string>(colaboradores[0]?.id || '');
  const [mostrarDadosSensiveis, setMostrarDadosSensiveis] = useState(false);

  // Campos do formulário oficial
  const [tipoColab, setTipoColab] = useState<'U&M' | 'Terceiro'>('U&M');
  const [nomeAvulso, setNomeAvulso] = useState('');
  const [telefone, setTelefone] = useState(colaboradores[0]?.telefone || '(94) 90000-0011');
  const [cpf, setCpf] = useState('000.000.000-00');
  const [rg, setRg] = useState('00.000.000-0');
  const [dataNascimento, setDataNascimento] = useState('1988-05-14');
  const [motivoViagem, setMotivoViagem] = useState('Folga de campo');
  const [dataIda, setDataIda] = useState(hoje);
  const [dataVolta, setDataVolta] = useState(() => {
    const d = new Date(hoje);
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  });
  const [transporte, setTransporte] = useState<'Aéreo' | 'Rodoviário' | 'Aéreo + Rodoviário'>('Aéreo');
  const [origem, setOrigem] = useState(colaboradores[0]?.origem || 'Parauapebas');
  const [destino, setDestino] = useState(colaboradores[0]?.destino || 'Belo Horizonte');
  const [solicitante, setSolicitante] = useState('Logística UMCA');
  const [centroCusto, setCentroCusto] = useState('UMCA');
  const [qrCode, setQrCode] = useState(true);
  const [motivoVisita, setMotivoVisita] = useState('N.A');
  const [diasNaObra, setDiasNaObra] = useState('N.A');
  const [enderecoVisitante, setEnderecoVisitante] = useState('N.A');
  const [hospedagem, setHospedagem] = useState(false);
  const [localHospedagem, setLocalHospedagem] = useState('N.A');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [observacoes, setObservacoes] = useState('Viagem programada para escala de campo');
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

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
      setTipoColab(c.tipo || 'U&M');
      setNomeAvulso(c.nome);
      setTelefone(c.telefone);
      setOrigem(c.origem);
      setDestino(c.destino);
      setTransporte(c.transporte);
      const dVolta = new Date(new Date(dataIda).getTime() + (c.folga || 10) * 86400000)
        .toISOString()
        .split('T')[0];
      setDataVolta(dVolta);
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const handleCriarSolicitacao = (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemErro(null);
    if (!dataIda || !dataVolta) {
      setMensagemErro('Preencha a data de ida e retorno.');
      return;
    }
    if (dataVolta < dataIda) {
      setMensagemErro('Validação: A data de volta não pode ser anterior à data de ida.');
      return;
    }

    let cId = colabSelecionadoId;
    if (colabSelecionadoId === 'avulso') {
      // Usa id temporário ou do primeiro colaborador
      cId = colaboradores[0]?.id || 'colab-1';
    }

    const novaId = criarViagem({
      colabId: cId,
      etapa: 'programada',
      motivo: motivoViagem as any,
      dataSolicitacao: hoje,
      ida: dataIda,
      volta: dataVolta,
      origem,
      destino,
      transporte,
      solicitante,
      custoPassagem: null,
      voucher: '',
      hospedagem,
      tipoHosp: hospedagem ? 'Hotel' : 'N.A',
      localHosp: hospedagem ? localHospedagem : 'N.A',
      custoHospedagem: null,
      ocorrencia: 'Sem alteração',
      dataPrioritaria: false,
      folgaConforme: true,
      obs: observacoes,
      tipoColaborador: tipoColab,
      centroCusto,
      qrCode,
      motivoVisita,
      diasNaObra: diasNaObra !== 'N.A' ? Number(diasNaObra) : undefined,
      enderecoVisitante,
    });

    setMensagemSucesso(`Ficha gravada e viagem #${novaId} criada com sucesso no fluxo!`);
    setTimeout(() => {
      setMensagemSucesso(null);
      setActiveTab('viagens');
    }, 2000);
  };

  const colabAtual = colaboradores.find(c => c.id === colabSelecionadoId);
  const antecedenciaDias = diffEmDias(dataIda, hoje);

  return (
    <div className="space-y-6">
      {/* Banner Superior com Controles de Impressão e Auto-Preenchimento */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Aba Oficial
              </span>
              <span className="text-xs text-slate-500 font-mono">
                FICHA PADRÃO DE SOLICITAÇÃO DE VIAGENS
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Ficha Padrão de Solicitação de Viagem – UMCA
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Formulário oficial corporativo com proteção de dados LGPD e emissão direta para o fluxo de aprovação.
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

        {/* Barra de Seleção Rápida de Colaborador */}
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
                  {c.nome} (Chapa {c.chapa} - {c.funcao}) - {c.origem} &rarr; {c.destino}
                </option>
              ))}
              <option value="avulso">+ Novo Terceiro / Prestador Avulso</option>
            </select>
          </div>

          {/* Toggle de Visualização de Dados Sensíveis (LGPD) */}
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
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
        )}
      </div>

      {/* Formulário / Ficha Oficial (Estilo Papel A4 Corporativo) */}
      <div className="bg-white border border-slate-300 rounded-xl p-6 sm:p-8 shadow-sm print:shadow-none print:border-none print:p-0 max-w-4xl mx-auto">
        {/* Cabeçalho Oficial da Ficha */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase font-extrabold tracking-wider text-slate-500">
                Logística de Campo & Manutenção
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                FICHA PADRÃO DE SOLICITAÇÃO DE VIAGEM
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Centro de Operações CAN · Polo Mineração Parauapebas / Marabá
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-900 text-white rounded">
                CC: {centroCusto}
              </span>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">
                Data: {formatarDataBR(hoje)}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleCriarSolicitacao} className="space-y-6 text-xs">
          {/* SEÇÃO 1: DADOS DO PASSAGEIRO */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
              <span>1. Dados do Passageiro</span>
              <span className="text-[11px] font-normal text-slate-500 lowercase">
                * Campos com proteção de privacidade
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={colabAtual ? colabAtual.nome : nomeAvulso}
                  onChange={e => setNomeAvulso(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 font-medium text-slate-900"
                  required
                />
              </div>

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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                <label className="block font-semibold text-slate-700 mb-1">CPF (Mascarado)</label>
                <input
                  type="text"
                  value={mostrarDadosSensiveis ? cpf : mascararCPF(cpf)}
                  onChange={e => setCpf(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">RG (Mascarado)</label>
                <input
                  type="text"
                  value={mostrarDadosSensiveis ? rg : mascararRG(rg)}
                  onChange={e => setRg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: DADOS DA VIAGEM & LOGÍSTICA */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              <span>2. Itinerário e Logística</span>
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
                  <option value="N.A">N.A</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo de Transporte</label>
                <select
                  value={transporte}
                  onChange={e => setTransporte(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                >
                  <option value="Aéreo">Aéreo</option>
                  <option value="Rodoviário">Rodoviário</option>
                  <option value="Aéreo + Rodoviário">Aéreo + Rodoviário</option>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Origem</label>
                <input
                  type="text"
                  value={origem}
                  onChange={e => setOrigem(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Destino</label>
                <input
                  type="text"
                  value={destino}
                  onChange={e => setDestino(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data de Ida</label>
                <input
                  type="date"
                  value={dataIda}
                  onChange={e => setDataIda(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data de Volta</label>
                <input
                  type="date"
                  value={dataVolta}
                  onChange={e => setDataVolta(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-slate-900"
                  required
                />
              </div>
            </div>

            {/* Aviso de antecedência / SLA */}
            <div className="flex items-center gap-2 p-2.5 rounded bg-slate-50 border border-slate-200">
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

          {/* SEÇÃO 3: ACESSO À OBRA E HOSPEDAGEM */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
              <span>3. Acesso à Obra, Segurança e Hospedagem</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Exige QR Code?</label>
                <select
                  value={qrCode ? 'Sim' : 'Não'}
                  onChange={e => setQrCode(e.target.value === 'Sim')}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                >
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Dias na Obra</label>
                <input
                  type="text"
                  placeholder="Ex: 5 ou N.A"
                  value={diasNaObra}
                  onChange={e => setDiasNaObra(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo da Visita / Atividade na Obra
                </label>
                <input
                  type="text"
                  placeholder="Ex: Alinhamento de preventiva ou N.A"
                  value={motivoVisita}
                  onChange={e => setMotivoVisita(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
                />
              </div>
            </div>

            {/* Endereço de visitante */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Para Visitante da Obra: Endereço Residencial Completo
              </label>
              <input
                type="text"
                placeholder="Endereço, Bairro, Cidade/UF ou N.A"
                value={enderecoVisitante}
                onChange={e => setEnderecoVisitante(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-slate-900"
              />
            </div>

            {/* Bloco de Hospedagem */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={hospedagem}
                    onChange={e => setHospedagem(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Necessita de Reserva de Hospedagem?</span>
                </label>
              </div>

              {hospedagem ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Local da Hospedagem</label>
                    <input
                      type="text"
                      placeholder="Ex: República UMCA Parauapebas ou Hotel Ibis"
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
              <div className="text-[10px] text-slate-500">{solicitante}</div>
            </div>
            <div>
              <div className="border-b border-slate-400 mb-1 h-8"></div>
              <div className="font-semibold text-slate-800">Aprovação Gestão / RH</div>
              <div className="text-[10px] text-slate-500">CAN – Logística de Manutenção</div>
            </div>
          </div>

          {/* Botão de Envio para o Fluxo */}
          <div className="no-print pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>Gerar Viagem no Fluxo Oficial</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
