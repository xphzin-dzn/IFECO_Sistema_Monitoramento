import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Area, Bar
} from 'recharts';
import {
  Bluetooth, BluetoothConnected, Circle, Square, Upload,
  Download, Activity, Thermometer, Zap, Battery, Clock,
  Play, Pause, Trash2, BarChart3, Home, Wifi, WifiOff
} from 'lucide-react';

// Tipos
type SensorType = 'temp' | 'vol' | 'curr' | 'spd';
type ViewMode = 'DISCONNECTED' | 'CONNECTED_IDLE' | 'RECORDING' | 'UPLOADING' | 'DASHBOARD_VIEW';

interface SensorData {
  timestamp: number;
  type: SensorType;
  value: number;
}

interface SessionData {
  sessionId: string;
  startTime: number;
  endTime: number;
  dataPoints: number;
  data: SensorData[];
}

// Componente principal
function App() {
  // Estados principais
  const [viewMode, setViewMode] = useState<ViewMode>('DISCONNECTED');
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [server, setServer] = useState<BluetoothRemoteGATTServer | null>(null);
  
  // Dados da sessão atual
  const sessionDataRef = useRef<SensorData[]>([]);
  const [packetCount, setPacketCount] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Dados históricos (dashboard)
  const [sessionHistory, setSessionHistory] = useState<SessionData | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // Métricas em tempo real (apenas contadores)
  const [sensorCounts, setSensorCounts] = useState({
    temp: 0,
    vol: 0,
    curr: 0,
    spd: 0
  });

  // Iniciar temporizador de gravação
  const startRecordingTimer = () => {
    if (recordingInterval) clearInterval(recordingInterval);
    
    const interval = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    setRecordingInterval(interval);
  };

  // Parar temporizador
  const stopRecordingTimer = () => {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
  };

  // Conectar ao dispositivo Bluetooth
  const connectToDevice = async () => {
    try {
      console.log('Procurando dispositivos Bluetooth...');
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'ESP32' }],
        optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb']
      });

      const server = await device.gatt?.connect();
      
      setDevice(device);
      setServer(server || null);
      setViewMode('CONNECTED_IDLE');
      
      // Adicionar listener para desconexão
      device.addEventListener('gattserverdisconnected', () => {
        setViewMode('DISCONNECTED');
        setDevice(null);
        setServer(null);
      });

    } catch (error) {
      console.error('Erro na conexão Bluetooth:', error);
      alert('Falha ao conectar. Certifique-se que o dispositivo está pareado e visível.');
    }
  };

  // Desconectar
  const disconnectDevice = () => {
    if (device) {
      device.gatt?.disconnect();
      setViewMode('DISCONNECTED');
      setDevice(null);
      setServer(null);
    }
  };

  // Parser de dados Bluetooth
  const parseBluetoothData = (value: DataView): SensorData | null => {
    try {
      // Decodificar os dados como string UTF-8
      const decoder = new TextDecoder('utf-8');
      const jsonString = decoder.decode(value);
      
      // Tentar parsear como JSON
      const data = JSON.parse(jsonString);
      
      // Validar estrutura
      if (data.type && typeof data.val === 'number') {
        const sensorType = data.type as SensorType;
        
        // Atualizar contador por tipo
        setSensorCounts(prev => ({
          ...prev,
          [sensorType]: prev[sensorType] + 1
        }));
        
        return {
          timestamp: Date.now(),
          type: sensorType,
          value: data.val
        };
      }
    } catch (error) {
      console.warn('Dados recebidos não são JSON válido:', error);
      
      // Fallback: Simular dados para demonstração
      const mockTypes: SensorType[] = ['temp', 'vol', 'curr', 'spd'];
      const randomType = mockTypes[Math.floor(Math.random() * mockTypes.length)];
      const mockValue = randomType === 'temp' ? 20 + Math.random() * 10 :
                       randomType === 'vol' ? 12 + Math.random() * 2 :
                       randomType === 'curr' ? 1 + Math.random() * 3 :
                       0 + Math.random() * 100;
      
      setSensorCounts(prev => ({
        ...prev,
        [randomType]: prev[randomType] + 1
      }));
      
      return {
        timestamp: Date.now(),
        type: randomType,
        value: mockValue
      };
    }
    
    return null;
  };

  // Iniciar gravação
  const startRecording = async () => {
    if (!server) return;

    try {
      // Resetar dados da sessão
      sessionDataRef.current = [];
      setPacketCount(0);
      setRecordingTime(0);
      setSensorCounts({ temp: 0, vol: 0, curr: 0, spd: 0 });
      
      // Iniciar temporizador
      startRecordingTimer();
      
      // Simular recebimento de dados (em produção, substituir pelo GATT Characteristic)
      const simulationInterval = setInterval(() => {
        // Simular diferentes taxas de amostragem
        const now = Date.now();
        
        // Temperatura a cada 5 segundos
        if (recordingTime % 5 === 0) {
          const tempData = parseBluetoothData(new DataView(new ArrayBuffer(0)))!;
          if (tempData) {
            tempData.type = 'temp';
            tempData.value = 20 + Math.random() * 10;
            sessionDataRef.current.push(tempData);
            setPacketCount(prev => prev + 1);
          }
        }
        
        // Outros sensores a cada 2 segundos
        if (recordingTime % 2 === 0) {
          const types: SensorType[] = ['vol', 'curr', 'spd'];
          types.forEach(type => {
            const data = parseBluetoothData(new DataView(new ArrayBuffer(0)))!;
            if (data) {
              data.type = type;
              data.value = type === 'vol' ? 12 + Math.random() * 2 :
                          type === 'curr' ? 1 + Math.random() * 3 :
                          type === 'spd' ? Math.random() * 100 : 0;
              sessionDataRef.current.push(data);
              setPacketCount(prev => prev + 1);
            }
          });
        }
      }, 1000); // Verificação a cada segundo

      // Guardar intervalo para limpeza
      setRecordingInterval(simulationInterval as unknown as NodeJS.Timeout);
      
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
    
    try {
      const sessionData: SessionData = {
        sessionId: `session_${Date.now()}`,
        startTime: Date.now() - (recordingTime * 1000),
        endTime: Date.now(),
        dataPoints: packetCount,
        data: sessionDataRef.current
      };

      // Enviar para o backend
      await axios.post('http://localhost:3000/api/save-session', sessionData);
      
      // Buscar dados salvos para exibição
      await fetchSessionData(sessionData.sessionId);
      
      setViewMode('DASHBOARD_VIEW');
      
    } catch (error) {
      console.error('Erro ao enviar dados:', error);
      alert('Erro ao enviar dados para o servidor');
      setViewMode('CONNECTED_IDLE');
    }
  };

  // Buscar dados da sessão
  const fetchSessionData = async (sessionId: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await axios.get(`http://localhost:3000/api/sessions/${sessionId}`);
      setSessionHistory(response.data);
    } catch (error) {
      console.error('Erro ao buscar dados da sessão:', error);
      // Para demonstração, usar dados locais
      setSessionHistory({
        sessionId,
        startTime: Date.now() - (recordingTime * 1000),
        endTime: Date.now(),
        dataPoints: packetCount,
        data: sessionDataRef.current
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Formatar tempo (segundos para MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Preparar dados para gráficos
  const prepareChartData = () => {
    if (!sessionHistory?.data) return [];
    
    // Agrupar dados por timestamp mais próximo
    const timeGroups = new Map<number, any>();
    
    sessionHistory.data.forEach(item => {
      // Arredondar timestamp para o segundo mais próximo
      const roundedTime = Math.floor(item.timestamp / 1000) * 1000;
      
      if (!timeGroups.has(roundedTime)) {
        timeGroups.set(roundedTime, {
          timestamp: roundedTime,
          time: new Date(roundedTime).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }),
          temperature: null,
          voltage: null,
          current: null,
          speed: null
        });
      }
      
      const group = timeGroups.get(roundedTime);
      switch(item.type) {
        case 'temp': group.temperature = item.value; break;
        case 'vol': group.voltage = item.value; break;
        case 'curr': group.current = item.value; break;
        case 'spd': group.speed = item.value; break;
      }
    });
    
    return Array.from(timeGroups.values()).sort((a, b) => a.timestamp - b.timestamp);
  };

  // Limpar sessão atual
  const clearSession = () => {
    sessionDataRef.current = [];
    setPacketCount(0);
    setRecordingTime(0);
    setSensorCounts({ temp: 0, vol: 0, curr: 0, spd: 0 });
    stopRecordingTimer();
    setSessionHistory(null);
  };

  // Renderizar baseado no estado atual
  const renderView = () => {
    switch(viewMode) {
      case 'DISCONNECTED':
        return (
          <div className="text-center py-12">
            <WifiOff className="w-24 h-24 mx-auto text-gray-400 mb-6" />
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Desconectado</h2>
            <p className="text-gray-600 mb-8">Conecte-se a um dispositivo ESP32 para iniciar o monitoramento</p>
            <button
              onClick={connectToDevice}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center mx-auto gap-2"
            >
              <Bluetooth className="w-5 h-5" />
              Conectar Dispositivo
            </button>
          </div>
        );

      case 'CONNECTED_IDLE':
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <BluetoothConnected className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800">Conectado</h3>
                <p className="text-green-600 text-sm">Pronto para iniciar gravação</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <h4 className="font-medium">Status do Dispositivo</h4>
                </div>
                <p className="text-sm text-gray-600">ESP32 conectado via Bluetooth</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <h4 className="font-medium">Última Sessão</h4>
                </div>
                <p className="text-sm text-gray-600">Nenhuma sessão gravada</p>
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
                onClick={disconnectDevice}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Desconectar
              </button>
            </div>
          </div>
        );

      case 'RECORDING':
        const chartData = prepareChartData();
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
                  <p className="text-red-600 text-sm">Coletando dados dos sensores</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-700">{formatTime(recordingTime)}</div>
                <div className="text-sm text-red-600">Tempo decorrido</div>
              </div>
            </div>

            {/* Métricas de coleta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <h4 className="font-medium">Pacotes</h4>
                </div>
                <div className="text-2xl font-bold text-gray-800">{packetCount}</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Thermometer className="w-5 h-5 text-red-500" />
                  <h4 className="font-medium">Temperatura</h4>
                </div>
                <div className="text-2xl font-bold text-gray-800">{sensorCounts.temp}</div>
                <div className="text-sm text-gray-500">amostras</div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h4 className="font-medium">Energia</h4>
                </div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-lg font-bold text-gray-800">{sensorCounts.vol}</div>
                    <div className="text-xs text-gray-500">Volts</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-800">{sensorCounts.curr}</div>
                    <div className="text-xs text-gray-500">Amps</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  <h4 className="font-medium">Velocidade</h4>
                </div>
                <div className="text-2xl font-bold text-gray-800">{sensorCounts.spd}</div>
                <div className="text-sm text-gray-500">amostras</div>
              </div>
            </div>

            {/* Controles de gravação */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={stopAndUpload}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Square className="w-5 h-5" />
                Parar e Salvar
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
                Cancelar
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
                  <h2 className="text-xl font-bold text-gray-800">Sessão de Monitoramento</h2>
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
                      <span>{new Date().toLocaleDateString()}</span>
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
            {isLoadingHistory ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando dados da sessão...</p>
              </div>
            ) : dashboardData.length > 0 ? (
              <div className="space-y-8">
                {/* Gráfico 1: Tensão e Corrente */}
                <div className="bg-white rounded-lg border shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Tensão e Corrente
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
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
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico 2: Velocidade */}
                <div className="bg-white rounded-lg border shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500" />
                    Velocidade
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dashboardData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="time" />
                        <YAxis label={{ value: 'Velocidade', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="speed" stroke="#10b981" strokeWidth={3} name="Velocidade" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico 3: Temperatura */}
                <div className="bg-white rounded-lg border shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-red-500" />
                    Temperatura
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={dashboardData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="time" />
                        <YAxis label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="temperature" fill="#fca5a5" name="Temperatura (°C)" />
                        <Line type="monotone" dataKey="temperature" stroke="#dc2626" strokeWidth={2} name="Tendência" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
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
                Limpar Dados
              </button>
            </div>
          </div>
        );
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
                <h1 className="text-xl font-bold text-gray-900">VFFCO IoT Monitor</h1>
                <p className="text-sm text-gray-600">Sistema de Monitoramento Industrial</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Indicador de estado */}
              <div className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                style={{
                  backgroundColor: 
                    viewMode === 'DISCONNECTED' ? '#f3f4f6' :
                    viewMode === 'CONNECTED_IDLE' ? '#d1fae5' :
                    viewMode === 'RECORDING' ? '#fee2e2' :
                    viewMode === 'UPLOADING' ? '#fef3c7' :
                    '#dbeafe',
                  color:
                    viewMode === 'DISCONNECTED' ? '#6b7280' :
                    viewMode === 'CONNECTED_IDLE' ? '#065f46' :
                    viewMode === 'RECORDING' ? '#991b1b' :
                    viewMode === 'UPLOADING' ? '#92400e' :
                    '#1e40af'
                }}
              >
                <div className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: 
                      viewMode === 'DISCONNECTED' ? '#9ca3af' :
                      viewMode === 'CONNECTED_IDLE' ? '#10b981' :
                      viewMode === 'RECORDING' ? '#ef4444' :
                      viewMode === 'UPLOADING' ? '#f59e0b' :
                      '#3b82f6'
                  }}
                ></div>
                <span>
                  {viewMode === 'DISCONNECTED' ? 'Desconectado' :
                   viewMode === 'CONNECTED_IDLE' ? 'Conectado' :
                   viewMode === 'RECORDING' ? 'Gravando' :
                   viewMode === 'UPLOADING' ? 'Enviando' :
                   'Dashboard'}
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
          <p>Sistema IoT VFFCO - Coleta e análise de dados de sensores em tempo real</p>
          <p className="mt-1">Modo Store & Forward - Dados são coletados, armazenados e analisados posteriormente</p>
        </div>
      </main>
    </div>
  );
}

export default App;