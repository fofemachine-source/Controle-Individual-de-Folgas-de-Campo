import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  HelpCircle,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCcw,
  Copy,
  Check,
  Code2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

const SCRIPT_APPS_SCRIPT = `/**
 * Folgas e Viagens – versão 2 (Google Apps Script).
 * Dados nas abas Colaboradores, Viagens e Avisos desta planilha.
 * Não usa Gemini, chaves de API nem contas de serviço.
 */
const ABAS = {
  Colaboradores: ['id','chapa','nome','funcao','trab','folga','origem','destino','transporte','telefone','ultimaFolga','beneficios','ferias'],
  Viagens: ['id','colabId','etapa','motivo','dataSolicitacao','ida','volta','origem','destino','transporte','solicitante',
            'custoPassagem','voucher','hospedagem','tipoHosp','localHosp','custoHospedagem','ocorrencia',
            'dataPrioritaria','folgaConforme','obs'],
  Avisos: ['id','key','colabId','tipo','texto','criado','enviado']
};
const BOOL = ['ferias','hospedagem','dataPrioritaria','folgaConforme','enviado'];
const NUM = ['trab','folga'];
const DATAS = ['ultimaFolga','dataSolicitacao','ida','volta','criado'];
const JANELA = 30, LEMBRETE = 3;

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Folgas e Viagens')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Sistema de folgas')
    .addItem('Ativar automação diária (6h)', 'instalarGatilho')
    .addItem('Rodar automação agora', 'lembretesDiarios')
    .addToUi();
}

/* ---------- planilha ---------- */
function aba_(nome) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nome);
  if (!sh) {
    sh = ss.insertSheet(nome);
    sh.getRange(1, 1, 1, ABAS[nome].length).setValues([ABAS[nome]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function paraISO_(v) {
  const m = String(v).match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})$/);
  return m ? m[3] + '-' + m[2] + '-' + m[1] : String(v);
}
function lerAba_(nome) {
  const sh = aba_(nome), cols = ABAS[nome], n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, cols.length).getDisplayValues().filter(r => r[0]).map(r => {
    const o = {};
    cols.forEach((c, i) => {
      let v = r[i];
      if (BOOL.includes(c)) v = ['sim', 'true', 'verdadeiro'].includes(String(v).toLowerCase());
      else if (NUM.includes(c)) v = Number(v) || 0;
      else if (DATAS.includes(c) && v) v = paraISO_(v);
      o[c] = v;
    });
    return o;
  });
}
function gravarAba_(nome, lista) {
  const sh = aba_(nome), cols = ABAS[nome], last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, cols.length).clearContent();
  if (!lista || !lista.length) return;
  const linhas = lista.map(o => cols.map(c => {
    const v = o[c];
    if (BOOL.includes(c)) return v ? 'Sim' : 'Não';
    return (v === undefined || v === null) ? '' : String(v);
  }));
  const rg = sh.getRange(2, 1, linhas.length, cols.length);
  rg.setNumberFormat('@');
  rg.setValues(linhas);
}

/* ---------- chamadas da página ---------- */
function getData() {
  return {
    colabs: lerAba_('Colaboradores'), viagens: lerAba_('Viagens'), avisos: lerAba_('Avisos'),
    aprovador: PropertiesService.getDocumentProperties().getProperty('aprovador') || 'Aprovador (RH)'
  };
}
function saveData(d) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(20000);
  try {
    gravarAba_('Colaboradores', d.colabs);
    gravarAba_('Viagens', d.viagens);
    gravarAba_('Avisos', d.avisos);
    PropertiesService.getDocumentProperties().setProperty('aprovador', d.aprovador || '');
  } finally { lock.releaseLock(); }
  return true;
}

/* ---------- automação diária (mesmas regras da tela) ---------- */
function hoje_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function d_(s) { const p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
function diff_(a, b) { return Math.round((d_(a) - d_(b)) / 864e5); }
function add_(s, n) { return Utilities.formatDate(new Date(d_(s) + Number(n) * 864e5), 'UTC', 'yyyy-MM-dd'); }
function br_(s) { return s ? s.split('-').reverse().join('/') : '—'; }
function id_() { return Utilities.getUuid().slice(0, 8); }

function lembretesDiarios() {
  const D = getData(), h = hoje_(), log = [];
  const colab = id => D.colabs.find(c => c.id === id);
  const pnome = c => String(c.nome || '').split(' ')[0];
  const ativa = v => v.etapa !== 'realizada' && v.ocorrencia !== 'Cancelada';
  const aviso = (key, colabId, tipo, texto) => {
    if (D.avisos.some(a => a.key === key)) return;
    D.avisos.unshift({ id: id_(), key, colabId, tipo, texto, criado: h, enviado: false });
  };

  // 1. programa folgas dos próximos 30 dias
  D.colabs.forEach(c => {
    if (c.ferias || !c.ultimaFolga) return;
    if (D.viagens.some(v => v.colabId === c.id && ativa(v))) return;
    const p = add_(c.ultimaFolga, c.trab);
    if (diff_(p, h) > JANELA) return;
    const ida = diff_(p, h) < 0 ? h : p;
    D.viagens.push({ id: id_(), colabId: c.id, etapa: 'programada', motivo: 'Folga de campo', dataSolicitacao: h, ida, volta: add_(ida, c.folga),
      origem: c.origem, destino: c.destino, transporte: c.transporte, solicitante: 'Logística', custoPassagem: '', voucher: '', hospedagem: false,
      tipoHosp: '', localHosp: '', custoHospedagem: '', ocorrencia: 'Sem alteração', dataPrioritaria: false, folgaConforme: true, obs: '' });
    log.push('Programada: ' + c.nome + ' (' + br_(ida) + ')');
  });

  // 2. passagem comprada + volta já passou -> realizada
  D.viagens.filter(v => v.etapa === 'comprada' && v.ocorrencia !== 'Cancelada' && v.volta && diff_(v.volta, h) < 0).forEach(v => {
    const c = colab(v.colabId); v.etapa = 'realizada';
    if (c) {
      c.ultimaFolga = v.ida;
      aviso('prox-' + v.id, c.id, 'Próxima folga', 'Olá, ' + pnome(c) + '! Sua próxima folga está prevista para ' + br_(add_(c.ultimaFolga, c.trab)) + ' (escala ' + c.trab + 'x' + c.folga + '). Avisaremos quando a passagem for comprada.');
      log.push('Concluída: ' + c.nome);
    }
  });

  // 3. lembretes de viagem
  D.viagens.filter(v => v.etapa === 'comprada' && v.ocorrencia !== 'Cancelada' && v.ida).forEach(v => {
    const dias = diff_(v.ida, h); if (dias < 0 || dias > LEMBRETE) return;
    const c = colab(v.colabId); if (!c) return;
    const quando = dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : 'em ' + dias + ' dias';
    aviso('lemb-' + v.id + '-' + v.ida, c.id, 'Lembrete', 'Olá, ' + pnome(c) + '! Lembrete: sua viagem é ' + quando + ', ' + br_(v.ida) + ' (' + v.origem + ' → ' + v.destino + '). Voucher/localizador: ' + (v.voucher || 'a confirmar') + '.');
  });

  saveData(D);

  // 4. resumo por e-mail
  const pend = D.avisos.filter(a => !a.enviado);
  const fazer = D.viagens.filter(v => ['programada', 'enviada', 'aprovada'].includes(v.etapa) && v.ocorrencia !== 'Cancelada');
  if (pend.length || fazer.length || log.length) {
    const linhas = [];
    if (log.length) linhas.push('O sistema fez sozinho hoje:\\n' + log.map(x => '• ' + x).join('\\n'));
    if (fazer.length) linhas.push('Pendências:\\n' + fazer.map(v => '• ' + ((colab(v.colabId) || {}).nome || '?') + ' – ' + v.etapa + ' – ida ' + br_(v.ida)).join('\\n'));
    if (pend.length) linhas.push(pend.length + ' aviso(s) prontos para enviar no WhatsApp.');
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Folgas e viagens – resumo de ' + br_(h),
      linhas.join('\\n\\n') + '\\n\\nAbra o sistema para resolver.');
  }
}

function instalarGatilho() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'lembretesDiarios').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('lembretesDiarios').timeBased().everyDays(1).atHour(6).create();
  SpreadsheetApp.getActiveSpreadsheet().toast('Automação diária ativada para as 6h.');
}`;

