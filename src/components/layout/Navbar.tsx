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
} from 'lucide-react';
import { formatarDataBR } from '../../utils/dateUtils';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    avisosNaoEnviadosCount,
    gerarProgramacaoProximos30Dias,
    hoje,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleGerar30Dias = () => {
    const total = gerarProgramacaoProximos30Dias();
    if (total > 0) {
      setToastMessage(`${total} nova(s) viagem(ns) programada(s) para os próximos 30 dias!`);
      setActiveTab('viagens');
    } else {
      setToastMessage('Nenhuma folga pendente de programação nos próximos 30 dias.');
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const navItems = [
    { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
    { id: 'folgas', label: 'Controle de Folgas', icon: Calendar },
    { id: 'viagens', label: 'Viagens & Fluxo', icon: Plane },
    { id: 'ficha', label: 'Ficha de Solicitação', icon: FileText },
    {
      id: 'avisos',
      label: 'Avisos WhatsApp',
      icon: MessageCircle,
      badge: avisosNaoEnviadosCount > 0 ? avisosNaoEnviadosCount : undefined,
    },
    { id: 'colaboradores', label: 'Colaboradores', icon: Users },
    { id: 'orientacoes', label: 'Orientações & GAS', icon: HelpCircle },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-8">
            {/* Zone 1: Single text element Brand wordmark */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('folgas')}
                className="text-left group cursor-pointer focus:outline-none"
              >
                <div className="text-base sm:text-lg font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                  Controle de Folgas e Viagens – UMCA
                </div>
              </button>
            </div>

            {/* Zone 2: Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex items-center gap-2 px-3 py-1.5 text-xs xl:text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className={`ml-1 text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-500 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: 1 Primary Action */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleGerar30Dias}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition-all whitespace-nowrap cursor-pointer"
                title="Cria automaticamente viagens na etapa Programada para folgas nos próximos 30 dias"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Programar Próximos 30d</span>
              </button>

              {/* Mobile hamburger button */}
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
              <button
                onClick={handleGerar30Dias}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Programar 30 dias
              </button>
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

      {/* Floating notification toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
};
