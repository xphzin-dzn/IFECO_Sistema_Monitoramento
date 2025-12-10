import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Area, Bar
} from 'recharts';
import {
  Bluetooth, BluetoothConnected, Circle, Square, 
  Download, Activity, Thermometer, Zap, Clock,
  Play, Trash2, BarChart3, Home, WifiOff
} from 'lucide-react'; 
import useWebBle from './hooks/useWebBle'; 

// --- TIPOS E CONSTANTES ---

const TARGET_DEVICE_NAME = 'IFECO_TELEMETRIA';

interface CombinedSensorData {
  timestamp: number;
  velocidade: number; // km/h
  tensao: number; // Volts (V)
  corrente: number; // Amperes (A)
  temperatura: number; // Graus Celsius
}

interface SessionData {
  sessionId: string;
  startTime: number;
  endTime: number;
  dataPoints: number;
  data: CombinedSensorData[];
}

type ViewMode = 'DISCONNECTED' | 'CONNECTED_IDLE' | 'RECORDING' | 'UPLOADING' | 'DASHBOARD_VIEW' | 'ERRO_BLE';

// --- INTERFACES PARA COMPONENTES AUXILIARES ---

interface MetricCardProps {
    icon: React.ElementType;
    label: string;
    value: string;
    unit: string;
    color: 'green' | 'yellow' | 'blue' | 'red';
}

interface ChartSectionProps {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
}

interface LoadingSpinnerProps {
    message: string;
}

// Componente auxiliar para Card de Métrica
const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, unit, color }) => (
  <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center">
      <Icon className={`w-6 h-6 text-${color}-500 mb-2`} />
      <h4 className="font-medium text-sm text-gray-600">{label}</h4>
      <div className="text-3xl font-bold text-gray-800 mt-1">{value}</div>
      <div className="text-sm text-gray-500">{unit}</div>
  </div>
);

