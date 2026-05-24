import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

import Login            from './pages/Login'
import AdminDashboard   from './pages/admin/Dashboard'
import AdminCompanies   from './pages/admin/Companies'
import CompanyDashboard from './pages/company/Dashboard'
import Products         from './pages/company/Products'
import Categories       from './pages/company/Categories'
import Sales            from './pages/company/Sales'
import Inventory        from './pages/company/Inventory'
import POS              from './pages/pos/POS'

function RequireAuth({ children, allowedRoles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their home
    if (user.role === 'superadmin') return <Navigate to="/admin" replace />
    if (user.role === 'company_user') return <Navigate to="/pos" replace />
    return <Navigate to="/company" replace />
  }
  return children
}

function HomeRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'superadmin')    return <Navigate to="/admin" replace />
  if (user.role === 'company_user')  return <Navigate to="/pos" replace />
  return <Navigate to="/company" replace />
}

export default function App() {
  const { user } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />

        {/* Login — redirige si ya está autenticado */}
        <Route path="/login" element={
          user ? <HomeRedirect /> : <Login />
        } />

        {/* ── Superadmin ── */}
        <Route path="/admin" element={
          <RequireAuth allowedRoles={['superadmin']}><AdminDashboard /></RequireAuth>
        } />
        <Route path="/admin/companies" element={
          <RequireAuth allowedRoles={['superadmin']}><AdminCompanies /></RequireAuth>
        } />

        {/* ── Company Admin ── */}
        <Route path="/company" element={
          <RequireAuth allowedRoles={['company_admin']}><CompanyDashboard /></RequireAuth>
        } />
        <Route path="/company/products" element={
          <RequireAuth allowedRoles={['company_admin']}><Products /></RequireAuth>
        } />
        <Route path="/company/categories" element={
          <RequireAuth allowedRoles={['company_admin']}><Categories /></RequireAuth>
        } />
        <Route path="/company/sales" element={
          <RequireAuth allowedRoles={['company_admin']}><Sales /></RequireAuth>
        } />
        <Route path="/company/inventory" element={
          <RequireAuth allowedRoles={['company_admin']}><Inventory /></RequireAuth>
        } />

        {/* ── Cajero / POS ── */}
        <Route path="/pos" element={
          <RequireAuth allowedRoles={['company_user']}><POS /></RequireAuth>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
