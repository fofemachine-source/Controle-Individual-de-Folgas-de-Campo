import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  MessageCircle,
  ExternalLink,
  Copy,
  CheckCircle,
  Clock,
  Send,
  Ticket,
  Calendar,
  RefreshCw,
  Bell,
  Trash2,
  Check,
  Bot,
  Zap,
} from 'lucide-react';
import { formatarDataBR } from '../../utils/dateUtils';
import { gerarLinkWhatsApp } from '../../utils/formatters';
import { TipoAviso } from '../../types';

export const AvisosColaborador: React.FC = () => {
  const {
    avisos,
    colaboradores,
    marcarAvisoEnviado,
    removerAviso,
    executarRotinaDiaria,
    avisosNaoEnviadosCount,
    hoje,
  } = useApp();

  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoAviso>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'enviados'>('todos');
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [mensagemAutomacao, setMensagemAutomacao] = useState<string | null>(null);
  const [modalWebhook, setModalWebhook] = useState(false);

  const getColab = (cId: string) => colaboradores.find(c => c.id === cId);

  const handleCopiarTexto = (id: string, texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2500);
  };

  const handleExecutarRotina = () => {
    const res = executarRotinaDiaria();
    if (res.log.length > 0 || res.avisosCriados > 0) {
      setMensagemAutomacao(`Rotina executada com sucesso! ${res.avisosCriados} novo(s) lembrete(s) gerado(s).`);
    } else {
      setMensagemAutomacao('Rotina diária executada: nenhum novo lembrete pendente para hoje.');
    }
    setTimeout(() => setMensagemAutomacao(null), 4000);
  };

  // Filtragem
  const avisosFiltrados = avisos.filter(a => {
    if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false;
    if (filtroStatus === 'pendentes' && a.enviado) return false;
    if (filtroStatus === 'enviados' && !a.enviado) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Banner Superior */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Aba Oficial
              </span>
              <span className="text-xs text-slate-500 font-mono">
                AVISOS AO COLABORADOR · WhatsApp
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
              Central de Comunicação & Avisos WhatsApp
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Disparo de vouchers, lembretes de viagem (3 dias antes), avisos de retorno e remarcações diretamente no celular do colaborador.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExecutarRotina}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-lg transition-colors cursor-pointer"
              title="Executa a verificação de viagens dos próximos 3 dias e conclusões"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Rodar Verificação Diária (Lembretes)</span>
            </button>

            <button
              onClick={() => setModalWebhook(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 shrink-0" />
              <span>WhatsApp Business API</span>
            </button>
          </div>
        </div>

        {mensagemAutomacao && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{mensagemAutomacao}</span>
          </div>
        )}
      </div>

      {/* Barra de Filtros e Contadores */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Filtro por Status */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Status:</span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setFiltroStatus('todos')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filtroStatus === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Todos ({avisos.length})
            </button>
            <button
              onClick={() => setFiltroStatus('pendentes')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filtroStatus === 'pendentes' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'
              }`}
            >
              Pendentes ({avisosNaoEnviadosCount})
            </button>
            <button
              onClick={() => setFiltroStatus('enviados')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                filtroStatus === 'enviados' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Enviados ({avisos.length - avisosNaoEnviadosCount})
            </button>
          </div>
        </div>

        {/* Filtro por Tipo */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-700">Tipo:</span>
          {(['todos', 'Voucher', 'Lembrete', 'Próxima folga', 'Remarcação'] as const).map(tipo => (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(tipo)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                filtroTipo === tipo
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tipo === 'todos' ? 'Todos os Tipos' : tipo}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Mensagens do WhatsApp */}
      <div className="space-y-4">
        {avisosFiltrados.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500">
            <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">Nenhum aviso encontrado com os filtros selecionados.</p>
            <p className="text-xs text-slate-400 mt-1">
              Os avisos são gerados automaticamente quando uma passagem é comprada, quando faltam 3 dias para a viagem, ou quando uma folga é concluída.
            </p>
          </div>
        ) : (
          avisosFiltrados.map(aviso => {
            const colab = getColab(aviso.colabId);
            const linkWhats = colab ? gerarLinkWhatsApp(colab.telefone, aviso.texto) : '#';

            let tipoBadge = 'bg-slate-100 text-slate-700';
            let Icone = MessageCircle;

            if (aviso.tipo === 'Voucher') {
              tipoBadge = 'bg-blue-100 text-blue-800 border-blue-200';
              Icone = Ticket;
            } else if (aviso.tipo === 'Lembrete') {
              tipoBadge = 'bg-amber-100 text-amber-800 border-amber-200';
              Icone = Bell;
            } else if (aviso.tipo === 'Próxima folga') {
              tipoBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
              Icone = Calendar;
            } else if (aviso.tipo === 'Remarcação') {
              tipoBadge = 'bg-purple-100 text-purple-800 border-purple-200';
              Icone = RefreshCw;
            }

            return (
              <div
                key={aviso.id}
                className={`bg-white border rounded-xl p-4 sm:p-5 shadow-xs transition-all ${
                  !aviso.enviado
                    ? 'border-amber-300 ring-1 ring-amber-100'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg border shrink-0 ${tipoBadge}`}>
                      <Icone className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {colab?.nome || 'Colaborador não identificado'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          Chapa {colab?.chapa || '—'}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.2 rounded border ${tipoBadge}`}>
                          {aviso.tipo}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                        <span>WhatsApp: <strong className="font-mono text-slate-700">{colab?.telefone || '—'}</strong></span>
                        <span>·</span>
                        <span>Gerado em: {formatarDataBR(aviso.criado)}</span>
                        {aviso.enviado && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Enviado {aviso.dataEnvio ? `em ${formatarDataBR(aviso.dataEnvio)}` : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Botão Abrir no WhatsApp */}
                    <a
                      href={linkWhats}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir no WhatsApp</span>
                    </a>

                    {/* Copiar Texto */}
                    <button
                      onClick={() => handleCopiarTexto(aviso.id, aviso.texto)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiadoId === aviso.id ? 'Copiado!' : 'Copiar'}</span>
                    </button>

                    {/* Marcar como enviado / alternar */}
                    <button
                      onClick={() => marcarAvisoEnviado(aviso.id, !aviso.enviado)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer border ${
                        aviso.enviado
                          ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-semibold'
                      }`}
                      title={aviso.enviado ? 'Marcar como não enviado' : 'Marcar como enviado'}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{aviso.enviado ? 'Enviado' : 'Marcar Enviado'}</span>
                    </button>

                    {/* Excluir aviso */}
                    <button
                      onClick={() => removerAviso(aviso.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Excluir aviso"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Conteúdo da Mensagem em Balão WhatsApp */}
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-3.5">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Prévia da Mensagem Formatada:
                  </div>
                  <pre className="text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {aviso.texto}
                  </pre>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Integração WhatsApp Business API */}
      {modalWebhook && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Estrutura para WhatsApp Business API
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pronto para envio automático via Webhook ou Meta Cloud API
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalWebhook(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                O aplicativo já gera mensagens normalizadas com identificação de colaborador, telefone limpo com DDI e tipos padronizados. Abaixo está o payload JSON compatível com a API oficial:
              </p>

              <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
                <pre>{JSON.stringify(
                  {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: '5594900000011',
                    type: 'text',
                    text: {
                      preview_url: false,
                      body: 'Olá, Carlos Eduardo! Sua passagem para a folga foi emitida...',
                    },
                    metadata: {
                      sistema: 'Controle de Folgas e Viagens – UMCA',
                      tipo: 'Voucher',
                      criadoEm: hoje,
                    },
                  },
                  null,
                  2
                )}</pre>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                <strong>Status da Integração:</strong>
                <p className="mt-0.5">
                  Hoje os envios são feitos via link direto <code>wa.me</code> (abertura imediata com o texto pronto no app ou Web). Para ativar o envio autônomo de servidor, basta conectar o endpoint da API na aba de Orientações.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setModalWebhook(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
