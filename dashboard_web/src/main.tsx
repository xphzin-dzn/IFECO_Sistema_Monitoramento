import React from 'react';
import ReactDOM from 'react-dom/client';
// 1. Importa a nova tela de Login
import './index.css';
import LoginScreen from './pages/LoginScreen.tsx';
// import App from './App.tsx'; // Não é mais usado aqui, mas mantenha o arquivo

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 2. Renderiza a Tela de Login como componente principal */}
    <LoginScreen />
  </React.StrictMode>,
);