export const OrientacoesAjuda: React.FC = () => {
  const {
    exportarCSV,
    restaurarDadosIniciais,
    gasWebAppUrl,
    setGasWebAppUrl,
    sincronizarComGAS,
    gasStatus,
  } = useApp();

  const [copiadoScript, setCopiadoScript] = useState(false);

  const handleCopiarScript = () => {
    navigator.clipboard.writeText(SCRIPT_APPS_SCRIPT);
    setCopiadoScript(true);
    setTimeout(() => setCopiadoScript(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Banner Superior */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
            Aba Oficial
          </span>
          <span className="text-xs text-slate-500 font-mono">
            ORIENTAÇÕES · Regras de Negócio e Conexão Google Sheets
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mt-1">
          Orientações Técnicas e Integração da Logística
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600">
          Guia com os conceitos regulamentares do CAN (Controle de Viagens), regras de SLA, custos e script para Google Sheets.
        </p>
      </div>

      {/* Regras Oficiais do CAN */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Regras e Definições Regulamentares (CAN – Controle de Viagens)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Data da Solicitação & Prazo de 20 Dias</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              <strong>Data da solicitação:</strong> Data em que a equipe do CAN recebeu formalmente a solicitação de viagem. É indispensável para medir a conformidade de antecedência.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>Prazo de antecedência:</strong> Calculado como <code>Data de Ida − Data da Solicitação</code>. Se &ge; 20 dias, é classificado como <strong>"Dentro do prazo"</strong>. Se &lt; 20 dias, <strong>"Fora do prazo"</strong>.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Status da Viagem (Pendente vs Realizada)</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              O status é <strong>Realizada</strong> ou <strong>Pendente</strong>. Somente as viagens que alcançam a etapa final <em>"Realizada"</em> entram na contagem de viagens realizadas nos indicadores do CAN.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Ao concluir uma viagem, a data da última folga do colaborador é atualizada automaticamente para a data de ida, recalculando o próximo ciclo.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Ocorrências (Sem Alteração, Remarcada, Cancelada)</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              <strong>Sem alteração:</strong> Viagem executada conforme programado.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>Remarcada:</strong> Se a data de ida for alterada depois de aprovada/comprada, o sistema marca automaticamente como Remarcada e emite aviso aos envolvidos.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>Cancelada:</strong> Viagens canceladas <em>saem imediatamente do fluxo ativo e não somam custos</em> nos indicadores.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
              <span>Custos, Hospedagem e Datas Prioritárias</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              <strong>Custos:</strong> Valores efetivamente pagos em reais (R$) de passagem e hospedagem.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>Hospedagem:</strong> Identifica se a estadia foi em <em>República própria</em> ou em <em>Hotel</em> credenciado, medindo a taxa de ocupação.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>Data prioritária:</strong> Sim ou Não, conforme calendário aprovado pela gestão para períodos de alta demanda ou paradas operacionais.
            </p>
          </div>
        </div>
      </div>

      {/* Exportação e Backup CSV */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-600" />
          <span>Exportação de Dados em CSV (Compatível com Excel e Google Sheets)</span>
        </h2>
        <p className="text-xs text-slate-600">
          Você pode baixar a qualquer momento os arquivos CSV correspondentes a cada aba do sistema:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => exportarCSV('colaboradores')}
            className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Exportar Colaboradores.csv</span>
          </button>

          <button
            onClick={() => exportarCSV('viagens')}
            className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Exportar Viagens.csv</span>
          </button>

          <button
            onClick={() => exportarCSV('avisos')}
            className="flex items-center justify-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar Avisos WhatsApp.csv</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Quer resetar as informações para os dados originais?</span>
          <button
            onClick={restaurarDadosIniciais}
            className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
          >
            Restaurar Dados Fictícios de Demonstração
          </button>
        </div>
      </div>

      {/* Estrutura Google Sheets & Google Apps Script */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-600" />
              <span>Integração Google Apps Script & Google Sheets</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Estrutura pronta para usar uma planilha do Google Sheets como banco de dados em 3 abas (<code>Colaboradores</code>, <code>Viagens</code>, <code>Avisos</code>) com gatilho diário às 6h.
            </p>
          </div>
          <button
            onClick={handleCopiarScript}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            {copiadoScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiadoScript ? 'Copiado!' : 'Copiar Script GAS'}</span>
          </button>
        </div>

        {/* Conector Web App URL */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 text-xs">
          <label className="block font-semibold text-slate-800">
            URL do Web App do Google Apps Script (Opcional para Sincronização em Nuvem):
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              value={gasWebAppUrl}
              onChange={e => setGasWebAppUrl(e.target.value)}
              className="flex-1 bg-white border border-slate-300 rounded px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={sincronizarComGAS}
              disabled={gasStatus.loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded text-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {gasStatus.loading ? 'Sincronizando...' : 'Sincronizar com Planilha'}
            </button>
          </div>

          {gasStatus.message && (
            <div className={`p-2.5 rounded text-xs ${
              gasStatus.message.includes('sucesso')
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {gasStatus.message}
              {gasStatus.lastSync && <span className="ml-2 font-mono">({gasStatus.lastSync})</span>}
            </div>
          )}

          <div className="text-[11px] text-slate-500">
            <strong>Como configurar no Google Sheets:</strong> Abra sua planilha Google &rarr; Menu <em>Extensões</em> &rarr; <em>Apps Script</em> &rarr; Cole o código abaixo &rarr; Clique em <em>Implantar &rarr; Nova implantação &rarr; Aplicativo da Web</em> (acesso: "Qualquer pessoa"). Cole a URL gerada no campo acima.
          </div>
        </div>

        {/* Visualizador do Script Apps Script */}
        <div className="relative">
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-[350px] leading-relaxed">
            {SCRIPT_APPS_SCRIPT}
          </pre>
        </div>
      </div>
    </div>
  );
};
