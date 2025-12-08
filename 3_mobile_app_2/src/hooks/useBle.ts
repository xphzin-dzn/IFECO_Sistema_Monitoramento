import { useState, useEffect, useMemo } from 'react';
import { BleManager, Device, BleError, Characteristic } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { atob } from 'react-native-quick-base64'; 

// Instância única do gerenciador fora do hook para não recriar a cada render
const bleManager = new BleManager();

export function useBLE() {
  const [device, setDevice] = useState<Device | null>(null);
  const [dadosVeiculo, setDadosVeiculo] = useState({ velocidade: 0, bateria: 0, temp: 0 });
  const [status, setStatus] = useState('Desconectado');

  // --- 1. PERMISSÕES ANDROID ---
  const solicitarPermissoes = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        console.log('Permissões:', granted);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // --- 2. DESCONECTAR (Faltava essa função) ---
  const desconectarDispositivo = async () => {
    if (device) {
      try {
        await bleManager.cancelDeviceConnection(device.id);
        setDevice(null);
        setStatus('Desconectado');
      } catch (error) {
        console.log("Erro ao desconectar:", error);
      }
    }
  };

  // --- 3. CONECTAR ---
  const conectarDispositivo = () => {
    // Se já estiver conectado, não faz nada
    if (status === 'Conectado') return;

    setStatus('Escaneando...');
    
    bleManager.startDeviceScan(null, null, (error, scannedDevice) => {
      if (error) {
        console.log("Erro Scan:", error);
        setStatus('Erro no Scan');
        return;
      }

      // IMPORTANTE: Nome exato do dispositivo no Arduino
      if (scannedDevice?.name === 'IFECO_TELEMETRIA' || scannedDevice?.localName === 'IFECO_TELEMETRIA') {
        bleManager.stopDeviceScan();
        setStatus('Conectando...');
        
        scannedDevice.connect()
          .then((d) => d.discoverAllServicesAndCharacteristics())
          .then((d) => {
            setDevice(d);
            setStatus('Conectado');
            setupMonitoramento(d);
          })
          .catch((e) => {
            console.log(e);
            setStatus('Erro Conexão');
          });
      }
    });

    // Timeout de segurança: para de escanear após 10 segundos se não achar nada
    setTimeout(() => {
        bleManager.stopDeviceScan();
        if (status === 'Escaneando...') setStatus('Não encontrado');
    }, 10000);
  };

  // --- 4. LER DADOS DO ARDUINO ---
  const setupMonitoramento = async (connectedDevice: Device) => {
    try {
        // Como não sabemos o UUID exato, vamos iterar (Método "Força Bruta" Inteligente)
        // Isso descobre qual característica está enviando dados (Notifiable)
        const services = await connectedDevice.services();
        
        for (const service of services) {
            const characteristics = await service.characteristics();
            for (const char of characteristics) {
                // Se a característica permite Notificação (envio contínuo de dados)
                if (char.isNotifiable) {
                    console.log(`Monitorando UUID: ${char.uuid}`);
                    
                    char.monitor((error, characteristic) => {
                        if (error) {
                            console.log("Erro de leitura:", error);
                            return;
                        }
                        
                        // DECODIFICAÇÃO DE DADOS
                        if (characteristic?.value) {
                            try {
                                // 1. Decodifica Base64 para String
                                const rawData = atob(characteristic.value); 
                                // Exemplo esperado: "35.5,24.1,50" (CSV) ou '{"vel":35...}' (JSON)

                                console.log("Recebido:", rawData);

                                // LÓGICA DE PARSE (Adapte conforme o envio do Arduino)
                                // Cenário A: Arduino envia JSON -> {"v": 20, "b": 24, "t": 45}
                                if (rawData.startsWith('{')) {
                                    const json = JSON.parse(rawData);
                                    setDadosVeiculo({
                                        velocidade: Number(json.v || json.velocidade || 0),
                                        bateria: Number(json.b || json.bateria || 0),
                                        temp: Number(json.t || json.temp || 0)
                                    });
                                } 
                                // Cenário B: Arduino envia CSV -> "20,24,45"
                                else if (rawData.includes(',')) {
                                    const parts = rawData.split(',');
                                    setDadosVeiculo({
                                        velocidade: Number(parts[0]),
                                        bateria: Number(parts[1]),
                                        temp: Number(parts[2])
                                    });
                                }
                            } catch (parseError) {
                                console.log("Erro ao processar dados:", parseError);
                            }
                        }
                    });
                    return; // Achou e conectou, para o loop
                }
            }
        }
    } catch (e) {
        console.log("Erro setup monitoramento:", e);
    }
  };

  // --- SIMULAÇÃO (Remova ou comente para o dia da apresentação) ---
  useEffect(() => {
    solicitarPermissoes();

    // MODO DEMONSTRAÇÃO: Se não conectar em 5 segundos, gera dados fake
    // Útil para testar o app sem o carro ligado
    /*
    const interval = setInterval(() => {
       if (status !== 'Conectado') {
           setDadosVeiculo({
               velocidade: Math.floor(Math.random() * 45),
               bateria: 24 + (Math.random() * 2),
               temp: 40 + (Math.random() * 10)
           });
       }
    }, 2000);
    return () => clearInterval(interval);
    */
  }, [status]);

  return { 
    conectarDispositivo,
    desconectarDispositivo, 
    status, 
    dadosVeiculo
  };
}