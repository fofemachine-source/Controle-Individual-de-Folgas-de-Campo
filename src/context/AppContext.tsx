import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Colaborador,
  Viagem,
  Aviso,
  CalculoFolga,
  IndicadoresCAN,
  EtapaViagem,
  UserRole,
  ChaveAnexo,
  AnexoDocumento,
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
import {
  avaliarDocumentosViagem,
  calcularIndicadoresCAN,
  obterNecessidadesTransporte,
} from '../utils/viagemUtils';

export interface ModalPassagemPayload {
  custoPassagem: number;
  voucher: string;
  hospedagem: boolean;
  tipoHosp: 'República' | 'Hotel' | 'N.A';
  localHosp: string;
  custoHospedagem: number | null;
  anexosNovos?: Partial<NonNullable<Viagem['anexos']>>;
}

export interface AvancarEtapaResult {
  ok: boolean;
  erro?: string;
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

  // Controle de Acesso (Administrador)
  userRole: UserRole;
  isAdmin: boolean;
  autenticarAdmin: (senha: string) => boolean;
  sairAdmin: () => void;
  alterarSenhaAdmin: (novaSenha: string) => void;

  // Cálculos e Indicadores
  calculosFolgas: CalculoFolga[];
  indicadores: IndicadoresCAN;
  avisosNaoEnviadosCount: number;

  // Ações de Colaborador
  adicionarColaborador: (c: Omit<Colaborador, 'id'>) => void;
  atualizarColaborador: (id: string, c: Partial<Colaborador>) => void;
  removerColaborador: (id: string) => void;
  alternarFeriasColaborador: (id: string) => void;

  // Ações de Viagem e Anexos
  criarViagem: (v: Omit<Viagem, 'id'>) => string;
  atualizarViagem: (id: string, v: Partial<Viagem>) => AvancarEtapaResult;
  removerViagem: (id: string) => void;
  avancarEtapaViagem: (id: string, payloadPassagem?: ModalPassagemPayload) => AvancarEtapaResult;
  retrocederEtapaViagem: (id: string) => void;
  cancelarViagem: (id: string, motivoCancelamento?: string) => void;
  anexarDocumentoViagem: (id: string, chave: ChaveAnexo, anexo: AnexoDocumento) => void;
  removerDocumentoViagem: (id: string, chave: ChaveAnexo) => void;

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
  COLABS: 'umca_colaboradores_v3',
  VIAGENS: 'umca_viagens_v3',
  AVISOS: 'umca_avisos_v3',
  APROVADOR: 'umca_aprovador_v3',
  GAS_URL: 'umca_gas_url_v3',
  ROLE: 'umca_user_role_v3',
  ADMIN_PASS: 'umca_admin_pass_v3',
};

