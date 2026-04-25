/* eslint-disable react-refresh/only-export-components -- AuthContext intentionally exports both Provider component and useAuth hook */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { authClient, IS_NEON } from './neonAuth'

interface AuthContextType {
  isAuthenticated: boolean
  token: string | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  devLogin: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const DEV_TOKEN = 'dev-token-abacus'

export function AuthProvider({ children }: { children: ReactNode }) {
  if (IS_NEON) {
    return <NeonAuthProvider>{children}</NeonAuthProvider>
  }
  return <DevAuthProvider>{children}</DevAuthProvider>
}

function NeonAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('abacus_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void authClient!.getSession().then(async (result) => {
      if (result.data) {
        const jwt = await authClient!.getJWTToken()
        if (jwt) {
          localStorage.setItem('abacus_token', jwt)
          setToken(jwt)
        }
      } else {
        localStorage.removeItem('abacus_token')
        setToken(null)
      }
      setLoading(false)
    })
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await authClient!.signIn.social({
      provider: 'google',
      callbackURL: window.location.origin,
    })
  }, [])

  const logout = useCallback(async () => {
    await authClient!.signOut()
    localStorage.removeItem('abacus_token')
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        token,
        loading,
        signInWithGoogle,
        devLogin: () => undefined,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

function DevAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('abacus_token'))

  const devLogin = useCallback(() => {
    localStorage.setItem('abacus_token', DEV_TOKEN)
    setToken(DEV_TOKEN)
  }, [])

  const logout = useCallback(async () => {
    localStorage.removeItem('abacus_token')
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        token,
        loading: false,
        signInWithGoogle: async () => undefined,
        devLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
