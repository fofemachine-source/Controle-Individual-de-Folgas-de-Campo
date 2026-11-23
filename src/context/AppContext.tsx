import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Colaborador,
  Viagem,
  Aviso,
  CalculoFolga,
  IndicadoresCAN,
  EtapaViagem,
} from '../types';
import {
  COLABORADORES_INICIAIS,
  VIAGENS_INICIAIS,
  AVISOS_INICIAIS,
} from '../data/initialData';
import {
  somarDias,
  diffEmDias,
  formatarDataBR,
  obterHojeISO,
} from '../utils/dateUtils';
import { formatarMoeda } from '../utils/formatters';

interface ModalPassagemPayload {
  custoPassagem: number;
  voucher: string;
  hospedagem: boolean;
  tipoHosp: 'República' | 'Hotel' | 'N.A';
  localHosp: string;
  custoHospedagem: number | null;
}

interface AppContextType {
  hoje: string;
  setHoje: (data: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  colaboradores: Colaborador[];
  viagens: Viagem[];
  avisos: Aviso[];
  aprovadorNome: string;
  setAprovadorNome: (nome: string) => void;
  gasWebAppUrl: string;
  setGasWebAppUrl: (url: string) => void;
  gasStatus: { loading: boolean; message: string; lastSync?: string };

  // Cálculos e Indicadores
  calculosFolgas: CalculoFolga[];
  indicadores: IndicadoresCAN;
  avisosNaoEnviadosCount: number;

  // Ações de Colaborador
  adicionarColaborador: (c: Omit<Colaborador, 'id'>) => void;
  atualizarColaborador: (id: string, c: Partial<Colaborador>) => void;
  removerColaborador: (id: string) => void;
  alternarFeriasColaborador: (id: string) => void;

  // Ações de Viagem
  criarViagem: (v: Omit<Viagem, 'id'>) => string;
  atualizarViagem: (id: string, v: Partial<Viagem>) => void;
  removerViagem: (id: string) => void;
  avancarEtapaViagem: (id: string, payloadPassagem?: ModalPassagemPayload) => boolean;
  retrocederEtapaViagem: (id: string) => void;
  cancelarViagem: (id: string, motivoCancelamento?: string) => void;

  // Automações
  gerarProgramacaoProximos30Dias: () => number;
  enviarLoteAprovacao: (ids: string[]) => string;
  executarRotinaDiaria: () => { log: string[]; avisosCriados: number };

  // Ações de Avisos
  marcarAvisoEnviado: (id: string, enviado: boolean) => void;
  removerAviso: (id: string) => void;
  adicionarAvisoManual: (aviso: Omit<Aviso, 'id' | 'key' | 'criado'>) => void;

  // Backup & CSV & GAS
  exportarCSV: (tipo: 'colaboradores' | 'viagens' | 'avisos') => void;
  restaurarDadosIniciais: () => void;
  sincronizarComGAS: () => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  COLABS: 'umca_colaboradores_v2',
  VIAGENS: 'umca_viagens_v2',
  AVISOS: 'umca_avisos_v2',
  APROVADOR: 'umca_aprovador_v2',
  GAS_URL: 'umca_gas_url_v2',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hoje, setHoje] = useState<string>(() => obterHojeISO());
  const [activeTab, setActiveTab] = useState<string>('folgas');
  const [aprovadorNome, setAprovadorNome] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.APROVADOR) || 'Roberto Menezes (Gerência de Manutenção / RH)';
  });
  const [gasWebAppUrl, setGasWebAppUrl] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.GAS_URL) || '';
  });
  const [gasStatus, setGasStatus] = useState<{ loading: boolean; message: string; lastSync?: string }>({
    loading: false,
    message: '',
  });

  const [colaboradores, setColaboradores] = useState<Colaborador[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COLABS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return COLABORADORES_INICIAIS;
  });

  const [viagens, setViagens] = useState<Viagem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VIAGENS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return VIAGENS_INICIAIS;
  });

  const [avisos, setAvisos] = useState<Aviso[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AVISOS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return AVISOS_INICIAIS;
  });

  // Salvar no LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLABS, JSON.stringify(colaboradores));
  }, [colaboradores]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIAGENS, JSON.stringify(viagens));
  }, [viagens]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AVISOS, JSON.stringify(avisos));
  }, [avisos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APROVADOR, aprovadorNome);
  }, [aprovadorNome]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GAS_URL, gasWebAppUrl);
  }, [gasWebAppUrl]);

  // Função auxiliar para obter primeiro nome
  const primeiroNome = (nome: string) => {
    return (nome || '').trim().split(' ')[0] || 'Colaborador';
  };

  // Helper para adicionar aviso com proteção de chave duplicada
  const emitirAviso = useCallback((
    key: string,
    colabId: string,
    tipo: Aviso['tipo'],
    texto: string,
    avisosAtuais: Aviso[]
  ): Aviso[] => {
    if (avisosAtuais.some(a => a.key === key)) {
      return avisosAtuais;
    }
    const novoAviso: Aviso = {
      id: `aviso-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      key,
      colabId,
      tipo,
      texto,
      criado: hoje,
      enviado: false,
    };
    return [novoAviso, ...avisosAtuais];
  }, [hoje]);

  // Cálculo das folgas individuais com base na escala de cada colaborador
  const calculosFolgas = useMemo<CalculoFolga[]>(() => {
    return colaboradores.map(c => {
      const diasTotalCiclo = (c.trab || 60) + (c.folga || 10);
      const proximaData = somarDias(c.ultimaFolga, c.trab);
      const diasAteFolga = diffEmDias(proximaData, hoje);
      const diasDecorridoCiclo = Math.max(0, diffEmDias(hoje, c.ultimaFolga));
      const percentualCiclo = Math.min(100, Math.round((diasDecorridoCiclo / diasTotalCiclo) * 100));

      // Busca viagem ativa para esse colaborador
      const viagemAtiva = viagens.find(
        v => v.colabId === c.id && v.etapa !== 'realizada' && v.ocorrencia !== 'Cancelada'
      );

      let situacaoCor: CalculoFolga['situacaoCor'] = 'verde';
      let situacaoTexto = `No prazo (+${diasAteFolga}d)`;

      if (c.ferias) {
        situacaoCor = 'cinza';
        situacaoTexto = 'Em Férias';
      } else if (viagemAtiva && viagemAtiva.etapa === 'comprada') {
        situacaoCor = 'azul';
        situacaoTexto = `Passagem comprada (${formatarDataBR(viagemAtiva.ida)})`;
      } else if (diasAteFolga <= 0) {
        situacaoCor = 'vermelho';
        situacaoTexto = diasAteFolga === 0 ? 'Vence hoje' : `Vencida há ${Math.abs(diasAteFolga)}d`;
      } else if (diasAteFolga <= 30) {
        situacaoCor = 'amarelo';
        situacaoTexto = `Próxima (${diasAteFolga} dias)`;
      } else {
        situacaoCor = 'verde';
        situacaoTexto = `No prazo (+${diasAteFolga}d)`;
      }

      return {
        colaborador: c,
        proximaData,
        diasAteFolga,
        diasDecorridoCiclo,
        diasTotalCiclo,
        percentualCiclo,
        situacaoTexto,
        situacaoCor,
        viagemAtiva,
      };
    });
  }, [colaboradores, viagens, hoje]);

  // Indicadores CAN
  const indicadores = useMemo<IndicadoresCAN>(() => {
    let totalRealizadas = 0;
    let dentroDoPrazo = 0;
    let foraDoPrazo = 0;
    let remarcacoes = 0;
    let cancelamentos = 0;
    let custoPassagens = 0;
    let custoHospedagem = 0;
    let utilizacaoRepublicas = 0;
    let utilizacaoHoteis = 0;
    let conformidadeSim = 0;
    let conformidadeNao = 0;
    let realizadasPrioritarias = 0;

    const etapasContagem: Record<EtapaViagem, number> = {
      programada: 0,
      enviada: 0,
      aprovada: 0,
      comprada: 0,
      realizada: 0,
    };

    viagens.forEach(v => {
      // Ocorrências
      if (v.ocorrencia === 'Remarcada') remarcacoes++;
      if (v.ocorrencia === 'Cancelada') {
        cancelamentos++;
        return; // Viagens canceladas não entram no fluxo ativo nem nos custos
      }

      etapasContagem[v.etapa] = (etapasContagem[v.etapa] || 0) + 1;

      // Antecedência da solicitação
      const antecedencia = diffEmDias(v.ida, v.dataSolicitacao);
      if (antecedencia >= 20) {
        dentroDoPrazo++;
      } else {
        foraDoPrazo++;
      }

      // Custos
      if (v.custoPassagem && v.custoPassagem > 0) {
        custoPassagens += Number(v.custoPassagem);
      }
      if (v.custoHospedagem && v.custoHospedagem > 0) {
        custoHospedagem += Number(v.custoHospedagem);
      }

      // Hospedagem
      if (v.hospedagem) {
        if (v.tipoHosp === 'República') utilizacaoRepublicas++;
        if (v.tipoHosp === 'Hotel') utilizacaoHoteis++;
      }

      // Conformidade com planejamento
      if (v.folgaConforme) {
        conformidadeSim++;
      } else {
        conformidadeNao++;
      }

      // Status realizada
      if (v.etapa === 'realizada') {
        totalRealizadas++;
        if (v.dataPrioritaria) {
          realizadasPrioritarias++;
        }
      }
    });

    const totalHospedagens = utilizacaoRepublicas + utilizacaoHoteis;
    const taxaRepublicas = totalHospedagens > 0 ? Math.round((utilizacaoRepublicas / totalHospedagens) * 100) : 0;
    const taxaHoteis = totalHospedagens > 0 ? Math.round((utilizacaoHoteis / totalHospedagens) * 100) : 0;

    const totalConformidade = conformidadeSim + conformidadeNao;
    const conformidadePlanejamento = totalConformidade > 0
      ? Math.round((conformidadeSim / totalConformidade) * 100)
      : 100;

    const percentualDatasPrioritarias = totalRealizadas > 0
      ? Math.round((realizadasPrioritarias / totalRealizadas) * 100)
      : 0;

    return {
      totalRealizadas,
      dentroDoPrazo,
      foraDoPrazo,
      remarcacoes,
      cancelamentos,
      custoPassagens,
      custoHospedagem,
      custoTotal: custoPassagens + custoHospedagem,
      utilizacaoRepublicas,
      utilizacaoHoteis,
      taxaRepublicas,
      taxaHoteis,
      conformidadePlanejamento,
      percentualDatasPrioritarias,
      totalSolicitacoesAtivas: dentroDoPrazo + foraDoPrazo,
      etapasContagem,
    };
  }, [viagens]);

  const avisosNaoEnviadosCount = useMemo(() => {
    return avisos.filter(a => !a.enviado).length;
  }, [avisos]);

  // Ações de Colaborador
  const adicionarColaborador = (c: Omit<Colaborador, 'id'>) => {
    const novo: Colaborador = {
      ...c,
      id: `colab-${Date.now()}`,
    };
    setColaboradores(prev => [...prev, novo]);
  };

  const atualizarColaborador = (id: string, c: Partial<Colaborador>) => {
    setColaboradores(prev => prev.map(item => (item.id === id ? { ...item, ...c } : item)));
  };

  const removerColaborador = (id: string) => {
    setColaboradores(prev => prev.filter(item => item.id !== id));
  };

  const alternarFeriasColaborador = (id: string) => {
    setColaboradores(prev =>
      prev.map(item => (item.id === id ? { ...item, ferias: !item.ferias } : item))
    );
  };

  // Ações de Viagem
  const criarViagem = (v: Omit<Viagem, 'id'>): string => {
    const id = `viag-${Date.now()}`;
    const nova: Viagem = { ...v, id };
    setViagens(prev => [nova, ...prev]);
    return id;
  };

  const atualizarViagem = (id: string, updates: Partial<Viagem>) => {
    setViagens(prev => {
      const atual = prev.find(v => v.id === id);
      if (!atual) return prev;

      let novaOcorrencia = updates.ocorrencia ?? atual.ocorrencia;
      let gerarAvisoRemarcacao = false;

      // Se a data de ida for alterada depois de definida, marcar Remarcada
      if (updates.ida && updates.ida !== atual.ida && atual.etapa !== 'programada') {
        novaOcorrencia = 'Remarcada';
        gerarAvisoRemarcacao = true;
      }

      const viagemAtualizada: Viagem = {
        ...atual,
        ...updates,
        ocorrencia: novaOcorrencia,
      };

      if (gerarAvisoRemarcacao) {
        const colab = colaboradores.find(c => c.id === atual.colabId);
        if (colab) {
          const texto = `Olá, ${primeiroNome(colab.nome)}! Atenção: sua viagem foi remarcada.
Nova data de ida: ${formatarDataBR(viagemAtualizada.ida)}
Data de retorno: ${formatarDataBR(viagemAtualizada.volta)}
Trecho: ${viagemAtualizada.origem} → ${viagemAtualizada.destino} (${viagemAtualizada.transporte})
${viagemAtualizada.voucher ? `Voucher/Localizador: ${viagemAtualizada.voucher}` : ''}
Qualquer dúvida contate a Logística UMCA.`;

          setAvisos(prevAvisos =>
            emitirAviso(`remarc-${id}-${viagemAtualizada.ida}`, colab.id, 'Remarcação', texto, prevAvisos)
          );
        }
      }

      return prev.map(v => (v.id === id ? viagemAtualizada : v));
    });
  };

  const removerViagem = (id: string) => {
    setViagens(prev => prev.filter(v => v.id !== id));
  };

  const cancelarViagem = (id: string, motivoCancelamento?: string) => {
    atualizarViagem(id, {
      ocorrencia: 'Cancelada',
      obs: motivoCancelamento ? `${motivoCancelamento}` : 'Viagem cancelada.',
    });
  };

  // Automação: Avançar etapa (OK)
  const avancarEtapaViagem = (id: string, payloadPassagem?: ModalPassagemPayload): boolean => {
    const viagem = viagens.find(v => v.id === id);
    if (!viagem) return false;
    const colab = colaboradores.find(c => c.id === viagem.colabId);

    const ordemEtapas: EtapaViagem[] = ['programada', 'enviada', 'aprovada', 'comprada', 'realizada'];
    const indexAtual = ordemEtapas.indexOf(viagem.etapa);
    if (indexAtual >= ordemEtapas.length - 1) return false;

    const proximaEtapa = ordemEtapas[indexAtual + 1];

    if (proximaEtapa === 'comprada') {
      if (!payloadPassagem) {
        // Exige preenchimento dos custos e voucher
        return false;
      }
      const viagemComprada: Viagem = {
        ...viagem,
        etapa: 'comprada',
        custoPassagem: payloadPassagem.custoPassagem,
        voucher: payloadPassagem.voucher,
        hospedagem: payloadPassagem.hospedagem,
        tipoHosp: payloadPassagem.tipoHosp,
        localHosp: payloadPassagem.localHosp,
        custoHospedagem: payloadPassagem.custoHospedagem,
      };

      setViagens(prev => prev.map(v => (v.id === id ? viagemComprada : v)));

      // Gerar aviso automático de Voucher
      if (colab) {
        const textoVoucher = `Olá, ${primeiroNome(colab.nome)}! Sua passagem para a folga foi emitida.
🛫 Ida: ${formatarDataBR(viagemComprada.ida)} | Retorno: ${formatarDataBR(viagemComprada.volta)}
📍 Trecho: ${viagemComprada.origem} → ${viagemComprada.destino} (${viagemComprada.transporte})
🎫 Voucher/Localizador: ${viagemComprada.voucher}
${viagemComprada.hospedagem ? `🏨 Hospedagem: ${viagemComprada.localHosp || viagemComprada.tipoHosp}` : '🏠 Hospedagem: Residência própria'}
Bom descanso! Equipe Logística UMCA.`;

        setAvisos(prevAvisos =>
          emitirAviso(`voucher-${id}`, colab.id, 'Voucher', textoVoucher, prevAvisos)
        );
      }
      return true;
    }

    if (proximaEtapa === 'realizada') {
      // 1. Marca viagem como realizada
      setViagens(prev => prev.map(v => (v.id === id ? { ...v, etapa: 'realizada' } : v)));

      // 2. Atualiza última folga do colaborador com a data de ida e recalcula
      if (colab) {
        setColaboradores(prev =>
          prev.map(c => (c.id === colab.id ? { ...c, ultimaFolga: viagem.ida } : c))
        );

        // 3. Gera aviso de próxima folga
        const proximaFolgaPrevista = somarDias(viagem.ida, colab.trab);
        const textoProx = `Olá, ${primeiroNome(colab.nome)}! Folga concluída com sucesso.
Sua próxima folga de campo está prevista para ${formatarDataBR(proximaFolgaPrevista)} (escala ${colab.trab}x${colab.folga}).
Avisaremos com antecedência assim que a nova programação for gerada. Bom trabalho!`;

        setAvisos(prevAvisos =>
          emitirAviso(`prox-${id}`, colab.id, 'Próxima folga', textoProx, prevAvisos)
        );
      }
      return true;
    }

    // Outras etapas (programada -> enviada -> aprovada)
    setViagens(prev => prev.map(v => (v.id === id ? { ...v, etapa: proximaEtapa } : v)));
    return true;
  };

  const retrocederEtapaViagem = (id: string) => {
    const viagem = viagens.find(v => v.id === id);
    if (!viagem) return;
    const ordemEtapas: EtapaViagem[] = ['programada', 'enviada', 'aprovada', 'comprada', 'realizada'];
    const idx = ordemEtapas.indexOf(viagem.etapa);
    if (idx > 0) {
      setViagens(prev => prev.map(v => (v.id === id ? { ...v, etapa: ordemEtapas[idx - 1] } : v)));
    }
  };

  // Automação: "Gerar programação dos próximos 30 dias"
  const gerarProgramacaoProximos30Dias = (): number => {
    let countCriadas = 0;
    const novasViagens: Viagem[] = [];

    colaboradores.forEach(c => {
      if (c.ferias || !c.ultimaFolga) return;

      // Verifica se já tem viagem ativa
      const temViagemAberta = viagens.some(
        v => v.colabId === c.id && v.etapa !== 'realizada' && v.ocorrencia !== 'Cancelada'
      );
      if (temViagemAberta) return;

      const proximaData = somarDias(c.ultimaFolga, c.trab);
      const diasAteFolga = diffEmDias(proximaData, hoje);

      // Próximos 30 dias (ou vencida)
      if (diasAteFolga <= 30) {
        const ida = diasAteFolga < 0 ? hoje : proximaData;
        const volta = somarDias(ida, c.folga);

        const novaViagem: Viagem = {
          id: `viag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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
          obs: `Programação gerada automaticamente para ciclo ${c.trab}x${c.folga}.`,
          tipoColaborador: c.tipo || 'U&M',
          centroCusto: 'UMCA',
        };

        novasViagens.push(novaViagem);
        countCriadas++;
      }
    });

    if (novasViagens.length > 0) {
      setViagens(prev => [...novasViagens, ...prev]);
    }

    return countCriadas;
  };

  // Automação: "Enviar para aprovação"
  const enviarLoteAprovacao = (ids: string[]): string => {
    const viagensSelecionadas = viagens.filter(v => ids.includes(v.id));
    if (viagensSelecionadas.length === 0) return '';

    // Muda etapa para "enviada"
    setViagens(prev =>
      prev.map(v => (ids.includes(v.id) && v.etapa === 'programada' ? { ...v, etapa: 'enviada' } : v))
    );

    // Gera texto estruturado para envio ao aprovador
    const linhas = viagensSelecionadas.map((v, i) => {
      const colab = colaboradores.find(c => c.id === v.colabId);
      const chapa = colab?.chapa || '—';
      const nome = colab?.nome || '—';
      const escala = colab ? `${colab.trab}x${colab.folga}` : '—';
      return `${i + 1}. [Chapa ${chapa}] ${nome} | Escala: ${escala} | Ida: ${formatarDataBR(v.ida)} | Volta: ${formatarDataBR(v.volta)} | Trecho: ${v.origem} → ${v.destino} | Transporte: ${v.transporte}`;
    });

    const textoFormatado = `*SOLICITAÇÃO DE APROVAÇÃO DE VIAGENS / FOLGAS – UMCA*
Para: ${aprovadorNome}
Data de envio: ${formatarDataBR(hoje)}
Total de colaboradores programados: ${viagensSelecionadas.length}

*Relação de Viagens para Homologação:*
${linhas.join('\n')}

Solicitamos a conferência e aprovação das datas de ida e volta para liberação da emissão de passagens.
_Logística de Manutenção – UMCA_`;

    return textoFormatado;
  };

  // Rotina diária de lembretes e conclusão automática (conforme Apps Script)
  const executarRotinaDiaria = (): { log: string[]; avisosCriados: number } => {
    const log: string[] = [];
    let novosAvisos = [...avisos];
    let contadorAvisos = 0;

    // 1. Lembretes automáticos 3 dias antes da viagem com passagem comprada
    viagens.forEach(v => {
      if (v.etapa === 'comprada' && v.ocorrencia !== 'Cancelada' && v.ida) {
        const dias = diffEmDias(v.ida, hoje);
        if (dias >= 0 && dias <= 3) {
          const colab = colaboradores.find(c => c.id === v.colabId);
          if (colab) {
            const quando = dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`;
            const key = `lemb-${v.id}-${v.ida}`;
            const msg = `Olá, ${primeiroNome(colab.nome)}! Lembrete: sua viagem é ${quando}, ${formatarDataBR(v.ida)} (${v.origem} → ${v.destino}). Voucher/localizador: ${v.voucher || 'a confirmar'}. Tenha uma excelente viagem!`;

            const antesLen = novosAvisos.length;
            novosAvisos = emitirAviso(key, colab.id, 'Lembrete', msg, novosAvisos);
            if (novosAvisos.length > antesLen) {
              contadorAvisos++;
              log.push(`Lembrete gerado para ${colab.nome} (viagem ${quando})`);
            }
          }
        }
      }
    });

    // 2. Viagem comprada onde a volta já passou -> avança automaticamente para "realizada"
    setViagens(prev =>
      prev.map(v => {
        if (v.etapa === 'comprada' && v.ocorrencia !== 'Cancelada' && v.volta) {
          if (diffEmDias(v.volta, hoje) < 0) {
            const colab = colaboradores.find(c => c.id === v.colabId);
            if (colab) {
              setColaboradores(prevColabs =>
                prevColabs.map(c => (c.id === colab.id ? { ...c, ultimaFolga: v.ida } : c))
              );
              const proxima = somarDias(v.ida, colab.trab);
              const key = `prox-${v.id}`;
              const msg = `Olá, ${primeiroNome(colab.nome)}! Folga de campo concluída. Sua próxima folga está prevista para ${formatarDataBR(proxima)} (escala ${colab.trab}x${colab.folga}).`;
              novosAvisos = emitirAviso(key, colab.id, 'Próxima folga', msg, novosAvisos);
              log.push(`Viagem concluída automaticamente: ${colab.nome}`);
            }
            return { ...v, etapa: 'realizada' };
          }
        }
        return v;
      })
    );

    setAvisos(novosAvisos);
    return { log, avisosCriados: contadorAvisos };
  };

  // Ações de Avisos
  const marcarAvisoEnviado = (id: string, enviado: boolean) => {
    setAvisos(prev =>
      prev.map(a =>
        a.id === id ? { ...a, enviado, dataEnvio: enviado ? hoje : undefined } : a
      )
    );
  };

  const removerAviso = (id: string) => {
    setAvisos(prev => prev.filter(a => a.id !== id));
  };

  const adicionarAvisoManual = (aviso: Omit<Aviso, 'id' | 'key' | 'criado'>) => {
    const id = `aviso-${Date.now()}`;
    const novo: Aviso = {
      ...aviso,
      id,
      key: `manual-${id}`,
      criado: hoje,
    };
    setAvisos(prev => [novo, ...prev]);
  };

  // Exportar CSV
  const exportarCSV = (tipo: 'colaboradores' | 'viagens' | 'avisos') => {
    let cabecalho = '';
    let linhas: string[] = [];
    let nomeArquivo = `umca_${tipo}_${hoje}.csv`;

    if (tipo === 'colaboradores') {
      cabecalho = 'Chapa,Nome,Função,Dias Trabalho,Dias Folga,Escala,Transporte,Origem,Destino,Benefícios,Telefone,Última Folga,Férias';
      linhas = colaboradores.map(c =>
        [
          c.chapa,
          `"${c.nome}"`,
          `"${c.funcao}"`,
          c.trab,
          c.folga,
          `"${c.trab}x${c.folga}"`,
          `"${c.transporte}"`,
          `"${c.origem}"`,
          `"${c.destino}"`,
          `"${c.beneficios}"`,
          `"${c.telefone}"`,
          formatarDataBR(c.ultimaFolga),
          c.ferias ? 'Sim' : 'Não',
        ].join(',')
      );
    } else if (tipo === 'viagens') {
      cabecalho = 'ID,Colaborador,Etapa,Motivo,Data Solicitação,Data Ida,Data Volta,Origem,Destino,Transporte,Solicitante,Custo Passagem,Voucher,Hospedagem,Tipo Hosp.,Local Hosp.,Custo Hospedagem,Ocorrência,Data Prioritária,Folga Conforme,Antecedência (dias),Classificação Prazo';
      linhas = viagens.map(v => {
        const c = colaboradores.find(col => col.id === v.colabId);
        const antecedencia = diffEmDias(v.ida, v.dataSolicitacao);
        const prazo = antecedencia >= 20 ? 'Dentro do prazo' : 'Fora do prazo';
        return [
          v.id,
          `"${c?.nome || v.colabId}"`,
          v.etapa,
          `"${v.motivo}"`,
          formatarDataBR(v.dataSolicitacao),
          formatarDataBR(v.ida),
          formatarDataBR(v.volta),
          `"${v.origem}"`,
          `"${v.destino}"`,
          `"${v.transporte}"`,
          `"${v.solicitante}"`,
          v.custoPassagem ? v.custoPassagem.toFixed(2) : '0.00',
          `"${v.voucher}"`,
          v.hospedagem ? 'Sim' : 'Não',
          `"${v.tipoHosp}"`,
          `"${v.localHosp}"`,
          v.custoHospedagem ? v.custoHospedagem.toFixed(2) : '0.00',
          `"${v.ocorrencia}"`,
          v.dataPrioritaria ? 'Sim' : 'Não',
          v.folgaConforme ? 'Sim' : 'Não',
          antecedencia,
          `"${prazo}"`,
        ].join(',');
      });
    } else {
      cabecalho = 'ID,Colaborador,Tipo,Data Criação,Status Envio,Data Envio,Texto da Mensagem';
      linhas = avisos.map(a => {
        const c = colaboradores.find(col => col.id === a.colabId);
        return [
          a.id,
          `"${c?.nome || a.colabId}"`,
          `"${a.tipo}"`,
          formatarDataBR(a.criado),
          a.enviado ? 'Enviado' : 'Pendente',
          formatarDataBR(a.dataEnvio),
          `"${a.texto.replace(/"/g, '""')}"`,
        ].join(',');
      });
    }

    const csvConteudo = '\uFEFF' + [cabecalho, ...linhas].join('\r\n');
    const blob = new Blob([csvConteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nomeArquivo);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const restaurarDadosIniciais = () => {
    setColaboradores(COLABORADORES_INICIAIS);
    setViagens(VIAGENS_INICIAIS);
    setAvisos(AVISOS_INICIAIS);
    localStorage.removeItem(STORAGE_KEYS.COLABS);
    localStorage.removeItem(STORAGE_KEYS.VIAGENS);
    localStorage.removeItem(STORAGE_KEYS.AVISOS);
  };

  // Integração com Google Apps Script
  const sincronizarComGAS = async (): Promise<boolean> => {
    if (!gasWebAppUrl) {
      setGasStatus({ loading: false, message: 'URL do Google Apps Script não configurada.' });
      return false;
    }

    setGasStatus({ loading: true, message: 'Conectando ao Google Apps Script...' });
    try {
      const payload = {
        colabs: colaboradores,
        viagens,
        avisos,
        aprovador: aprovadorNome,
      };

      const res = await fetch(gasWebAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setGasStatus({
          loading: false,
          message: 'Sincronizado com sucesso na planilha do Google Sheets!',
          lastSync: new Date().toLocaleTimeString('pt-BR'),
        });
        return true;
      } else {
        throw new Error(`Erro HTTP ${res.status}`);
      }
    } catch (err: any) {
      setGasStatus({
        loading: false,
        message: `Falha na sincronização com Apps Script: ${err.message || 'Erro de rede ou CORS'}.`,
      });
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        hoje,
        setHoje,
        activeTab,
        setActiveTab,
        colaboradores,
        viagens,
        avisos,
        aprovadorNome,
        setAprovadorNome,
        gasWebAppUrl,
        setGasWebAppUrl,
        gasStatus,
        calculosFolgas,
        indicadores,
        avisosNaoEnviadosCount,
        adicionarColaborador,
        atualizarColaborador,
        removerColaborador,
        alternarFeriasColaborador,
        criarViagem,
        atualizarViagem,
        removerViagem,
        avancarEtapaViagem,
        retrocederEtapaViagem,
        cancelarViagem,
        gerarProgramacaoProximos30Dias,
        enviarLoteAprovacao,
        executarRotinaDiaria,
        marcarAvisoEnviado,
        removerAviso,
        adicionarAvisoManual,
        exportarCSV,
        restaurarDadosIniciais,
        sincronizarComGAS,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp deve ser usado dentro de um AppProvider');
  }
  return context;
};
