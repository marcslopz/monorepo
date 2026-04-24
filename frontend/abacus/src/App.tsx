import { AuthProvider, useAuth } from './auth/AuthContext'
import LoginScreen from './components/LoginScreen'
import Dashboard from './components/Dashboard'

function AppContent() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Dashboard /> : <LoginScreen />
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
