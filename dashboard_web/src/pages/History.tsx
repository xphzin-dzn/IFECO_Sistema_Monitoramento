import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    Clock,
    Download,
    Eye,
    User,
    MapPin,
    ArrowLeft,
    Activity,
    Zap,
    Thermometer,
    Search,
    LogOut,
    Loader2,
    AlertCircle
} from 'lucide-react';
import {
    Area,
    Bar,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import api from '../services/api';

// --- TIPOS E CONSTANTES ---

interface SessionSummary {
    id: number;
    nome_piloto: string;
    nome_pista: string;
    data_inicio: string;
    data_fim: string;
    observacoes: string;
}

interface SensorData {
    id: number;
    timestamp: string; // Vem como string ISO do MySQL/Node
    velocidade: number;
    tensao: number;
    corrente: number;
    temperatura: number;
}

interface HistoryProps {
    onLogout: () => void;
    userName: string;
}

type ViewMode = 'LIST' | 'DETAILS';

// --- COMPONENTES AUXILIARES (Reutilizados do Dashboard) ---

const MetricCard: React.FC<{ icon: React.ElementType; label: string; value: string; unit: string; color: string }> = ({ icon: Icon, label, value, unit, color }) => (
    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center">
        <Icon className={w - 6 h-6 text-${color}-500 mb-2} />
        <h4 className="font-medium text-sm text-gray-600">{label}</h4>
        <div className="text-3xl font-bold text-gray-800 mt-1">{value}</div>
        <div className="text-sm text-gray-500">{unit}</div>
    </div>
);

const ChartSection: React.FC<{ title: string; icon: React.ElementType; children: React.ReactNode }> = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title}
        </h3>
        <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    </div>
);

// --- COMPONENTE PRINCIPAL: HISTORY SCREEN ---

