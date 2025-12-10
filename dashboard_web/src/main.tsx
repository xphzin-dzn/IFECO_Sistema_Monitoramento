import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Importa as duas telas
import LoginScreen from './pages/LoginScreen.tsx';
import RegistrationScreen from './pages/RegistrationScreen.tsx';

// Componente Wrapper para gerenciar a visualização
const AuthFlowManager: React.FC = () => {
  // Estado que define a tela atual: 'login' ou 'register'
  const [view, setView] = useState<'login' | 'register'>('login');

  const renderScreen = () => {
    if (view === 'login') {
      return <LoginScreen
        onSwitchToRegister={() => setView('register')}
      />;
    }

    if (view === 'register') {
      return <RegistrationScreen
        onSwitchToLogin={() => setView('login')}
      />;
    }

    // Futuro: Adicionar lógica para a tela do Dashboard (App.tsx) após login bem-sucedido
    return <div>Tela de Carregamento...</div>;
  };

  return (
    <React.StrictMode>
      {renderScreen()}
    </React.StrictMode>
  );
};

// Renderiza o novo gerenciador de fluxo
ReactDOM.createRoot(document.getElementById('root')!).render(
  <AuthFlowManager />
);