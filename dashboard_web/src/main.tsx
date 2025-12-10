import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Importa as telas
import DashboardScreen from './pages/DashboardScreen.tsx'; // Importado o Dashboard
import LoginScreen from './pages/LoginScreen.tsx';
import RegistrationScreen from './pages/RegistrationScreen.tsx';

// Componente Wrapper para gerenciar a visualização e autenticação
const AuthFlowManager: React.FC = () => {
  // Estado para 'login', 'register' ou 'dashboard'
  const [view, setView] = useState<'login' | 'register' | 'dashboard'>('login');
  const [userName, setUserName] = useState(''); // Estado para o nome do usuário

  // 1. Efeito para checar se o usuário já está logado ao carregar
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const name = localStorage.getItem('userName');

    if (token && name) {
      setUserName(name);
      setView('dashboard');
    }
  }, []);

  // Funções de Callback

  const handleLoginSuccess = (token: string, user: { nome: string }) => {
    setUserName(user.nome);
    setView('dashboard');
  };

  const handleLogout = () => {
    // Limpa o armazenamento local
    localStorage.removeItem('userToken');
    localStorage.removeItem('userName');
    setUserName('');
    // Retorna para a tela de login
    setView('login');
  };

  const renderScreen = () => {
    if (view === 'dashboard') {
      return <DashboardScreen
        onLogout={handleLogout}
        userName={userName} // Passa o nome para o Header
      />;
    }

    if (view === 'register') {
      return <RegistrationScreen
        onSwitchToLogin={() => setView('login')}
      />;
    }

    if (view === 'login') {
      return <LoginScreen
        onSwitchToRegister={() => setView('register')}
        onLoginSuccess={handleLoginSuccess} // Passa o novo callback
      />;
    }

    return <div>Carregando...</div>;
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