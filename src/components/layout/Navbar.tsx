import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  Plane,
  BarChart3,
  FileText,
  MessageCircle,
  Users,
  HelpCircle,
  Sparkles,
  Menu,
  X,
  Clock,
  Shield,
  ShieldCheck,
  Lock,
  LogOut,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { formatarDataBR } from '../../utils/dateUtils';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    avisosNaoEnviadosCount,
    gerarProgramacaoProximos30Dias,
    hoje,
    isAdmin,
    autenticarAdmin,
    sairAdmin,
    alterarSenhaAdmin,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalAdminOpen, setModalAdminOpen] = useState(false);
  const [senhaInput, setSenhaInput] = useState('');
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [novaSenhaInput, setNovaSenhaInput] = useState('');
  const [mostrarTrocaSenha, setMostrarTrocaSenha] = useState(false);

  const exibirToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleGerar30Dias = () => {
    if (!isAdmin) {
      setModalAdminOpen(true);
      exibirToast('A programação automática de folgas exige perfil de Administrador.');
      return;
    }
    const total = gerarProgramacaoProximos30Dias();
    if (total > 0) {
      exibirToast(`${total} nova(s) viagem(ns) programada(s) para os próximos 30 dias!`);
      setActiveTab('viagens');
    } else {
      exibirToast('Nenhuma folga pendente de programação nos próximos 30 dias.');
    }
  };

  const handleLoginAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setErroSenha(null);
    if (autenticarAdmin(senhaInput)) {
      setSenhaInput('');
      setModalAdminOpen(false);
      exibirToast('Modo Administrador ativado com sucesso.');
    } else {
      setErroSenha('Senha de Administrador incorreta.');
    }
  };

  const handleSalvarNovaSenha = (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenhaInput.trim().length < 4) {
      setErroSenha('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }
    alterarSenhaAdmin(novaSenhaInput.trim());
    setNovaSenhaInput('');
    setMostrarTrocaSenha(false);
    setErroSenha(null);
    exibirToast('Senha de Administrador atualizada.');
  };

  const navItems: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    adminOnly?: boolean;
  }[] = [
    { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
    { id: 'folgas', label: 'Controle de Folgas', icon: Calendar, adminOnly: true },
    { id: 'viagens', label: 'Viagens & Fluxo', icon: Plane },
    { id: 'ficha', label: 'Ficha Padrão', icon: FileText },
    {
      id: 'avisos',
      label: 'Avisos',
      icon: MessageCircle,
      badge: avisosNaoEnviadosCount > 0 ? avisosNaoEnviadosCount : undefined,
    },
    { id: 'colaboradores', label: 'Colaboradores', icon: Users },
    { id: 'orientacoes', label: 'Orientações', icon: HelpCircle },
  ];

  return (
    <>
      <header className="no-print sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Brand */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('indicadores')}
                className="text-left group cursor-pointer focus:outline-none"
              >
                <div className="text-sm sm:text-base font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                  Folgas & Viagens – U&M
                </div>
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                    {item.adminOnly && !isAdmin && (
                      <Lock
                        className={`w-3 h-3 shrink-0 ${isActive ? 'text-amber-300' : 'text-amber-600'}`}
                        aria-label="Restrito ao Administrador"
                      />
                    )}
                    {item.badge !== undefined && (
                      <span
                        className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-500 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right Actions: Role Selector + Primary Action */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setErroSenha(null);
                  setMostrarTrocaSenha(false);
                  setModalAdminOpen(true);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                  isAdmin
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title={isAdmin ? 'Perfil atual: Administrador' : 'Clique para acessar como Administrador'}
              >
                {isAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                <span className="hidden sm:inline">{isAdmin ? 'Admin' : 'Colaborador'}</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleGerar30Dias}
                  className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
                  title="Cria automaticamente viagens na etapa Programada para folgas nos próximos 30 dias"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Programar 30d</span>
                </button>
              )}

              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Data base: {formatarDataBR(hoje)}
              </span>
              {isAdmin && (
                <button
                  onClick={handleGerar30Dias}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Programar 30 dias
                </button>
              )}
            </div>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.adminOnly && !isAdmin && (
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                    )}
                  </div>
                  {item.badge !== undefined && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Modal de Perfil / Autenticação de Administrador */}
      {modalAdminOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg ${
                    isAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {isAdmin ? 'Perfil Administrador Ativo' : 'Acesso de Administrador'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAdmin
                      ? 'Controle de Folgas e destravamento de "Somente Ida" liberados'
                      : 'Libera acesso ao Controle de Folgas e campos travados'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalAdminOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isAdmin ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
                  <div className="font-bold">Permissões ativas:</div>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>Acesso completo ao módulo <strong>Controle de Folgas</strong> (UMCA, UMGE, UMBC, UMSS)</li>
                    <li>Edição rápida de nomes e cadastro de colaboradores</li>
                    <li>Destravamento controlado do campo <strong>"Somente Ida"</strong></li>
                  </ul>
                </div>

                {mostrarTrocaSenha ? (
                  <form onSubmit={handleSalvarNovaSenha} className="space-y-2.5 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <label className="block font-semibold text-slate-700">Nova senha de Administrador</label>
                    <input
                      type="password"
                      value={novaSenhaInput}
                      onChange={e => setNovaSenhaInput(e.target.value)}
                      placeholder="Mínimo 4 caracteres"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
                      required
                    />
                    {erroSenha && (
                      <div className="text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{erroSenha}</span>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setMostrarTrocaSenha(false)}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded cursor-pointer"
                      >
                        Salvar Senha
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMostrarTrocaSenha(true)}
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Alterar senha de Administrador</span>
                  </button>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      sairAdmin();
                      setModalAdminOpen(false);
                      exibirToast('Alterado para perfil Colaborador (acesso padrão).');
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Voltar para Colaborador</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalAdminOpen(false)}
                    className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLoginAdmin} className="space-y-4 text-xs">
                {erroSenha && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{erroSenha}</span>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Senha do Administrador
                  </label>
                  <input
                    type="password"
                    value={senhaInput}
                    onChange={e => setSenhaInput(e.target.value)}
                    placeholder="Digite a senha de Administrador"
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Senha inicial padrão: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700">admin123</code> (alterável após o login).
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalAdminOpen(false)}
                    className="px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Entrar como Administrador</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating toast */}
      {toastMessage && (
        <div className="no-print fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm flex items-center gap-2 border border-slate-800">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};
