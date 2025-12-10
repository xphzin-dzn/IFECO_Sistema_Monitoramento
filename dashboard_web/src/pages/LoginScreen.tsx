import { useState } from 'react';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleLogin = () => {
        if (!email || !password) {
            setMessage('Por favor, preencha todos os campos');
            setIsError(true);
            return;
        }

        console.log('Tentativa de login com:', { email, password });
        setMessage('Login realizado com sucesso!');
        setIsError(false);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    const handleForgotPassword = () => {
        console.log('Navegando para recuperação de senha');
        alert('Redirecionando para recuperação de senha...');
    };

    const handleCreateAccount = () => {
        console.log('Navegando para tela de registro');
        alert('Redirecionando para criar conta...');
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px'
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
                    background: '#4CAF50',
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
                            color: '#4CAF50',
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

                    {/* Campos de Input */}
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
                                transition: 'all 0.3s'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#4CAF50';
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
                                transition: 'all 0.3s'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#4CAF50';
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
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#4CAF50',
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

                    {/* Botão de Login */}
                    <button
                        onClick={handleLogin}
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
                            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)'
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
                        Entrar
                    </button>

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
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#4CAF50',
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