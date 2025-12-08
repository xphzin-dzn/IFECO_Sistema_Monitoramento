import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons'; // Ícones para deixar bonito
import api from '../src/services/api';
import { useBLE } from '../src/hooks/useBle';

export default function Dashboard() {
  const router = useRouter();
  
  // Puxando tudo do nosso Hook de Bluetooth
  // Nota: Certifique-se que o useBLE retorna essas funções/estados
  const { 
    conectarDispositivo, 
    desconectarDispositivo, 
    status, 
    dadosVeiculo 
  } = useBLE();

  // Estado para controlar o envio de dados
  const [isSending, setIsSending] = useState(false);

  // --- 1. FUNÇÃO DE LOGOUT ---
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('@ifeco_token');
      // Opcional: Desconectar bluetooth ao sair
      if (status === 'Conectado') {
        desconectarDispositivo();
      }
      router.replace('/'); // Volta para login
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível sair.');
    }
  };

  // --- 2. LOOP DE ENVIO PARA O BACKEND (O Link com o MySQL) ---
  const enviarTelemetria = async () => {
    try {
      const token = await AsyncStorage.getItem('@ifeco_token');
      
      if (!token) {
        console.log("Token expirado ou inexistente");
        return;
      }

      // Payload exato que seu Controller espera
      const payload = {
        velocidade: dadosVeiculo.velocidade,
        bateria: dadosVeiculo.bateria,
        temperatura: dadosVeiculo.temp, // Confirme se seu backend espera 'temperatura' ou 'temp'
        timestamp: new Date().toISOString()
      };

      setIsSending(true);
      
      await api.post('/dados', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log(`[OK] Dados salvos: ${payload.velocidade}km/h`);

    } catch (error) {
      console.error("[ERRO API]", error);
      // Não damos Alert aqui para não ficar pipocando erro na tela do piloto
    } finally {
      setIsSending(false);
    }
  };

  // Efeito que roda o envio a cada 5 segundos SE estiver conectado
  useEffect(() => {
    let intervalo: NodeJS.Timeout;

    if (status === 'Conectado') {
      interval = setInterval(() => {
        enviarTelemetria();
      }, 5000); // 5000ms = 5 segundos
    }

    return () => clearInterval(intervalo);
  }, [status, dadosVeiculo]);


  // --- 3. RENDERIZAÇÃO DA TELA ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>IFECO Monitor</Text>
          <Text style={styles.headerSubtitle}>Protótipo Eficiência 2025</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#FF5252" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* STATUS BARRA */}
        <View style={[styles.statusContainer, status === 'Conectado' ? styles.statusOk : styles.statusOffline]}>
          <Ionicons name={status === 'Conectado' ? "bluetooth" : "bluetooth-outline"} size={20} color="#FFF" />
          <Text style={styles.statusText}>
            STATUS: {status.toUpperCase()}
          </Text>
          {isSending && <ActivityIndicatorSmall />}
        </View>

        {/* VELOCÍMETRO (DESTAQUE) */}
        <View style={styles.mainGauge}>
          <Text style={styles.speedLabel}>VELOCIDADE</Text>
          <View style={styles.speedRow}>
            <Text style={styles.speedValue}>{dadosVeiculo.velocidade.toFixed(0)}</Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
        </View>

        {/* GRID DE SENSORES */}
        <View style={styles.grid}>
          {/* Card Bateria */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="battery-charging" size={24} color="#FFD700" />
              <Text style={styles.cardTitle}>TENSÃO</Text>
            </View>
            <Text style={styles.cardValue}>{dadosVeiculo.bateria.toFixed(1)} <Text style={styles.cardUnit}>V</Text></Text>
          </View>

          {/* Card Temperatura */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="thermometer" size={24} color="#FF5252" />
              <Text style={styles.cardTitle}>MOTOR</Text>
            </View>
            <Text style={styles.cardValue}>{dadosVeiculo.temp.toFixed(1)} <Text style={styles.cardUnit}>°C</Text></Text>
          </View>
        </View>

        {/* BOTÃO DE AÇÃO */}
        <View style={styles.footer}>
          {status !== 'Conectado' ? (
            <TouchableOpacity style={styles.actionButton} onPress={conectarDispositivo}>
              <Text style={styles.actionButtonText}>BUSCAR & CONECTAR</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionButton, styles.disconnectButton]} onPress={desconectarDispositivo}>
              <Text style={styles.actionButtonText}>DESCONECTAR</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// Pequeno componente visual auxiliar
const ActivityIndicatorSmall = () => (
  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF', marginLeft: 10 }} />
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 20,
    backgroundColor: '#1E1E1E'
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: '#888', fontSize: 12 },
  logoutButton: { padding: 5 },
  
  scrollContent: { padding: 20 },
  
  statusContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 10, 
    borderRadius: 8, 
    marginBottom: 30 
  },
  statusOk: { backgroundColor: '#2E7D32' }, // Verde escuro
  statusOffline: { backgroundColor: '#C62828' }, // Vermelho escuro
  statusText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },

  mainGauge: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 200, 
    backgroundColor: '#1E1E1E', 
    borderRadius: 20, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  speedLabel: { color: '#AAA', fontSize: 14, letterSpacing: 2, marginBottom: 10 },
  speedRow: { flexDirection: 'row', alignItems: 'baseline' },
  speedValue: { color: '#FFF', fontSize: 100, fontWeight: 'bold', includeFontPadding: false },
  speedUnit: { color: '#4CAF50', fontSize: 20, fontWeight: 'bold', marginLeft: 5 },

  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  card: { 
    width: '48%', 
    backgroundColor: '#1E1E1E', 
    padding: 20, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#333' 
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: '#AAA', fontSize: 12, fontWeight: 'bold', marginLeft: 8 },
  cardValue: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  cardUnit: { fontSize: 16, color: '#666' },

  footer: { marginTop: 10 },
  actionButton: { 
    backgroundColor: '#2196F3', 
    paddingVertical: 18, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  disconnectButton: { backgroundColor: '#444' },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});