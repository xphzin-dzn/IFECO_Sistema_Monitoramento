import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Importa as telas
// import DashboardScreen from './pages/DashboardScreen.tsx'; // <-- REMOVIDO
import LoginScreen from './pages/LoginScreen.tsx';
import RegistrationScreen from './pages/RegistrationScreen.tsx';

// Componente Wrapper para gerenciar a visualização e autenticação
const AuthFlowManager: React.FC = () => {
  // Estado para 'login', 'register' ou 'dashboard'
  // 'dashboard' é mantido para consistência do useEffect, mas será tratado
  const [view, setView] = useState<'login' | 'register' | 'dashboard'>('login');
  const [userName, setUserName] = useState(''); // Estado para o nome do usuário

  // 1. Efeito para checar se o usuário já está logado ao carregar
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const name = localStorage.getItem('userName');

    if (token && name) {
      setUserName(name);
      // Aqui, se o Dashboard for removido, redirecionamos para login
      // ou mantemos o estado de login se ele for reintroduzido.
      // Para evitar erro de componente, forçamos 'login' por enquanto.
      setView('login');
    }
  }, []);

  // Funções de Callback

  const handleLoginSuccess = (token: string, user: { nome: string }) => {
    setUserName(user.nome);
    // Ação alternativa para sucesso de login, pois o Dashboard foi removido.
    // Aqui, forçamos o retorno à tela de login e exibimos um alerta.
    setView('login');
    alert(`Login bem-sucedido, ${user.nome}! (Redirecionamento para Dashboard desativado)`);
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
    // O DashboardScreen foi removido desta função de renderização.
    if (view === 'dashboard') {
      // Retorna para login se a rota 'dashboard' for acionada acidentalmente
      return <LoginScreen
        onSwitchToRegister={() => setView('register')}
        onLoginSuccess={handleLoginSuccess}
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
        onLoginSuccess={handleLoginSuccess}
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