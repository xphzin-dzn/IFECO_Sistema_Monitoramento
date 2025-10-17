import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer 
} from 'recharts'
import api from '../services/api'
import './Dashboard.css'

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [sensorData, setSensorData] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    fetchData()
    
    // Atualizar dados a cada 10 segundos
    const interval = setInterval(fetchData, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const response = await api.get('/dados/recentes?limit=50')
      if (response.data.success) {
        setSensorData(response.data.data)
        setLastUpdate(new Date())
      }
      setLoading(false)
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      setLoading(false)
    }
  }

  const formatDataForChart = (data, field) => {
    return data.map(item => ({
      time: new Date(item.data_hora).toLocaleTimeString(),
      value: item[field],
      fullTime: new Date(item.data_hora).toLocaleString()
    }))
  }

  const getLatestValue = (field) => {
    if (sensorData.length === 0) return { value: 'N/A', unit: '' }
    const latest = sensorData[sensorData.length - 1]
    return { 
      value: latest[field], 
      unit: getUnit(field) 
    }
  }

  const getUnit = (field) => {
    switch(field) {
      case 'tensao': return 'V'
      case 'corrente': return 'A'
      case 'velocidade': return 'km/h'
      case 'temperatura': return '°C'
      default: return ''
    }
  }

  const calculateStats = (field) => {
    if (sensorData.length === 0) return { avg: 0, min: 0, max: 0 }
    
    const values = sensorData.map(item => item[field]).filter(val => val != null)
    const avg = values.reduce((a, b) => a + b, 0) / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)
    
    return { avg: avg.toFixed(2), min: min.toFixed(2), max: max.toFixed(2) }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Carregando dados do sistema...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-title">
            <h1>IFECO Monitoring Dashboard</h1>
            <p className="last-update">
              {lastUpdate && `Última atualização: ${lastUpdate.toLocaleTimeString()}`}
            </p>
          </div>
          <div className="header-actions">
            <div className="user-info">
              <span>👤 {user?.email}</span>
            </div>
            <button onClick={logout} className="logout-btn">
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Cards de Leituras Atuais */}
        <section className="current-readings-section">
          <h2>Leituras Atuais</h2>
          <div className="readings-grid">
            {['tensao', 'corrente', 'velocidade', 'temperatura'].map((field) => {
              const latest = getLatestValue(field)
              const stats = calculateStats(field)
              return (
                <div key={field} className="reading-card">
                  <div className="reading-header">
                    <h3>{getFieldName(field)}</h3>
                    <span className="reading-unit">{latest.unit}</span>
                  </div>
                  <div className="reading-value">{latest.value}</div>
                  <div className="reading-stats">
                    <div className="stat">
                      <span>Média:</span>
                      <span>{stats.avg}</span>
                    </div>
                    <div className="stat">
                      <span>Mín:</span>
                      <span>{stats.min}</span>
                    </div>
                    <div className="stat">
                      <span>Máx:</span>
                      <span>{stats.max}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Gráficos em Tempo Real */}
        <section className="charts-section">
          <h2>Monitoramento em Tempo Real</h2>
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Tensão (V)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formatDataForChart(sensorData, 'tensao')}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value} V`, 'Tensão']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullTime
                      }
                      return label
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8884d8" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Corrente (A)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={formatDataForChart(sensorData, 'corrente')}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value} A`, 'Corrente']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullTime
                      }
                      return label
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    fill="url(#colorCorrente)"
                    fillOpacity={0.6}
                  />
                  <defs>
                    <linearGradient id="colorCorrente" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Velocidade (km/h)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formatDataForChart(sensorData, 'velocidade')}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value} km/h`, 'Velocidade']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullTime
                      }
                      return label
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    fill="#ffc658" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Temperatura (°C)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formatDataForChart(sensorData, 'temperatura')}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value} °C`, 'Temperatura']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.fullTime
                      }
                      return label
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#ff8042" 
                    strokeWidth={3}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Tabela de Dados Recentes */}
        <section className="data-table-section">
          <div className="section-header">
            <h2>Dados Recentes</h2>
            <button onClick={fetchData} className="refresh-btn">
              🔄 Atualizar
            </button>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Tensão (V)</th>
                  <th>Corrente (A)</th>
                  <th>Velocidade (km/h)</th>
                  <th>Temperatura (°C)</th>
                </tr>
              </thead>
              <tbody>
                {sensorData.slice().reverse().map((data, index) => (
                  <tr key={index}>
                    <td>{new Date(data.data_hora).toLocaleString()}</td>
                    <td className="value-cell">{data.tensao}</td>
                    <td className="value-cell">{data.corrente}</td>
                    <td className="value-cell">{data.velocidade}</td>
                    <td className="value-cell">{data.temperatura}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sensorData.length === 0 && (
              <div className="no-data">
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

// Helper function para nomes formatados
const getFieldName = (field) => {
  const names = {
    tensao: 'Tensão',
    corrente: 'Corrente',
    velocidade: 'Velocidade',
    temperatura: 'Temperatura'
  }
  return names[field] || field
}

export default Dashboard