const SENHA_ADMIN_PADRAO = 'admin123';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hoje, setHoje] = useState<string>(() => obterHojeISO());
  const [activeTab, setActiveTab] = useState<string>('indicadores');
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ROLE);
    return saved === 'admin' ? 'admin' : 'usuario';
  });
  const [adminPass, setAdminPass] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PASS) || SENHA_ADMIN_PADRAO;
  });

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
        const parsed: Colaborador[] = JSON.parse(saved);
        return parsed.map(c => ({
          ...c,
          operacao: c.operacao || 'UMCA',
          centroCusto: c.centroCusto || c.operacao || 'UMCA',
        }));
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

  // Persistir no LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COLABS, JSON.stringify(colaboradores));
    } catch (e) {
      console.error('Erro ao salvar colaboradores:', e);
    }
  }, [colaboradores]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.VIAGENS, JSON.stringify(viagens));
    } catch (e) {
      console.error('Erro ao salvar viagens (verifique tamanho dos anexos):', e);
    }
  }, [viagens]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AVISOS, JSON.stringify(avisos));
    } catch (e) {
      console.error('Erro ao salvar avisos:', e);
    }
  }, [avisos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APROVADOR, aprovadorNome);
  }, [aprovadorNome]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.GAS_URL, gasWebAppUrl);
  }, [gasWebAppUrl]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, userRole);
  }, [userRole]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASS, adminPass);
  }, [adminPass]);

  const isAdmin = userRole === 'admin';

  const autenticarAdmin = (senha: string): boolean => {
    if (senha.trim() === adminPass) {
      setUserRole('admin');
      return true;
    }
    return false;
  };

  const sairAdmin = () => {
    setUserRole('usuario');
  };

  const alterarSenhaAdmin = (novaSenha: string) => {
    if (novaSenha.trim().length >= 4) {
      setAdminPass(novaSenha.trim());
    }
  };

  // Função auxiliar para obter primeiro nome
  const primeiroNome = (nome: string) => {
    return (nome || '').trim().split(' ')[0] || 'Colaborador';
  };

  // Helper para adicionar aviso com proteção de chave duplicada
  const emitirAviso = useCallback(
    (
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
    },
    [hoje]
  );

  // Cálculo das folgas individuais com base na escala de cada colaborador
  const calculosFolgas = useMemo<CalculoFolga[]>(() => {
    return colaboradores.map(c => {
      const diasTotalCiclo = (c.trab || 60) + (c.folga || 10);
      const proximaData = somarDias(c.ultimaFolga, c.trab);
      const diasAteFolga = diffEmDias(proximaData, hoje);
      const diasDecorridoCiclo = Math.max(0, diffEmDias(hoje, c.ultimaFolga));
      const percentualCiclo = Math.min(100, Math.round((diasDecorridoCiclo / diasTotalCiclo) * 100));

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

  // Indicadores CAN (com consolidação por Centro de Custo)
  const indicadores = useMemo<IndicadoresCAN>(() => {
    return calcularIndicadoresCAN(viagens);
  }, [viagens]);

  const avisosNaoEnviadosCount = useMemo(() => {
    return avisos.filter(a => !a.enviado).length;
  }, [avisos]);

  // Ações de Colaborador
  const adicionarColaborador = (c: Omit<Colaborador, 'id'>) => {
    const novo: Colaborador = {
      ...c,
      operacao: c.operacao || 'UMCA',
      centroCusto: c.centroCusto || c.operacao || 'UMCA',
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
    const colab = colaboradores.find(c => c.id === v.colabId);
    const nova: Viagem = {
      ...v,
      id,
      operacao: v.operacao || colab?.operacao || 'UMCA',
      centroCusto: (v.centroCusto || v.operacao || colab?.centroCusto || colab?.operacao || 'UMCA').trim().toUpperCase(),
      somenteIda: isAdmin ? Boolean(v.somenteIda) : false,
      anexos: v.anexos || {},
    };
    setViagens(prev => [nova, ...prev]);
    return id;
  };

  const atualizarViagem = (id: string, updates: Partial<Viagem>): AvancarEtapaResult => {
    const atual = viagens.find(v => v.id === id);
    if (!atual) return { ok: false, erro: 'Viagem não encontrada.' };

    // Impede alteração indevida do campo Somente Ida por não-administradores
    const safeUpdates: Partial<Viagem> = { ...updates };
    if (!isAdmin && 'somenteIda' in safeUpdates && safeUpdates.somenteIda !== atual.somenteIda) {
      safeUpdates.somenteIda = Boolean(atual.somenteIda);
    }

    const candidata: Viagem = {
      ...atual,
      ...safeUpdates,
    };

    // Bloqueia conclusão para 'realizada' se documentos obrigatórios não estiverem anexados
    if (candidata.etapa === 'realizada' && candidata.ocorrencia !== 'Cancelada') {
      const avaliacao = avaliarDocumentosViagem(candidata);
      if (!avaliacao.todosObrigatoriosAnexados) {
        const faltantes = avaliacao.pendentes.map(d => d.label).join(', ');
        return {
          ok: false,
          erro: `O processo permanece Em Andamento até anexar todos os documentos obrigatórios: ${faltantes}.`,
        };
      }
    }

    setViagens(prev => {
      const curr = prev.find(v => v.id === id);
      if (!curr) return prev;

      let novaOcorrencia = safeUpdates.ocorrencia ?? curr.ocorrencia;
      let gerarAvisoRemarcacao = false;

      if (safeUpdates.ida && safeUpdates.ida !== curr.ida && curr.etapa !== 'programada') {
        novaOcorrencia = 'Remarcada';
        gerarAvisoRemarcacao = true;
      }

      const viagemAtualizada: Viagem = {
        ...curr,
        ...safeUpdates,
        ocorrencia: novaOcorrencia,
      };

      if (gerarAvisoRemarcacao) {
        const colab = colaboradores.find(c => c.id === curr.colabId);
        if (colab) {
          const texto = `Olá, ${primeiroNome(colab.nome)}! Atenção: sua viagem foi remarcada.
Nova data de ida: ${formatarDataBR(viagemAtualizada.ida)}
Data de retorno: ${viagemAtualizada.somenteIda ? 'Somente Ida' : formatarDataBR(viagemAtualizada.volta)}
Trecho: ${viagemAtualizada.origem} → ${viagemAtualizada.destino} (${viagemAtualizada.transporte})
${viagemAtualizada.voucher ? `Voucher/Localizador: ${viagemAtualizada.voucher}` : ''}
Qualquer dúvida contate a Logística.`;

          setAvisos(prevAvisos =>
            emitirAviso(`remarc-${id}-${viagemAtualizada.ida}`, colab.id, 'Remarcação', texto, prevAvisos)
          );
        }
      }

      return prev.map(v => (v.id === id ? viagemAtualizada : v));
    });

    return { ok: true };
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

  const anexarDocumentoViagem = (id: string, chave: ChaveAnexo, anexo: AnexoDocumento) => {
    setViagens(prev =>
      prev.map(v =>
        v.id === id
          ? {
              ...v,
              anexos: {
                ...(v.anexos || {}),
                [chave]: anexo,
              },
            }
          : v
      )
    );
  };

  const removerDocumentoViagem = (id: string, chave: ChaveAnexo) => {
    setViagens(prev =>
      prev.map(v => {
        if (v.id !== id) return v;
        const novosAnexos = { ...(v.anexos || {}) };
        delete novosAnexos[chave];
        return {
          ...v,
          anexos: novosAnexos,
        };
      })
    );
  };

  // Automação: Avançar etapa (OK) com trava de documentos obrigatórios
  const avancarEtapaViagem = (
    id: string,
    payloadPassagem?: ModalPassagemPayload
  ): AvancarEtapaResult => {
    const viagem = viagens.find(v => v.id === id);
    if (!viagem) return { ok: false, erro: 'Viagem não encontrada.' };
    const colab = colaboradores.find(c => c.id === viagem.colabId);

    const ordemEtapas: EtapaViagem[] = ['programada', 'enviada', 'aprovada', 'comprada', 'realizada'];
    const indexAtual = ordemEtapas.indexOf(viagem.etapa);
    if (indexAtual >= ordemEtapas.length - 1) return { ok: false, erro: 'Viagem já concluída.' };

    const proximaEtapa = ordemEtapas[indexAtual + 1];

    if (proximaEtapa === 'comprada') {
      if (!payloadPassagem) {
        return { ok: false, erro: 'Preencha os custos e o voucher para avançar.' };
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
        anexos: {
          ...(viagem.anexos || {}),
          ...(payloadPassagem.anexosNovos || {}),
        },
      };

      setViagens(prev => prev.map(v => (v.id === id ? viagemComprada : v)));

      if (colab) {
        const textoVoucher = `Olá, ${primeiroNome(colab.nome)}! Sua passagem para a folga foi emitida.
🛫 Ida: ${formatarDataBR(viagemComprada.ida)} | Retorno: ${viagemComprada.somenteIda ? 'Somente Ida' : formatarDataBR(viagemComprada.volta)}
📍 Trecho: ${viagemComprada.origem} → ${viagemComprada.destino} (${viagemComprada.transporte})
🎫 Voucher/Localizador: ${viagemComprada.voucher}
${viagemComprada.hospedagem ? `🏨 Hospedagem: ${viagemComprada.localHosp || viagemComprada.tipoHosp}` : '🏠 Hospedagem: Residência própria'}
Bom descanso! Equipe Logística.`;

        setAvisos(prevAvisos =>
          emitirAviso(`voucher-${id}`, colab.id, 'Voucher', textoVoucher, prevAvisos)
        );
      }
      return { ok: true };
    }

    if (proximaEtapa === 'realizada') {
      // REGRA OBRIGATÓRIA: O processo permanece em andamento até que todos os documentos obrigatórios estejam anexados
      const avaliacao = avaliarDocumentosViagem(viagem);
      if (!avaliacao.todosObrigatoriosAnexados) {
        const faltantes = avaliacao.pendentes.map(d => d.label).join(', ');
        return {
          ok: false,
          erro: `Não é possível concluir a viagem. Documentos obrigatórios pendentes: ${faltantes}. Anexe-os na janela "Etapa Atual".`,
        };
      }

      setViagens(prev => prev.map(v => (v.id === id ? { ...v, etapa: 'realizada' } : v)));

      if (colab) {
        setColaboradores(prev =>
          prev.map(c => (c.id === colab.id ? { ...c, ultimaFolga: viagem.ida } : c))
        );

        const proximaFolgaPrevista = somarDias(viagem.ida, colab.trab);
        const textoProx = `Olá, ${primeiroNome(colab.nome)}! Folga concluída com sucesso.
Sua próxima folga de campo está prevista para ${formatarDataBR(proximaFolgaPrevista)} (escala ${colab.trab}x${colab.folga}).
Avisaremos com antecedência assim que a nova programação for gerada. Bom trabalho!`;

        setAvisos(prevAvisos =>
          emitirAviso(`prox-${id}`, colab.id, 'Próxima folga', textoProx, prevAvisos)
        );
      }
      return { ok: true };
    }

    setViagens(prev => prev.map(v => (v.id === id ? { ...v, etapa: proximaEtapa } : v)));
    return { ok: true };
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

      const temViagemAberta = viagens.some(
        v => v.colabId === c.id && v.etapa !== 'realizada' && v.ocorrencia !== 'Cancelada'
      );
      if (temViagemAberta) return;

      const proximaData = somarDias(c.ultimaFolga, c.trab);
      const diasAteFolga = diffEmDias(proximaData, hoje);

      if (diasAteFolga <= 30) {
        const ida = diasAteFolga < 0 ? hoje : proximaData;
        const volta = somarDias(ida, c.folga);
        const op = c.operacao || 'UMCA';

        const novaViagem: Viagem = {
          id: `viag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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
          obs: `Programação gerada automaticamente para ciclo ${c.trab}x${c.folga} (${op}).`,
          tipoColaborador: c.tipo || 'U&M',
          centroCusto: c.centroCusto || op,
          acessoObra: false,
          qrCode: false,
          anexos: {},
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

    setViagens(prev =>
      prev.map(v => (ids.includes(v.id) && v.etapa === 'programada' ? { ...v, etapa: 'enviada' } : v))
    );

    const linhas = viagensSelecionadas.map((v, i) => {
      const colab = colaboradores.find(c => c.id === v.colabId);
      const chapa = colab?.chapa || '—';
      const nome = v.passageiroNomeAvulso || colab?.nome || '—';
      const escala = colab ? `${colab.trab}x${colab.folga}` : '—';
      const cc = v.centroCusto || v.operacao || 'UMCA';
      return `${i + 1}. [${cc}] [Chapa ${chapa}] ${nome} | Escala: ${escala} | Ida: ${formatarDataBR(v.ida)} | Volta: ${v.somenteIda ? 'Somente Ida' : formatarDataBR(v.volta)} | Trecho: ${v.origem} → ${v.destino} | Transporte: ${v.transporte}`;
    });

    const textoFormatado = `*SOLICITAÇÃO DE APROVAÇÃO DE VIAGENS / FOLGAS – U&M*
Para: ${aprovadorNome}
Data de envio: ${formatarDataBR(hoje)}
Total de colaboradores programados: ${viagensSelecionadas.length}

*Relação de Viagens para Homologação:*
${linhas.join('\n')}

Solicitamos a conferência e aprovação das datas de ida e volta para liberação da emissão de passagens.
_Logística de Manutenção – U&M_`;

    return textoFormatado;
  };

  // Rotina diária de lembretes e conclusão automática (respeitando trava de documentos obrigatórios)
  const executarRotinaDiaria = (): { log: string[]; avisosCriados: number } => {
    const log: string[] = [];
    let novosAvisos = [...avisos];
    let contadorAvisos = 0;

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

    setViagens(prev =>
      prev.map(v => {
        if (v.etapa === 'comprada' && v.ocorrencia !== 'Cancelada' && v.volta) {
          if (diffEmDias(v.volta, hoje) < 0) {
            const avaliacao = avaliarDocumentosViagem(v);
            const colab = colaboradores.find(c => c.id === v.colabId);
            if (!avaliacao.todosObrigatoriosAnexados) {
              log.push(
                `Mantida em andamento (${colab?.nome || v.id}): faltam documentos obrigatórios (${avaliacao.pendentes.map(p => p.label).join(', ')})`
              );
              return v;
            }
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
    const nomeArquivo = `um_${tipo}_${hoje}.csv`;

    if (tipo === 'colaboradores') {
      cabecalho =
        'Chapa,Nome,Operação,Centro de Custo,Função,Dias Trabalho,Dias Folga,Escala,Transporte,Origem,Destino,Benefícios,Telefone,Última Folga,Férias';
      linhas = colaboradores.map(c =>
        [
          c.chapa,
          `"${c.nome}"`,
          `"${c.operacao || 'UMCA'}"`,
          `"${c.centroCusto || c.operacao || 'UMCA'}"`,
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
      cabecalho =
        'ID,Colaborador,Operação,Centro de Custo,Etapa,Status Documentos,Motivo,Data Solicitação,Data Ida,Data Volta,Somente Ida,Origem,Destino,Transporte,Necessita Táxi,Necessita Aéreo,Necessita Rodoviário,Acesso Obra,Solicitante,Custo Passagem,Voucher,Hospedagem,Tipo Hosp.,Local Hosp.,Custo Hospedagem,Ocorrência,Data Prioritária,Folga Conforme,Antecedência (dias),Classificação Prazo';
      linhas = viagens.map(v => {
        const c = colaboradores.find(col => col.id === v.colabId);
        const antecedencia = diffEmDias(v.ida, v.dataSolicitacao);
        const prazo = antecedencia >= 20 ? 'Dentro do prazo' : 'Fora do prazo';
        const { necessitaTaxi, necessitaAereo, necessitaRodoviario } = obterNecessidadesTransporte(v);
        const avaliacao = avaliarDocumentosViagem(v);
        return [
          v.id,
          `"${v.passageiroNomeAvulso || c?.nome || v.colabId}"`,
          `"${v.operacao || c?.operacao || 'UMCA'}"`,
          `"${v.centroCusto || v.operacao || 'UMCA'}"`,
          v.etapa,
          `"${avaliacao.statusProcessoTexto}"`,
          `"${v.motivo}"`,
          formatarDataBR(v.dataSolicitacao),
          formatarDataBR(v.ida),
          v.somenteIda ? 'Somente Ida' : formatarDataBR(v.volta),
          v.somenteIda ? 'Sim' : 'Não',
          `"${v.origem}"`,
          `"${v.destino}"`,
          `"${v.transporte}"`,
          necessitaTaxi ? 'Sim' : 'Não',
          necessitaAereo ? 'Sim' : 'Não',
          necessitaRodoviario ? 'Sim' : 'Não',
          v.acessoObra ? 'Sim' : 'Não',
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
        userRole,
        isAdmin,
        autenticarAdmin,
        sairAdmin,
        alterarSenhaAdmin,
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
        anexarDocumentoViagem,
        removerDocumentoViagem,
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
