import { useCallback, useEffect, useState } from 'react';

// --- INÍCIO DA CORREÇÃO DE TYPESCRIPT (NECESSÁRIO PARA WEBBLE) ---
// Estas declarações de interface definem os tipos que a Web Bluetooth API usa,
// resolvendo os erros 'Cannot find name' no TypeScript.
declare global {
    interface BluetoothDevice extends EventTarget {
        readonly gatt: BluetoothRemoteGATTServer | null;
        readonly name: string | undefined;
        readonly id: string;
        addEventListener(type: 'gattserverdisconnected', listener: (this: BluetoothDevice, ev: Event) => any, useCapture?: boolean): void;
    }

    interface BluetoothRemoteGATTServer {
        readonly connected: boolean;
        connect(): Promise<BluetoothRemoteGATTServer>;
        disconnect(): void;
        getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
    }

    interface BluetoothRemoteGATTService {
        getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
    }

    interface BluetoothRemoteGATTCharacteristic extends EventTarget {
        readonly value: DataView | undefined;
        startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
        addEventListener(type: 'characteristicvaluechanged', listener: (this: BluetoothRemoteGATTCharacteristic, ev: Event) => any, useCapture?: boolean): void;
    }

    interface Bluetooth {
        requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
    }

    interface Navigator {
        readonly bluetooth: Bluetooth;
    }

    interface RequestDeviceOptions {
        filters?: { name?: string; services?: string[] }[];
        optionalServices?: string[];
        acceptAllDevices?: boolean;
    }
}
// --- FIM DA CORREÇÃO DE TYPESCRIPT ---


// --- Constantes BLE (Baseadas no seu projeto) ---
// Nome do dispositivo BLE: IFECO_TELEMETRIA
const TARGET_DEVICE_NAME = 'IFECO_TELEMETRIA';
// Service UUID: 0000ffe0...
const SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
// Characteristic UUID (Notify): 0000ffe1...
const CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

// Estrutura de dados conforme TB_LEITURAS
interface DadosVeiculo {
    velocidade: number; // km/h
    tensao: number; // Volts (V)
    corrente: number; // Amperes (A)
    temperatura: number; // Graus Celsius
}

type BleStatus = 'Pronto' | 'Escaneando' | 'Conectando' | 'Conectado' | 'Desconectado' | 'Erro' | 'Navegador Incompatível';

// Variáveis para manter o estado da conexão BLE fora do ciclo de renderização
// Agora tipadas corretamente com as interfaces definidas acima
let bleDevice: BluetoothDevice | null = null;
let bleGattServer: BluetoothRemoteGATTServer | null = null;

export default function useWebBle() {
    const [status, setStatus] = useState<BleStatus>('Pronto');
    const [dadosVeiculo, setDadosVeiculo] = useState<DadosVeiculo>({
        velocidade: 0,
        tensao: 0,
        corrente: 0,
        temperatura: 0
    });

    // Lógica de decodificação e parsing dos dados (ArrayBuffer -> CSV -> Object)
    const handleCharacteristicValueChanged = useCallback((event: Event) => {
        // O 'as BluetoothRemoteGATTCharacteristic' agora funciona
        const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
        const value = characteristic.value;

        if (!value) return;

        try {
            // O valor da notificação é um ArrayBuffer. Usamos TextDecoder para obter a string.
            const rawData = new TextDecoder().decode(value);

            // O ESP32 envia dados como "velocidade,tensao,corrente,temperatura"
            if (rawData.includes(',')) {
                const parts = rawData.split(',');
                if (parts.length === 4) { // Espera 4 valores: vel, tensao, corrente, temp
                    setDadosVeiculo({
                        velocidade: Number(parts[0]),
                        tensao: Number(parts[1]),
                        corrente: Number(parts[2]),
                        temperatura: Number(parts[3])
                    });
                }
            }
        } catch (parseError) {
            console.error("Erro ao processar dados BLE:", parseError);
        }
    }, []);

    const onDeviceDisconnected = useCallback(() => {
        console.log('Dispositivo Bluetooth desconectado.');
        if (bleDevice) {
            // Remove o listener para evitar múltiplas chamadas
            bleDevice.removeEventListener('gattserverdisconnected', onDeviceDisconnected);
        }
        bleDevice = null;
        bleGattServer = null;
        setStatus('Desconectado');
        setDadosVeiculo({ velocidade: 0, tensao: 0, corrente: 0, temperatura: 0 }); // Limpa os dados
    }, []);

    const conectarDispositivo = useCallback(async () => {
        // O 'navigator.bluetooth' agora é reconhecido
        if (typeof navigator.bluetooth === 'undefined') {
            setStatus('Navegador Incompatível');
            alert('Seu navegador não suporta a Web Bluetooth API. Use Chrome, Edge ou Opera, e verifique se está em localhost ou HTTPS.');
            return;
        }

        setStatus('Escaneando');

        try {
            // 1. Solicita o dispositivo (Gesto do usuário obrigatório no botão "Conectar")
            // O 'navigator.bluetooth.requestDevice' agora é reconhecido
            bleDevice = await navigator.bluetooth.requestDevice({
                filters: [{ name: TARGET_DEVICE_NAME }],
                optionalServices: [SERVICE_UUID], // Necessário para acessar o serviço
            });

            setStatus('Conectando');

            // Adiciona o listener para desconexão ANTES de conectar
            bleDevice.addEventListener('gattserverdisconnected', onDeviceDisconnected);

            // 2. Conecta ao Servidor GATT
            bleGattServer = await bleDevice.gatt!.connect();

            if (!bleGattServer.connected) {
                throw new Error('Falha ao conectar ao servidor GATT.');
            }

            // 3. Obtém o Serviço e a Característica
            const service = await bleGattServer.getPrimaryService(SERVICE_UUID);
            const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

            // 4. Habilita Notificações (Notify) e adiciona o listener de dados
            await characteristic.startNotifications();
            characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

            setStatus('Conectado');
            console.log('Conexão BLE estabelecida e monitoramento iniciado.');

        } catch (error) {
            console.error('Falha na conexão BLE:', error);
            setStatus('Erro');
            if (bleDevice) {
                bleDevice.removeEventListener('gattserverdisconnected', onDeviceDisconnected);
            }
            bleDevice = null;
            bleGattServer = null;
        }
    }, [handleCharacteristicValueChanged, onDeviceDisconnected]);

    const desconectarDispositivo = useCallback(async () => {
        if (bleGattServer && bleGattServer.connected) {
            try {
                await bleGattServer.disconnect();
                // O onDeviceDisconnected cuidará da limpeza final
            } catch (e) {
                console.error('Erro ao tentar desconectar:', e);
                setStatus('Erro');
            }
        } else {
            // Se não estava conectado, apenas limpa o estado
            onDeviceDisconnected();
        }
    }, [onDeviceDisconnected]);

    // Checagem inicial de compatibilidade
    useEffect(() => {
        if (typeof navigator.bluetooth === 'undefined') {
            setStatus('Navegador Incompatível');
        }
    }, []);

    return {
        dadosVeiculo,
        status,
        conectarDispositivo,
        desconectarDispositivo,
    };
}