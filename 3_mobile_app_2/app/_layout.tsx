import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack 
        screenOptions={{
          headerStyle: { backgroundColor: '#121212' },
          headerTintColor: '#FFF',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#121212' }
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ headerShown: false }} 
        />
        
         <Stack.Screen 
          name="dashboard" 
          options={{ title: 'Painel Principal', headerBackVisible: false }} 
        />

        <Stack.Screen 
          name="connection" 
          options={{ title: 'Conectar Bluetooth' }} 
        />
        
        <Stack.Screen 
          name="history" 
          options={{ title: 'Histórico de Corridas' }} 
        />
      </Stack>
    </>
  );
}