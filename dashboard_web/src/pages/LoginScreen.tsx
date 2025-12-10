import axios from 'axios'; // Necessário para a chamada à API
import { LogIn } from 'lucide-react'; // Ícone para o botão
import React, { useState } from 'react';

// Adicionado: Interface para os dados do usuário logado (nome é crucial para o Dashboard)
interface UserData {
    id: number;
    email: string;
    nome: string; // Nome do usuário
}

// 1. Interface de Props do LoginScreen
interface LoginScreenProps {
    onSwitchToRegister: () => void;
    // NOVO: Callback para notificar o componente pai (main.tsx) do sucesso
    onLoginSuccess: (token: string, user: UserData) => void;
}

const IFECO_GREEN = '#4CAF50';

// 2. Altere a assinatura do componente para aceitar as props
const LoginScreen: React.FC<LoginScreenProps> = ({ onSwitchToRegister, onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    // Função assíncrona que lida com a autenticação
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        if (!email || !password) {
            setMessage('E-mail e senha são obrigatórios.');
            setIsError(true);
            return;
        }

        try {
            // Chamada à API de Login
            const response = await axios.post('http://localhost:3000/api/login', {
                email: email,
                senha: password
            });

            // Assumindo que a API retorna: { success: true, token, user: { id, email, nome } }
            if (response.data.success && response.data.token && response.data.user) {
                const { token, user } = response.data;

                // 3. Salvar Token e Nome no armazenamento local
                localStorage.setItem('userToken', token);
                localStorage.setItem('userName', user.nome);

                setMessage('Login realizado com sucesso! Redirecionando...');

                // 4. CHAMA O CALLBACK: Notifica o AuthFlowManager para mudar para a tela 'dashboard'
                onLoginSuccess(token, user);

            } else {
                setMessage(response.data.message || 'Credenciais inválidas.');
                setIsError(true);
            }

        } catch (error: any) {
            console.error("Erro na API de Login:", error);

            // Tratamento de erro 401 (Não Autorizado) e 500 (Servidor)
            if (error.response && error.response.status === 401) {
                setMessage('Credenciais inválidas. Verifique e-mail e senha.');
            } else {
                setMessage('Falha na comunicação com o servidor. Tente novamente.');
            }
            setIsError(true);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLogin(e as unknown as React.FormEvent);
        }
    };

    const handleForgotPassword = () => {
        console.log('Navegando para recuperação de senha');
        alert('Redirecionando para recuperação de senha...');
    };

    const handleCreateAccount = () => {
        console.log('Navegando para tela de registro');
        onSwitchToRegister();
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            overflow: 'hidden',
            position: 'fixed',
            top: 0,
            left: 0
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                width: '100%',
                maxWidth: '450px',
                display: 'flex',
                overflow: 'hidden'
            }}>
                {/* Barra Lateral Verde */}
                <div style={{
                    width: '8px',
                    background: IFECO_GREEN,
                    flexShrink: 0
                }}></div>

                {/* Conteúdo Principal */}
                <div style={{
                    flex: 1,
                    padding: '48px 40px'
                }}>
                    {/* Logotipo */}
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h1 style={{
                            fontSize: '42px',
                            fontWeight: 'bold',
                            color: IFECO_GREEN,
                            margin: 0,
                            letterSpacing: '1px'
                        }}>
                            IFECO
                        </h1>
                    </div>

                    {/* Título e Subtítulo */}
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#2c3e50',
                            margin: '0 0 8px 0'
                        }}>
                            Entre com sua conta
                        </h2>
                        <p style={{
                            fontSize: '14px',
                            color: '#7f8c8d',
                            margin: 0
                        }}>
                            Digite seu e-mail e senha para efetuar login.
                        </p>
                    </div>

                    {/* Mensagem de Feedback */}
                    {message && (
                        <div style={{
                            marginBottom: '20px',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            textAlign: 'center',
                            backgroundColor: isError ? '#ffebee' : '#e8f5e9',
                            color: isError ? '#c62828' : '#2e7d32',
                            border: `1px solid ${isError ? '#ef9a9a' : '#a5d6a7'}`
                        }}>
                            {message}
                        </div>
                    )}

                    {/* Formulário (usando form tag para submit no enter) */}
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '24px' }}>
                            <input
                                type="email"
                                placeholder="E-mail"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyPress={handleKeyPress}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    fontSize: '15px',
                                    marginBottom: '16px',
                                    boxSizing: 'border-box',
                                    outline: 'none',
                                    transition: 'all 0.3s',
                                    backgroundColor: '#ffffff',
                                    color: '#000000'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = IFECO_GREEN;
                                    e.target.style.boxShadow = '0 0 0 3px rgba(76, 175, 80, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#ddd';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />

                            <input
                                type="password"
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyPress={handleKeyPress}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #ddd',
                                    fontSize: '15px',
                                    boxSizing: 'border-box',
                                    outline: 'none',
                                    transition: 'all 0.3s',
                                    backgroundColor: '#ffffff',
                                    color: '#000000'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = IFECO_GREEN;
                                    e.target.style.boxShadow = '0 0 0 3px rgba(76, 175, 80, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#ddd';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>

                        {/* Link de Recuperação */}
                        <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                            <button
                                onClick={handleForgotPassword}
                                type="button"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: IFECO_GREEN,
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                            >
                                Esqueceu sua Senha?
                            </button>
                        </div>

                        {/* Botão de Login (type="submit" para funcionar com form) */}
                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 175, 80, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                            }}
                        >
                            <LogIn style={{ width: '20px', height: '20px' }} />
                            Entrar
                        </button>
                    </form>

                    {/* Link de Registro */}
                    <div style={{
                        marginTop: '24px',
                        textAlign: 'center',
                        fontSize: '14px',
                        color: '#7f8c8d'
                    }}>
                        Não possui conta?{' '}
                        <button
                            onClick={handleCreateAccount}
                            type="button"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: IFECO_GREEN,
                                fontWeight: '600',
                                cursor: 'pointer',
                                padding: 0
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                            Criar conta
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;