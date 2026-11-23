import React, { useState } from 'react';
import {
  Flag,
  X,
  Upload,
  FileText,
  QrCode,
  Ticket,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Trash2,
  Car,
  Plane,
  Bus,
  Lock,
  Check,
  Building2,
} from 'lucide-react';
import { Viagem, Colaborador, ChaveAnexo, FlagStatus } from '../../types';
import {
  avaliarDocumentosViagem,
  obterNecessidadesTransporte,
  lerArquivoComoAnexo,
  formatarTamanhoArquivo,
} from '../../utils/viagemUtils';
import { formatarDataBR } from '../../utils/dateUtils';
import { useApp } from '../../context/AppContext';

interface EtapaAtualModalProps {
  viagem: Viagem;
  colaborador?: Colaborador;
  onClose: () => void;
  onSolicitarModalPassagem: (viagem: Viagem) => void;
}

const FLAG_STYLES: Record<FlagStatus, { badge: string; dot: string; border: string }> = {
  concluida: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'text-emerald-600',
    border: 'border-emerald-200 bg-emerald-50/40',
  },
  em_andamento: {
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    dot: 'text-amber-600',
    border: 'border-amber-200 bg-amber-50/40',
  },
  pendente: {
    badge: 'bg-slate-100 text-slate-600 border-slate-300',
    dot: 'text-slate-400',
    border: 'border-slate-200 bg-slate-50/60',
  },
  bloqueada: {
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    dot: 'text-rose-600',
    border: 'border-rose-200 bg-rose-50/40',
  },
  na: {
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'text-slate-400',
    border: 'border-slate-200 bg-slate-50/40',
  },
};

