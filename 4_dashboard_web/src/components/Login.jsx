import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './Login.css'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!email || !password) {
      setError('Por favor, preencha todos os campos')
      return
    }

    setLoading(true)

    const result = await login(email, password)
    
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
    
    setLoading(false)
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <div className="login-header">
          <h1>IFECO Dashboard</h1>
          <p>Sistema de Monitoramento em Tempo Real</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={loading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Senha:</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="error-message">
              <span>⚠️</span>
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="button-spinner"></div>
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Use suas credenciais do sistema IFECO</p>
        </div>
      </div>
    </div>
  )
}

export default Login