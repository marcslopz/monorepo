/* eslint-disable react-refresh/only-export-components -- AuthContext intentionally exports both Provider component and useAuth hook */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  token: string | null
  devLogin: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEV_TOKEN = 'dev-token-abacus'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('abacus_token'))

  const devLogin = useCallback(() => {
    localStorage.setItem('abacus_token', DEV_TOKEN)
    setToken(DEV_TOKEN)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('abacus_token')
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, token, devLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