export const EtapaAtualModal: React.FC<EtapaAtualModalProps> = ({
  viagem,
  colaborador,
  onClose,
  onSolicitarModalPassagem,
}) => {
  const {
    anexarDocumentoViagem,
    removerDocumentoViagem,
    avancarEtapaViagem,
    hoje,
  } = useApp();

  const [erroUpload, setErroUpload] = useState<string | null>(null);
  const [erroAvanco, setErroAvanco] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const avaliacao = avaliarDocumentosViagem(viagem);
  const { necessitaTaxi, necessitaAereo, necessitaRodoviario } = obterNecessidadesTransporte(viagem);
  const nomeExibicao = viagem.passageiroNomeAvulso || colaborador?.nome || 'Não identificado';

  const handleUploadArquivo = async (chave: ChaveAnexo, file?: File) => {
    if (!file) return;
    setErroUpload(null);
    setErroAvanco(null);
    try {
      const anexo = await lerArquivoComoAnexo(file, hoje);
      anexarDocumentoViagem(viagem.id, chave, anexo);
      setSucessoMsg(`Documento "${file.name}" anexado com sucesso.`);
      setTimeout(() => setSucessoMsg(null), 3000);
    } catch (err: any) {
      setErroUpload(err?.message || 'Erro ao processar o arquivo.');
    }
  };

  const handleAvancar = () => {
    setErroAvanco(null);
    if (viagem.etapa === 'aprovada') {
      onSolicitarModalPassagem(viagem);
      return;
    }
    const res = avancarEtapaViagem(viagem.id);
    if (!res.ok && res.erro) {
      setErroAvanco(res.erro);
    } else if (res.ok) {
      setSucessoMsg('Etapa avançada com sucesso!');
      setTimeout(() => setSucessoMsg(null), 3000);
    }
  };

  const getDocIcon = (chave: ChaveAnexo) => {
    if (chave === 'voucherAereo') return <Ticket className="w-4 h-4 text-blue-600" />;
    if (chave === 'reservaHotel') return <FileText className="w-4 h-4 text-indigo-600" />;
    return <QrCode className="w-4 h-4 text-amber-600" />;
  };

  const isCancelada = viagem.ocorrencia === 'Cancelada';
  const bloqueadoPorDocs = viagem.etapa === 'comprada' && !avaliacao.todosObrigatoriosAnexados;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Cabeçalho da Janela "Etapa Atual" */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600/20 border border-blue-400/30 rounded-xl text-blue-300 mt-0.5">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600 text-white">
                  Etapa Atual
                </span>
                <span className="font-mono text-xs text-slate-300">
                  CC: {viagem.centroCusto || viagem.operacao || 'UMCA'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    avaliacao.statusProcesso === 'concluida'
                      ? 'bg-emerald-500 text-white'
                      : avaliacao.statusProcesso === 'cancelada'
                      ? 'bg-rose-500 text-white'
                      : avaliacao.statusProcesso === 'pronta_concluir'
                      ? 'bg-blue-500 text-white'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  <Flag className="w-3 h-3" />
                  <span>{avaliacao.statusProcessoTexto}</span>
                </span>
              </div>
              <h3 className="font-bold text-lg mt-1">{nomeExibicao}</h3>
              <p className="text-xs text-slate-300 font-mono">
                {viagem.origem} &rarr; {viagem.destino} · Ida: {formatarDataBR(viagem.ida)} · Volta:{' '}
                {viagem.somenteIda ? 'Somente Ida' : formatarDataBR(viagem.volta)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Alerta da Regra de Documentos Obrigatórios */}
          {!isCancelada && !avaliacao.todosObrigatoriosAnexados && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-950">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Processo em Andamento — Documentação Obrigatória Pendente</div>
                <p className="text-amber-900 mt-0.5">
                  O processo permanecerá <strong>Em Andamento</strong> e não poderá ser finalizado como <em>Realizada</em> até que todos os documentos obrigatórios abaixo estejam anexados:{' '}
                  <strong>{avaliacao.pendentes.map(p => p.label).join(', ')}</strong>.
                </p>
              </div>
            </div>
          )}

          {erroUpload && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erroUpload}</span>
            </div>
          )}

          {erroAvanco && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erroAvanco}</span>
            </div>
          )}

          {sucessoMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sucessoMsg}</span>
            </div>
          )}

          {/* Resumo de Necessidades de Transporte & Trava Somente Ida */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Car className="w-3.5 h-3.5 text-amber-600" />
                Táxi
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                  necessitaTaxi ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {necessitaTaxi ? 'Sim' : 'Não'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Plane className="w-3.5 h-3.5 text-blue-600" />
                Aéreo
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                  necessitaAereo ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {necessitaAereo ? 'Sim' : 'Não'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Bus className="w-3.5 h-3.5 text-emerald-600" />
                Rodoviário
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                  necessitaRodoviario ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {necessitaRodoviario ? 'Sim' : 'Não'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1 font-semibold text-slate-700">
                <Lock className="w-3 h-3 text-amber-600" />
                Somente Ida
              </span>
              <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-200 text-slate-700">
                {viagem.somenteIda ? 'Sim' : 'Não'}
              </span>
            </div>
          </div>

          {/* PAINEL 1: STATUS DAS ETAPAS EM FORMATO DE FLAG */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Flag className="w-4 h-4 text-blue-600" />
                <span>Status de Cada Etapa (Flags de Acompanhamento)</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-500">
                Docs obrigatórios: <strong>{avaliacao.percentualDocs}%</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {avaliacao.flagsEtapas.map(flag => {
                const st = FLAG_STYLES[flag.status];
                return (
                  <div
                    key={flag.id}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-2.5 ${st.border}`}
                  >
                    <div className="flex items-start gap-2">
                      <Flag className={`w-4 h-4 shrink-0 mt-0.5 ${st.dot}`} />
                      <div>
                        <div className="font-bold text-slate-900">{flag.titulo}</div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{flag.subtitulo}</div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${st.badge}`}
                    >
                      {flag.labelFlag}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAINEL 2: ANEXOS OBRIGATÓRIOS DO FLUXO DE VIAGEM */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Anexos da Viagem (PDF Reserva Hotel, QR Code & Voucher Aéreo)</span>
              </h4>
              <span className="text-[11px] text-slate-500">PDF ou Imagem (até 2 MB)</span>
            </div>

            <div className="space-y-2.5">
              {avaliacao.documentos.map(doc => {
                const statusFlag: FlagStatus = doc.anexado
                  ? 'concluida'
                  : doc.obrigatorio
                  ? 'bloqueada'
                  : 'na';
                const st = FLAG_STYLES[statusFlag];

                return (
                  <div
                    key={doc.chave}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${st.border}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 shrink-0">
                        {getDocIcon(doc.chave)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">{doc.label}</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold border ${st.badge}`}
                          >
                            <Flag className="w-2.5 h-2.5" />
                            <span>
                              {doc.anexado
                                ? 'Anexado'
                                : doc.obrigatorio
                                ? 'Obrigatório Pendente'
                                : 'Opcional / N.A'}
                            </span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{doc.descricao}</div>

                        {doc.anexo && (
                          <div className="mt-1.5 inline-flex items-center gap-2 bg-white px-2.5 py-1 rounded border border-emerald-200 text-[11px] text-emerald-900 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[220px]" title={doc.anexo.nome}>
                              {doc.anexo.nome}
                            </span>
                            <span className="text-slate-400">
                              ({formatarTamanhoArquivo(doc.anexo.tamanho)})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {doc.anexo && (
                        <>
                          <a
                            href={doc.anexo.dataUrl}
                            download={doc.anexo.nome}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                            title="Baixar / visualizar anexo"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => removerDocumentoViagem(viagem.id, doc.chave)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Remover anexo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{doc.anexo ? 'Substituir' : 'Anexar'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadArquivo(doc.chave, f);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metadados extras (Hospedagem & Obra) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-800 flex items-center gap-1 mb-0.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Hospedagem</span>
              </div>
              {viagem.hospedagem ? (
                <div>
                  {viagem.tipoHosp} — <strong>{viagem.localHosp || 'A definir'}</strong>
                </div>
              ) : (
                <div>N.A (sem reserva de hospedagem)</div>
              )}
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-800 flex items-center gap-1 mb-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Acesso à Obra / QR Code</span>
              </div>
              {viagem.acessoObra || viagem.qrCode ? (
                <div>
                  Obra: <strong>{viagem.obraLocal || viagem.operacao || 'UMCA'}</strong> · QR Code:{' '}
                  <strong>{viagem.qrCode ? 'Exigido' : 'Não'}</strong>
                </div>
              ) : (
                <div>N.A (sem solicitação de acesso à obra)</div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé da Janela */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            Fechar Janela
          </button>

          {!isCancelada && viagem.etapa !== 'realizada' && (
            <button
              type="button"
              onClick={handleAvancar}
              disabled={bloqueadoPorDocs}
              title={
                bloqueadoPorDocs
                  ? 'Anexe todos os documentos obrigatórios para liberar a conclusão da viagem'
                  : 'Avançar para a próxima etapa do fluxo'
              }
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-xs transition-colors ${
                bloqueadoPorDocs
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {viagem.etapa === 'comprada'
                  ? bloqueadoPorDocs
                    ? 'Aguardando Documentos Obrigatórios'
                    : 'Concluir Viagem (Realizada)'
                  : viagem.etapa === 'aprovada'
                  ? 'Registrar Passagem Comprada'
                  : 'Avançar para Próxima Etapa'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
