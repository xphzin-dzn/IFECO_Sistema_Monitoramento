import axios from 'axios';

// ATENÇÃO: Troque pelo SEU IPV4 do computador. Não use localhost.
const API_URL = 'http://192.168.2.109:3000/api'; 

const api = axios.create({
  baseURL: API_URL,
  timeout: 5000, // 5 segundos para timeout
});

export const enviarTelemetria = async (dados: { velocidade: number; bateria: number; temp: number }) => {
  try {
    // Ajuste a rota '/telemetria' conforme o seu arquivo routes do Backend
    const response = await api.post('/telemetria', dados);
    return response.data;
  } catch (error) {
    console.error("Erro ao enviar para o backend:", error);
    // Não travamos o app se a internet cair, apenas logamos
    return null;
  }
};

export default api;