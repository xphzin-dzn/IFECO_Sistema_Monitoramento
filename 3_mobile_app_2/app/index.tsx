import AsyncStorage from '@react-native-async-storage/async-storage'; // O Cofre
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import api from '../src/services/api';

export default function LoginScreen() {
  const router = useRouter();

  // DICA: Deixei preenchido para facilitar seus testes, apague antes da banca!
  const [email, setEmail] = useState('admin@ifeco.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos para continuar.');
      return;
    }

    setLoading(true);

    try {
      // 1. Bate na rota definida no seu backend
      console.log(`Tentando logar em ${api.defaults.baseURL}/login...`);
      const response = await api.post('/login', { email, senha: password });

      // 2. Se deu certo, o backend devolve o token (conforme seu controller)
      const { token } = response.data;

      if (token) {
        // 3. Guardamos o token no "Cofre" do celular
        await AsyncStorage.setItem('@ifeco_token', token);

        // 4. Configura o axios para sempre usar esse token daqui pra frente
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        Alert.alert('Sucesso', 'Bem-vindo à IFECO!');
        router.replace('/dashboard');
      } else {
        Alert.alert('Erro', 'O servidor não retornou o token.');
      }

    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Verifique se o backend está rodando e o IP está correto.';
      Alert.alert('Falha no Login', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IFECO<Text style={styles.subtitle}>Telemetry</Text></Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>ENTRAR</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginBottom: 40 },
  subtitle: { color: '#4CAF50' },
  inputContainer: { width: '100%', marginBottom: 20 },
  input: { backgroundColor: '#1E1E1E', color: '#FFF', borderRadius: 8, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#333' },
  button: { backgroundColor: '#4CAF50', width: '100%', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: 'bold' }
});