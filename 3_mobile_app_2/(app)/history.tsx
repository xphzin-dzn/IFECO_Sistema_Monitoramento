import { Stack } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';

export default function History() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Histórico de Dados' }} />
      <Text style={styles.text}>Tela de Histórico - Em Desenvolvimento</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' },
  text: { color: '#FFF', fontSize: 18 },
});