// Componente auxiliar para a seção de gráficos
const ChartSection: React.FC<ChartSectionProps> = ({ title, icon: Icon, children }) => (
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

// Componente auxiliar para spinner
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => (
    <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{message}</p>
    </div>
);


// Componente principal
function App() {
  // --- INTEGRAÇÃO DO HOOK WEB BLE ---
  const { dadosVeiculo, status: bleStatus, conectarDispositivo, desconectarDispositivo } = useWebBle();
  
  // Estados principais
  const [viewMode, setViewMode] = useState<ViewMode>('DISCONNECTED');
  
  // Dados da sessão atual (Ref para gravação eficiente)
  const sessionDataRef = useRef<CombinedSensorData[]>([]);
  const [packetCount, setPacketCount] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<number | null>(null);
  
  // Dados históricos (dashboard)
  const [sessionHistory, setSessionHistory] = useState<SessionData | null>(null);
  // O estado 'isLoadingHistory' foi removido
  
  // Variável para armazenar o tempo de início da gravação
  const startTimeRef = useRef(0);

  // Limpar sessão atual
  const clearSession = useCallback(() => {
    sessionDataRef.current = [];
    setPacketCount(0);
    setRecordingTime(0);
    if (recordingInterval) clearInterval(recordingInterval);
    setSessionHistory(null);
    startTimeRef.current = 0;
  }, [recordingInterval]);

  // Iniciar temporizador de gravação
  const startRecordingTimer = useCallback(() => {
    if (recordingInterval) clearInterval(recordingInterval);
    
    startTimeRef.current = Date.now();
    
    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    setRecordingInterval(interval as unknown as number);
  }, [recordingInterval]);

  // Parar temporizador
  const stopRecordingTimer = useCallback(() => {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
  }, [recordingInterval]);

  
  // --- LÓGICA DE SINCRONIZAÇÃO DE ESTADO ---
  useEffect(() => {
      // Sincroniza o viewMode com o status do hook useWebBle
      if (bleStatus === 'Navegador Incompatível' || bleStatus === 'Erro') {
          setViewMode('ERRO_BLE');
      } else if (bleStatus === 'Conectado') {
          if (viewMode !== 'RECORDING') {
             setViewMode('CONNECTED_IDLE');
          }
      } else if (bleStatus === 'Desconectado' || bleStatus === 'Pronto') {
          setViewMode('DISCONNECTED');
          clearSession(); 
      }
      
      if (bleStatus === 'Desconectado' && recordingInterval) {
          stopRecordingTimer();
      }
  }, [bleStatus, viewMode, recordingInterval, clearSession, stopRecordingTimer]);


  // --- EFEITO DE GRAVAÇÃO: CAPTURA DADOS DO HOOK QUANDO EM RECORDING ---
  useEffect(() => {
      if (viewMode === 'RECORDING' && dadosVeiculo.velocidade !== 0) { 
          
          const newCombinedData: CombinedSensorData = {
              timestamp: Date.now(), 
              velocidade: dadosVeiculo.velocidade,
              tensao: dadosVeiculo.tensao,
              corrente: dadosVeiculo.corrente,
              temperatura: dadosVeiculo.temperatura
          };

          sessionDataRef.current.push(newCombinedData);
          setPacketCount(prev => prev + 1);
      }
  }, [dadosVeiculo.velocidade, dadosVeiculo.tensao, dadosVeiculo.corrente, dadosVeiculo.temperatura, viewMode]);


  // Iniciar gravação
  const startRecording = async () => {
    if (bleStatus !== 'Conectado') return;

    try {
      // Resetar dados da sessão
      sessionDataRef.current = [];
      setPacketCount(0);
      setRecordingTime(0);
      
      // Iniciar temporizador
      startRecordingTimer();
      
      setViewMode('RECORDING');
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      alert('Erro ao iniciar gravação');
    }
  };

  // Parar gravação e fazer upload
  const stopAndUpload = async () => {
    stopRecordingTimer();
    setViewMode('UPLOADING');
    
    const endTime = Date.now();
    
    try {
      const sessionData: SessionData = {
        sessionId: `session_${startTimeRef.current}`,
        startTime: startTimeRef.current,
        endTime: endTime,
        dataPoints: packetCount,
        data: sessionDataRef.current
      };

      // Simulação do envio para o backend
      // Se o backend existir, o Axios enviará os dados
      await axios.post('http://localhost:3000/api/save-session', sessionData);
      
      // Simulação da busca de dados
      setSessionHistory(sessionData);
      
      setViewMode('DASHBOARD_VIEW');
      
    } catch (error) {
      console.error('Erro ao enviar dados para o servidor:', error);
      alert('Erro ao enviar dados para o servidor. Exibindo dados coletados localmente.');
      
      // Se falhar, exibe os dados coletados localmente
      setSessionHistory({
          sessionId: `session_${startTimeRef.current}`,
          startTime: startTimeRef.current,
          endTime: endTime,
          dataPoints: packetCount,
          data: sessionDataRef.current
      });
      setViewMode('DASHBOARD_VIEW');
    }
  };

  // Formatar tempo (segundos para MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Preparar dados para gráficos
  const prepareChartData = useCallback(() => {
    if (!sessionHistory?.data) return [];
    
    const chartData = sessionHistory.data.map(item => ({
      timestamp: item.timestamp,
      time: new Date(item.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
      temperature: item.temperatura,
      voltage: item.tensao,
      current: item.corrente,
      speed: item.velocidade
    }));
    
    return chartData.sort((a, b) => a.timestamp - b.timestamp);
  }, [sessionHistory]);


  // Renderizar baseado no estado atual
  const renderView = () => {
    switch(viewMode) {
      case 'ERRO_BLE':
        return (
            <div className="text-center py-12">
                <WifiOff className="w-24 h-24 mx-auto text-red-500 mb-6" />
                <h2 className="text-2xl font-bold text-red-700 mb-4">Erro de Compatibilidade</h2>
                <p className="text-red-600 mb-8">
                    A Web Bluetooth API não é suportada ou o Bluetooth está desligado.
                    Use Google Chrome ou Edge e acesse via **https://** ou **localhost**.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center mx-auto gap-2"
                >
                    Recarregar Página
                </button>
            </div>
        );

      case 'DISCONNECTED':
        return (
          <div className="text-center py-12">
            <WifiOff className="w-24 h-24 mx-auto text-gray-400 mb-6" />
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Desconectado</h2>
            <p className="text-gray-600 mb-8">Conecte-se ao **{TARGET_DEVICE_NAME}** para iniciar</p>
            <button
              onClick={conectarDispositivo} 
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center mx-auto gap-2"
              disabled={bleStatus === 'Escaneando' || bleStatus === 'Conectando'}
            >
              <Bluetooth className="w-5 h-5" />
              {bleStatus === 'Escaneando' ? 'Escaneando...' : bleStatus === 'Conectando' ? 'Conectando...' : 'Conectar Dispositivo'}
            </button>
          </div>
        );

      case 'CONNECTED_IDLE':
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <BluetoothConnected className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Conectado ao {TARGET_DEVICE_NAME}</h3>
                <p className="text-green-600 text-sm">Pronto para iniciar gravação</p>
              </div>
            </div>
            
            <div className="flex gap-4 pt-4">
              <button
                onClick={startRecording}
                className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Iniciar Gravação
              </button>
              <button
                onClick={desconectarDispositivo} 
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Desconectar
              </button>
            </div>
          </div>
        );

      case 'RECORDING':
        return (
          <div className="space-y-6">
            {/* Banner de gravação ativa */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Circle className="w-6 h-6 text-red-600" fill="#dc2626" />
                  <div className="absolute inset-0 animate-ping">
                    <Circle className="w-6 h-6 text-red-600 opacity-75" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">Gravando...</h3>
                  <p className="text-red-600 text-sm">Coletando dados: {packetCount} pontos</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-700">{formatTime(recordingTime)}</div>
                <div className="text-sm text-red-600">Tempo decorrido</div>
              </div>
            </div>

            {/* Métricas de coleta EM TEMPO REAL (Dados do Hook) */}
            <h4 className="font-semibold text-gray-800 mt-6">Monitoramento ao Vivo</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard icon={Activity} label="Velocidade" value={dadosVeiculo.velocidade.toFixed(1)} unit="km/h" color="green" />
              <MetricCard icon={Zap} label="Tensão" value={dadosVeiculo.tensao.toFixed(1)} unit="V" color="yellow" />
              <MetricCard icon={Zap} label="Corrente" value={dadosVeiculo.corrente.toFixed(1)} unit="A" color="blue" />
              <MetricCard icon={Thermometer} label="Temperatura" value={dadosVeiculo.temperatura.toFixed(1)} unit="°C" color="red" />
            </div>

            {/* Controles de gravação */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={stopAndUpload}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Square className="w-5 h-5" />
                Parar e Salvar ({packetCount} pts)
              </button>
              <button
                onClick={() => {
                  stopRecordingTimer();
                  clearSession();
                  setViewMode('CONNECTED_IDLE');
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Cancelar Gravação
              </button>
            </div>
          </div>
        );

      case 'UPLOADING':
        return (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Enviando Dados...</h2>
            <p className="text-gray-600">Processando e armazenando {packetCount} pontos de dados</p>
            <div className="mt-4 text-sm text-gray-500">
              Aguarde enquanto enviamos os dados para análise
            </div>
          </div>
        );

      case 'DASHBOARD_VIEW':
        const dashboardData = prepareChartData();
        
        return (
          <div className="space-y-8">
            {/* Cabeçalho da sessão */}
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">Sessão de Análise</h2>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Duração: {formatTime(recordingTime)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      <span>{packetCount} pontos de dados</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      <span>{new Date(sessionHistory?.endTime || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setViewMode('CONNECTED_IDLE')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Nova Sessão
                </button>
              </div>
            </div>

            {/* Gráficos */}
            {dashboardData.length > 0 ? (
              <div className="space-y-8">
                <ChartSection 
                    title="Tensão e Corrente" 
                    icon={Zap} 
                    children={(
                        <ComposedChart data={dashboardData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="time" />
                            <YAxis yAxisId="left" label={{ value: 'Tensão (V)', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Corrente (A)', angle: 90, position: 'insideRight' }} />
                            <Tooltip />
                            <Legend />
                            <Area yAxisId="left" type="monotone" dataKey="voltage" stroke="#f59e0b" fill="#fef3c7" name="Tensão (V)" />
                            <Line yAxisId="right" type="monotone" dataKey="current" stroke="#3b82f6" strokeWidth={2} name="Corrente (A)" />
                        </ComposedChart>
                    )}
                />

                <ChartSection 
                    title="Velocidade" 
                    icon={Activity} 
                    children={(
                        <LineChart data={dashboardData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="time" />
                            <YAxis label={{ value: 'Velocidade (km/h)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="speed" stroke="#10b981" strokeWidth={3} name="Velocidade" dot={false} />
                        </LineChart>
                    )}
                />
                
                <ChartSection 
                    title="Temperatura" 
                    icon={Thermometer} 
                    children={(
                        <ComposedChart data={dashboardData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="time" />
                            <YAxis label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="temperature" fill="#fca5a5" name="Temperatura (°C)" />
                            <Line type="monotone" dataKey="temperature" stroke="#dc2626" strokeWidth={2} name="Tendência" />
                        </ComposedChart>
                    )}
                />

              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border">
                <BarChart3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Sem dados para exibir</h3>
                <p className="text-gray-600">Nenhum ponto de dados foi coletado nesta sessão</p>
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-4">
              <button
                onClick={() => setViewMode('CONNECTED_IDLE')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                Nova Gravação
              </button>
              <button
                onClick={clearSession}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Limpar Dados (Local)
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Cabeçalho */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bluetooth className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">IFECO IoT Monitor</h1>
                <p className="text-sm text-gray-600">Sistema de Monitoramento para o Protótipo</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Indicador de estado */}
              <div className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                style={{
                  backgroundColor: 
                    bleStatus === 'Desconectado' || bleStatus === 'Pronto' ? '#f3f4f6' :
                    bleStatus === 'Conectado' ? '#d1fae5' :
                    bleStatus === 'Escaneando' || bleStatus === 'Conectando' ? '#fef3c7' :
                    '#dbeafe',
                  color:
                    bleStatus === 'Desconectado' || bleStatus === 'Pronto' ? '#6b7280' :
                    bleStatus === 'Conectado' ? '#065f46' :
                    bleStatus === 'Escaneando' || bleStatus === 'Conectando' ? '#92400e' :
                    '#1e40af'
                }}
              >
                <div className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: 
                      bleStatus === 'Desconectado' || bleStatus === 'Pronto' ? '#9ca3af' :
                      bleStatus === 'Conectado' ? '#10b981' :
                      bleStatus === 'Escaneando' || bleStatus === 'Conectando' ? '#f59e0b' :
                      '#3b82f6'
                  }}
                ></div>
                <span>
                  {bleStatus === 'Conectado' && viewMode === 'RECORDING' ? 'Em Gravação' : bleStatus}
                </span>
              </div>
              
              {/* Estatísticas rápidas */}
              {viewMode === 'RECORDING' && (
                <div className="hidden md:flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-gray-800">{packetCount}</div>
                    <div className="text-gray-500">Pacotes</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-gray-800">{formatTime(recordingTime)}</div>
                    <div className="text-gray-500">Tempo</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
          <div className="p-6 md:p-8">
            {renderView()}
          </div>
        </div>

        {/* Nota informativa */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>O sistema foi adaptado para a Web Bluetooth API, eliminando a dependência do App Mobile.</p>
          <p className="mt-1">Lembre-se: O código do ESP32 deve ser conectado manualmente no popup do navegador (gasto de energia da bateria do carro).</p>
        </div>
      </main>
    </div>
  );
}

export default App;