/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { PainelIndicadores } from './components/indicadores/PainelIndicadores';
import { ControleFolgas } from './components/folgas/ControleFolgas';
import { FluxoViagens } from './components/viagens/FluxoViagens';
import { FichaSolicitacao } from './components/ficha/FichaSolicitacao';
import { AvisosColaborador } from './components/avisos/AvisosColaborador';
import { CadastroColaboradores } from './components/colaboradores/CadastroColaboradores';
import { OrientacoesAjuda } from './components/orientacoes/OrientacoesAjuda';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
      {activeTab === 'indicadores' && <PainelIndicadores />}
      {activeTab === 'folgas' && <ControleFolgas />}
      {activeTab === 'viagens' && <FluxoViagens />}
      {activeTab === 'ficha' && <FichaSolicitacao />}
      {activeTab === 'avisos' && <AvisosColaborador />}
      {activeTab === 'colaboradores' && <CadastroColaboradores />}
      {activeTab === 'orientacoes' && <OrientacoesAjuda />}
    </main>
  );
};

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
        <Navbar />
        <MainContent />
        <footer className="no-print border-t border-slate-200 bg-white py-4 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div>
              <span className="font-semibold text-slate-700">Controle de Folgas e Viagens – U&M</span>
              <span className="mx-2">·</span>
              <span>Operações UMCA · UMGE · UMBC · UMSS</span>
            </div>
            <div>
              <span>Ambiente operacional com dados fictícios de teste. Conforme LGPD.</span>
            </div>
          </div>
        </footer>
      </div>
    </AppProvider>
  );
}
