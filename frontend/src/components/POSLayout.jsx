import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ShoppingCart, LogOut, Package } from 'lucide-react'

export default function POSLayout({ children }) {
  const { user, logout } = useNavigate ? require('../contexts/AuthContext').useAuth() : { user: null, logout: () => {} }
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'var(--bg-base)', overflow: 'hidden',
    }}>
      {/* Top bar */}
      <header style={{
        height: 52, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, background: 'var(--accent-dim)', border: '1px solid var(--accent)',
          borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShoppingCart size={16} color="var(--accent)" />
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
          Punto de Venta
        </span>
        <span style={{
          padding: '2px 10px', background: 'var(--accent-dim)', color: 'var(--accent)',
          borderRadius: 99, fontSize: 11, fontWeight: 600, border: '1px solid var(--accent)',
        }}>CAJA</span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.full_name || user?.username}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cajero/a</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
            style={{ gap: 6 }}
            title="Cerrar sesión"
          >
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}
