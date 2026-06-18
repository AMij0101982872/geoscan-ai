import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Validate from './pages/Validate'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function PrivateRoute({ children, session }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={
        <PrivateRoute session={session}>
          <Layout session={session}>
            <Dashboard session={session} />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/upload" element={
        <PrivateRoute session={session}>
          <Layout session={session}>
            <Upload session={session} />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/reports/:id" element={
        <PrivateRoute session={session}>
          <Layout session={session}>
            <Validate session={session} />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="/settings" element={
        <PrivateRoute session={session}>
          <Layout session={session}>
            <Settings session={session} />
          </Layout>
        </PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
