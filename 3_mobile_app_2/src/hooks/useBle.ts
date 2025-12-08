import * as ExpoBLE from 'expo-ble';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { atob } from 'react-native-quick-base64';
// REMOVIDO: import { Subscription } from 'expo-modules-core'; (Causava erro de importação)

// Tipos mínimos simplificados
interface BleDevice {
    identifier: string;
    name: string | null;
    localName: string | null;
    rssi: number;
}
interface VehicleData { velocidade: number; bateria: number; temp: number; }

const SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb'; 
let connectedDevice: BleDevice | null = null;
let scanSubscription: any = null; // Usando 'any' para subscrições
let connectionStateSubscription: any = null;
let notificationSubscription: any = null; 

export function useBLE() {
  const [dadosVeiculo, setDadosVeiculo] = useState<VehicleData>({ velocidade: 0, bateria: 0, temp: 0 });
  const [status, setStatus] = useState('Desconectado');

  // --- 1. SOLICITAR PERMISSÕES (Nome: requestPermissions) ---
  const solicitarPermissoes = async () => {
    if (Platform.OS === 'android') {
        try {
            // CORRIGIDO: requestPermissions (sem Async)
            const granted = await (ExpoBLE as any).requestPermissions(); 
            if (!granted || !granted.granted) {
                Alert.alert("Permissão", "É necessária a permissão de Bluetooth e Localização para conectar.");
            }
        } catch (e) {
            console.log("Erro ao pedir permissões com ExpoBLE:", e);
        }
    }
  };


  // --- 2. DESCONECTAR (Nome: disconnect) ---
  const desconectarDispositivo = async () => {
    if (connectedDevice) {
      try {
        // CORRIGIDO: disconnect (sem Async)
        await (ExpoBLE as any).disconnect(connectedDevice.identifier);
        connectedDevice = null;
        setStatus('Desconectado');
      } catch (error) {
        console.log("Erro ao desconectar:", error);
      }
    }
  };


  // --- 3. CONECTAR (Nomes: addListener e startScan) ---
  const conectarDispositivo = async () => {
    if (status === 'Conectado') return;
    setStatus('Escaneando...');
    
    // CORRIGIDO: addListener para o evento 'onPeripheralFound'
    scanSubscription = (ExpoBLE as any).addListener(
      'onPeripheralFound',
      async (peripheral: BleDevice) => {
        
        if (peripheral.name === 'IFECO_TELEMETRIA' || peripheral.localName === 'IFECO_TELEMETRIA') {
          
          (ExpoBLE as any).stopScan(); // Nome correto: stopScan()
          if (scanSubscription) scanSubscription.remove();
          setStatus('Conectando...');
          
          try {
            // CORRIGIDO: connect (sem Async)
            await (ExpoBLE as any).connect(peripheral.identifier);
            connectedDevice = peripheral;
            setStatus('Conectado');
            setupMonitoramento(peripheral);

          } catch (e) {
            console.log("Erro Conexão:", e);
            setStatus('Erro Conexão');
          }
        }
      }
    );
    
    // CORRIGIDO: startScan (sem Async e sem ScanMode)
    await (ExpoBLE as any).startScan([], {});

    // Timeout de segurança
    setTimeout(() => {
        if (status === 'Escaneando...') {
            (ExpoBLE as any).stopScan();
            if (scanSubscription) scanSubscription.remove();
            setStatus('Não encontrado');
        }
    }, 10000);
  };


  // --- 4. LER DADOS DO ARDUINO (Nomes: getServicesAndCharacteristics e startCharacteristicNotifications) ---
  const setupMonitoramento = async (device: BleDevice) => {
    try {
        // CORRIGIDO: getServicesAndCharacteristics (sem 'ForPeripheralAsync')
        const services = await (ExpoBLE as any).getServicesAndCharacteristics(device.identifier);
        
        for (const service of services.services) {
            for (const char of service.characteristics) {
                if (char.properties.includes('Notify')) {
                    console.log(`Monitorando UUID: ${char.uuid} no Serviço: ${service.uuid}`);
                    
                    // CORRIGIDO: startCharacteristicNotifications (sem 'Async')
                    notificationSubscription = (ExpoBLE as any).startCharacteristicNotifications( 
                        device.identifier,
                        service.uuid,
                        char.uuid
                    );
                    
                    // Adiciona o listener à subscription para receber dados
                    notificationSubscription.addListener(
                        'onCharacteristicNotified',
                        (notifiedChar: { value: string | null }) => { 
                            if (notifiedChar.value) {
                                try {
                                    const rawData = atob(notifiedChar.value); 
                                    
                                    console.log("Recebido:", rawData);

                                    // LÓGICA DE PARSE (Mantida)
                                    if (rawData.includes(',')) {
                                        const parts = rawData.split(',');
                                        setDadosVeiculo({
                                            velocidade: Number(parts[0]),
                                            bateria: Number(parts[1]),
                                            temp: Number(parts[2])
                                        });
                                    } else if (rawData.startsWith('{')) {
                                        const json = JSON.parse(rawData);
                                        setDadosVeiculo({
                                            velocidade: Number(json.v || json.velocidade || 0),
                                            bateria: Number(json.b || json.bateria || 0),
                                            temp: Number(json.t || json.temp || 0)
                                        });
                                    }

                                } catch (parseError) {
                                    console.log("Erro ao processar dados:", parseError);
                                }
                            }
                        }
                    );

                    // CORRIGIDO: Listener para desconexão: 'onDeviceDisconnected'
                    connectionStateSubscription = (ExpoBLE as any).addListener(
                      'onDeviceDisconnected',
                      (disconnectedDevice: BleDevice) => { 
                        if (disconnectedDevice.identifier === device.identifier) {
                          if(notificationSubscription) notificationSubscription.remove();
                          if(connectionStateSubscription) connectionStateSubscription.remove();
                          connectedDevice = null;
                          setStatus('Desconectado');
                        }
                      }
                    )
                    return; 
                }
            }
        }
    } catch (e) {
        console.log("Erro setup monitoramento:", e);
        setStatus('Erro monitoramento');
    }
  };


  // Efeito inicial para pedir permissões e verificar BT
  useEffect(() => {
    solicitarPermissoes();
    
    // CORRIGIDO: isBluetoothEnabledAsync é a função correta
    (ExpoBLE as any).isBluetoothEnabledAsync().then((isEnabled: boolean) => {
        if (!isEnabled) {
            Alert.alert("Bluetooth", "Por favor, ligue o Bluetooth do seu celular.");
        }
    });

    return () => {
      if(connectedDevice) desconectarDispositivo();
      if(scanSubscription) scanSubscription.remove();
      if(connectionStateSubscription) connectionStateSubscription.remove();
      if(notificationSubscription) notificationSubscription.remove();
    }
  }, []); 

  return { 
    conectarDispositivo,
    desconectarDispositivo, 
    status, 
    dadosVeiculo
  };
}