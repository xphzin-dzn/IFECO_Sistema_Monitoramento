import * as ExpoBLE from 'expo-ble';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
// O 'atob' é necessário para decodificar o Base64 que o BLE envia
import { atob } from 'react-native-quick-base64';

// REMOVEMOS O IMPORT NATIVO: 'react-native-ble-manager'

// --- UUIDs e Constantes ---

const TARGET_DEVICE_NAME = 'IFECO_TELEMETRIA';
// Service UUID (Definido no main.cpp do ESP32)
const SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
// Characteristic UUID (Onde os dados de telemetria são notificados)
const CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

// Tipos e Variáveis de Controle
interface BleDevice {
  identifier: string;
  name: string | null;
  localName: string | null;
  rssi: number;
}
interface DadosVeiculo { velocidade: number; bateria: number; temp: number; }
type BleStatus = 'Desconectado' | 'Escaneando' | 'Conectando' | 'Conectado' | 'Erro' | 'Pronto';

let connectedDevice: BleDevice | null = null;
let scanSubscription: any = null;
let connectionStateSubscription: any = null;
let notificationSubscription: any = null;

export default function useBle() {
  const [status, setStatus] = useState<BleStatus>('Pronto');
  const [dadosVeiculo, setDadosVeiculo] = useState<DadosVeiculo>({ velocidade: 0, bateria: 0, temp: 0 });

  // --- 1. Permissões de Localização ---
  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        // CORRIGIDO: requestPermissions (sem Async)
        const granted = await (ExpoBLE as any).requestPermissions();
        if (!granted || !granted.granted) {
          Alert.alert("Permissão", "A permissão de localização é necessária para escanear.");
          return false;
        }
      } catch (e) {
        console.warn("Erro ao pedir permissões:", e);
        return false;
      }
    }
    return true;
  }, []);

  // --- 2. Funções de Monitoramento de Dados ---
  const setupMonitoramento = useCallback(async (device: BleDevice) => {
    setStatus('Conectado');
    connectedDevice = device;

    try {
      // CORRIGIDO: getServicesAndCharacteristics (sem 'ForDevice')
      await (ExpoBLE as any).getServicesAndCharacteristics(device.identifier);

      // CORRIGIDO: startCharacteristicNotifications (sem 'Async')
      notificationSubscription = (ExpoBLE as any).startCharacteristicNotifications(
        device.identifier,
        SERVICE_UUID,
        CHARACTERISTIC_UUID
      );

      // Adiciona o listener à subscription para receber dados
      notificationSubscription.addListener(
        'onCharacteristicNotified',
        (notifiedChar: { value: string | null }) => {
          if (notifiedChar.value) {
            try {
              // Decodifica o Base64 para a string CSV
              const rawData = atob(notifiedChar.value);

              if (rawData.includes(',')) {
                // Parsing CSV (velocidade, bateria, temp)
                const parts = rawData.split(',');
                if (parts.length === 3) {
                  setDadosVeiculo({
                    velocidade: Number(parts[0]),
                    bateria: Number(parts[1]),
                    temp: Number(parts[2])
                  });
                }
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
            if (notificationSubscription) notificationSubscription.remove();
            if (connectionStateSubscription) connectionStateSubscription.remove();
            connectedDevice = null;
            setStatus('Desconectado');
          }
        }
      )

    } catch (e) {
      console.log("Erro ao configurar monitoramento:", e);
      setStatus('Erro');
    }
  }, []);

  // --- 3. Funções de Scan e Conexão ---

  const stopScan = useCallback(() => {
    (ExpoBLE as any).stopScan();
    setStatus('Pronto');
  }, []);

  const scanAndConnect = useCallback(async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setStatus('Escaneando');

    // Listener para dispositivos encontrados (mesma lógica de antes)
    scanSubscription = (ExpoBLE as any).addListener(
      'onPeripheralFound',
      async (peripheral: BleDevice) => {
        if (peripheral.name?.trim() === TARGET_DEVICE_NAME) {
          stopScan();
          setStatus('Conectando');
          try {
            // CORRIGIDO: connect (sem Async)
            await (ExpoBLE as any).connect(peripheral.identifier);
            setupMonitoramento(peripheral);
          } catch (e) {
            console.log("Erro na conexão:", e);
            setStatus('Erro');
          }
        }
      }
    );

    // CORRIGIDO: startScan (sem Async)
    await (ExpoBLE as any).startScan([], {});

    // Timeout de segurança
    setTimeout(() => {
      if (status === 'Escaneando') {
        stopScan();
        Alert.alert('Falha', 'Dispositivo não encontrado em 10 segundos.');
      }
    }, 10000);

  }, [requestPermissions, stopScan, setupMonitoramento, status]);

  const desconectarDispositivo = useCallback(async () => {
    if (connectedDevice) {
      try {
        if (notificationSubscription) notificationSubscription.remove();
        if (connectionStateSubscription) connectionStateSubscription.remove();

        await (ExpoBLE as any).disconnect(connectedDevice.identifier);

      } catch (e) {
        console.log('Erro ao desconectar:', e);
      } finally {
        connectedDevice = null;
        setStatus('Desconectado');
        setDadosVeiculo({ velocidade: 0, bateria: 0, temp: 0 });
      }
    }
  }, []);


  // --- 4. Efeitos Iniciais ---
  useEffect(() => {
    // Verificar se o Bluetooth está ligado
    (ExpoBLE as any).isBluetoothEnabledAsync().then((isEnabled: boolean) => {
      if (!isEnabled) {
        Alert.alert('Bluetooth Desligado', 'Por favor, ligue o Bluetooth.');
        setStatus('Erro');
      } else {
        setStatus('Pronto');
      }
    });

    return () => {
      // Limpeza de todas as subscrições
      if (scanSubscription) scanSubscription.remove();
      if (notificationSubscription) notificationSubscription.remove();
      if (connectionStateSubscription) connectionStateSubscription.remove();
    };
  }, []);

  return {
    dadosVeiculo,
    status,
    conectarDispositivo: scanAndConnect,
    desconectarDispositivo,
  };
}