const History: React.FC<HistoryProps> = ({ onLogout, userName }) => {
    // Estados
    const [viewMode, setViewMode] = useState<ViewMode>('LIST');
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const [selectedSession, setSelectedSession] = useState<SessionSummary | null>(null);
    const [sessionDetails, setSessionDetails] = useState<SensorData[]>([]);

    // Estados de UI
    const [loading, setLoading] = useState(false);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Carregar lista ao montar
    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const response = await api.get('/sessions');
            setSessions(response.data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Falha ao carregar o histórico de sessões.');
        } finally {
            setLoading(false);
        }
    };

    // Função para entrar no modo Detalhes
    const handleViewDetails = async (session: SessionSummary) => {
        try {
            setLoading(true);
            const response = await api.get(/session/${ session.id });
            setSessionDetails(response.data);
            setSelectedSession(session);
            setViewMode('DETAILS');
        } catch (err) {
            console.error(err);
            alert('Erro ao carregar detalhes da sessão.');
        } finally {
            setLoading(false);
        }
    };

    // Voltar para lista
    const handleBackToList = () => {
        setViewMode('LIST');
        setSelectedSession(null);
        setSessionDetails([]);
    };

    // Download JSON
    const handleDownload = async (e: React.MouseEvent, id: number, pilotName: string) => {
        e.stopPropagation(); // Evita clicar na linha e abrir detalhes
        try {
            setDownloadingId(id);
            const response = await api.get(/session/${ id });

            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = sessao_${ pilotName }_${ id }.json;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            alert('Erro ao baixar arquivo.');
        } finally {
            setDownloadingId(null);
        }
    };

    // Preparar dados para os gráficos (Reutilizando lógica do Dashboard)
    const chartData = useMemo(() => {
        if (!sessionDetails.length) return [];

        return sessionDetails.map(item => ({
            ...item,
            time: new Date(item.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
            // Garante que null vire 0 ou seja tratado para não quebrar o gráfico
            velocidade: item.velocidade || 0,
            tensao: item.tensao || 0,
            corrente: item.corrente || 0,
            temperatura: item.temperatura || 0
        }));
    }, [sessionDetails]);

    // Formatadores
    const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const calculateDuration = (start: string, end: string) => {
        const diff = new Date(end).getTime() - new Date(start).getTime();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        return ${ minutes }m ${ seconds } s;
    };

    const calculateMaxSpeed = () => Math.max(...sessionDetails.map(d => d.velocidade || 0)).toFixed(1);
    const calculateAvgTemp = () => (sessionDetails.reduce((acc, curr) => acc + (curr.temperatura || 0), 0) / sessionDetails.length).toFixed(1);

    // --- RENDERIZAÇÃO DAS TELAS ---

    const renderList = () => (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Search className="w-5 h-5 text-gray-500" />
                    Registros Encontrados
                </h2>
                <div className="text-sm text-gray-500">
                    Total: {sessions.length} sessões
                </div>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Piloto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pista</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duração</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sessions.map((session) => (
                                <tr
                                    key={session.id}
                                    onClick={() => handleViewDetails(session)}
                                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{session.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{session.nome_piloto}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-gray-400" />
                                            {session.nome_pista}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(session.data_inicio)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            {calculateDuration(session.data_inicio, session.data_fim)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={(e) => handleDownload(e, session.id, session.nome_piloto)}
                                            className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-100 rounded-full transition-colors"
                                            title="Baixar JSON"
                                        >
                                            {downloadingId === session.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                        </button>
                                        <button
                                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors ml-2"
                                            title="Ver Detalhes"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sessions.length === 0 && !loading && (
                        <div className="text-center py-10 text-gray-500">
                            Nenhuma sessão encontrada no histórico.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderDetails = () => (
        <div className="space-y-8 animate-fade-in">
            {/* Botão Voltar e Cabeçalho Detalhes */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <button
                    onClick={handleBackToList}
                    className="flex items-center text-gray-600 hover:text-blue-600 transition-colors font-medium"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Voltar para Lista
                </button>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
                        Sessão #{selectedSession?.id}
                    </span>
                    <span className="text-gray-500 text-sm">
                        {selectedSession && formatDate(selectedSession.data_inicio)}
                    </span>
                </div>
            </div>

            {/* Resumo da Sessão (Cards Iguais ao Dashboard) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard icon={Activity} label="Velocidade Max" value={calculateMaxSpeed()} unit="km/h" color="green" />
                <MetricCard icon={Zap} label="Tensão Média" value="N/A" unit="V" color="yellow" />
                <MetricCard icon={Zap} label="Corrente Média" value="N/A" unit="A" color="blue" />
                <MetricCard icon={Thermometer} label="Temp. Média" value={calculateAvgTemp()} unit="°C" color="red" />
            </div>

            {/* Gráficos (Exatamente os mesmos do DashboardScreen) */}
            <div className="space-y-8">
                <ChartSection title="Tensão e Corrente" icon={Zap}>
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="time" />
                        <YAxis yAxisId="left" label={{ value: 'Tensão (V)', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" label={{ value: 'Corrente (A)', angle: 90, position: 'insideRight' }} />
                        <Tooltip />
                        <Legend />
                        <Area yAxisId="left" type="monotone" dataKey="tensao" stroke="#f59e0b" fill="#fef3c7" name="Tensão (V)" />
                        <Line yAxisId="right" type="monotone" dataKey="corrente" stroke="#3b82f6" strokeWidth={2} name="Corrente (A)" />
                    </ComposedChart>
                </ChartSection>

                <ChartSection title="Velocidade" icon={Activity}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="time" />
                        <YAxis label={{ value: 'Velocidade (km/h)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="velocidade" stroke="#10b981" strokeWidth={3} name="Velocidade" dot={false} />
                    </LineChart>
                </ChartSection>

                <ChartSection title="Temperatura" icon={Thermometer}>
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="time" />
                        <YAxis label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="temperatura" fill="#fca5a5" name="Temperatura (°C)" />
                        <Line type="monotone" dataKey="temperatura" stroke="#dc2626" strokeWidth={2} name="Tendência" />
                    </ComposedChart>
                </ChartSection>
            </div>
        </div>
    );

    // --- ESTRUTURA PRINCIPAL (Header + Main) ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Cabeçalho Reutilizado */}
            <header className="bg-white shadow-sm border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Histórico de Sessões</h1>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    Logado como <span className="font-semibold">{userName || 'Admin'}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={onLogout}
                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm"
                            >
                                <LogOut className="w-4 h-4" />
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Conteúdo Principal */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tratamento de Erro Global */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {error}
                    </div>
                )}

                {/* Loading Global */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                        <p className="text-gray-500">Carregando dados...</p>
                    </div>
                ) : (
                    // Renderiza Lista ou Detalhes baseado no estado
                    <div className="animate-fade-in">
                        {viewMode === 'LIST' ? renderList() : renderDetails()}
                    </div>
                )}
            </main>
        </div>
    );
};

export default History;