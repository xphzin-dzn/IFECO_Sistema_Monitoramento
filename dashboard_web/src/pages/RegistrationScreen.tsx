import axios from 'axios';
import { UserPlus } from 'lucide-react'; // Ícone para o botão
import React, { useState } from 'react';

// Adicionado: Interface para as propriedades (props) de navegação
interface RegistrationScreenProps {
    onSwitchToLogin: () => void; // Função que volta para a tela de Login
}

// Corrigido: Definição da cor primária
const IFECO_GREEN = '#4CAF50';

// Adicionado: Interface para o estado do formulário para tipagem correta
interface FormData {
    nomeCompleto: string;
    email: string;
    dataNascimento: string;
    telefone: string;
    senha: string;
    confirmarSenha: string;
}

// Alterada a assinatura do componente para aceitar as props
const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onSwitchToLogin }) => {
    const [formData, setFormData] = useState<FormData>({
        nomeCompleto: '',
        email: '',
        dataNascimento: '',
        telefone: '',
        senha: '',
        confirmarSenha: ''
    });
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Função de Registro AGORA É ASSÍNCRONA e lida com a API
    const handleRegistration = async (e: React.FormEvent) => {
        e.preventDefault(); // Impede o recarregamento da página

        // --- VALIDAÇÕES DE FRONTEND ---
        if (!formData.nomeCompleto || !formData.email || !formData.senha || !formData.confirmarSenha) {
            setMessage('Por favor, preencha todos os campos obrigatórios (*)');
            setIsError(true);
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setMessage('Por favor, insira um e-mail válido');
            setIsError(true);
            return;
        }

        if (formData.senha !== formData.confirmarSenha) {
            setMessage('As senhas não coincidem');
            setIsError(true);
            return;
        }

        if (formData.senha.length < 6) {
            setMessage('A senha deve ter pelo menos 6 caracteres');
            setIsError(true);
            return;
        }
        // --- FIM DAS VALIDAÇÕES ---

        // Simulação de chamada à API
        try {
            // A rota de registro no seu backend Node.js deve ser /api/register
            const response = await axios.post('http://localhost:3000/api/register', {
                // Enviamos apenas os dados que a TB_USUARIOS precisa (nome, email, senha)
                nome: formData.nomeCompleto,
                email: formData.email,
                senha: formData.senha
            });

            // Sucesso na inserção do banco
            if (response.status === 201 || response.data.success) {
                setMessage('Conta criada com sucesso! Redirecionando para login...');
                setIsError(false);

                // Redirecionamento após 1.5 segundos
                setTimeout(() => {
                    onSwitchToLogin();
                }, 1500);
            } else {
                // Lidar com erros de negócio do backend (ex: email já em uso)
                setMessage(response.data.message || 'Erro ao registrar. O e-mail pode já estar em uso.');
                setIsError(true);
            }

        } catch (error) {
            console.error("Erro na API de Registro:", error);
            // Mensagem genérica de falha na rede ou servidor indisponível
            setMessage('Falha na comunicação com o servidor. Verifique o backend.');
            setIsError(true);
        }
    };

    // Remoção do onKeyPress dos inputs para simplificar (o botão é suficiente)
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            // Força o envio do formulário
            handleRegistration(e as unknown as React.FormEvent);
        }
    };

    // Função de Navegação de volta (Executa a prop)
    const handleBackToLogin = () => {
        onSwitchToLogin();
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
                maxWidth: '550px',
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
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
                    <div style={{ marginBottom: '28px' }}>
                        <h2 style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#2c3e50',
                            margin: '0 0 8px 0'
                        }}>
                            Criar Conta
                        </h2>
                        <p style={{
                            fontSize: '14px',
                            color: '#7f8c8d',
                            margin: 0
                        }}>
                            Crie uma conta para continuar!
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

                    {/* Formulário (utilizando form tag para melhor acessibilidade) */}
                    <form onSubmit={handleRegistration} style={{ marginBottom: '24px' }}>
                        {/* Nome Completo */}
                        <input
                            type="text"
                            placeholder="Nome Completo *"
                            value={formData.nomeCompleto}
                            onChange={(e) => handleInputChange('nomeCompleto', e.target.value)}
                            onKeyPress={handleKeyPress}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '15px',
                                marginBottom: '14px',
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

                        {/* E-mail */}
                        <input
                            type="email"
                            placeholder="E-mail *"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            onKeyPress={handleKeyPress}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '15px',
                                marginBottom: '14px',
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

                        {/* Data de Nascimento */}
                        <input
                            type="text"
                            placeholder="Data de Nascimento (DD/MM/AAAA)"
                            value={formData.dataNascimento}
                            onChange={(e) => handleInputChange('dataNascimento', e.target.value)}
                            onKeyPress={handleKeyPress}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '15px',
                                marginBottom: '14px',
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

                        {/* Telefone */}
                        <input
                            type="text"
                            placeholder="Número de Telefone"
                            value={formData.telefone}
                            onChange={(e) => handleInputChange('telefone', e.target.value)}
                            onKeyPress={handleKeyPress}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '15px',
                                marginBottom: '14px',
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

                        {/* Senha */}
                        <input
                            type="password"
                            placeholder="Senha *"
                            value={formData.senha}
                            onChange={(e) => handleInputChange('senha', e.target.value)}
                            onKeyPress={handleKeyPress}
                            style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '8px',
                                border: '1px solid #ddd',
                                fontSize: '15px',
                                marginBottom: '14px',
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

                        {/* Confirmar Senha */}
                        <input
                            type="password"
                            placeholder="Confirmar Senha *"
                            value={formData.confirmarSenha}
                            onChange={(e) => handleInputChange('confirmarSenha', e.target.value)}
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

                        {/* Botão de Registro (SUBMIT) */}
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
                                marginTop: '16px',
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
                            <UserPlus style={{ width: '20px', height: '20px' }} />
                            Registrar
                        </button>
                    </form>

                    {/* Link para Login */}
                    <div style={{
                        marginTop: '24px',
                        textAlign: 'center',
                        fontSize: '14px',
                        color: '#7f8c8d'
                    }}>
                        Já possui conta?{' '}
                        <button
                            onClick={handleBackToLogin} // <-- EXECUTA A NAVEGAÇÃO
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
                            Fazer login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegistrationScreen;