import React, { createContext, useState, useContext, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('ifeco_token')
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        
        // Verificar se o token ainda é válido
        const response = await api.get('/dados/recentes?limit=1')
        if (response.data.success) {
          setUser({ token })
        } else {
          localStorage.removeItem('ifeco_token')
          delete api.defaults.headers.common['Authorization']
        }
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error)
      localStorage.removeItem('ifeco_token')
      delete api.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password })
      const { token, user: userData } = response.data
      
      localStorage.setItem('ifeco_token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser({ ...userData, token })
      
      return { success: true }
    } catch (error) {
      console.error('Erro no login:', error)
      return { 
        success: false, 
        error: error.response?.data?.message || 'Erro no login' 
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('ifeco_token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading 
    }}>
      {children}
    </AuthContext.Provider>
  )
}