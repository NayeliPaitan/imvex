import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Package2, LogIn, AlertCircle } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.username, form.password)
      if (user.role === 'superadmin')   navigate('/admin')
      else if (user.role === 'company_user') navigate('/pos')
      else navigate('/company')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(ellipse at 60% 10%, rgba(0,212,170,0.06) 0%, transparent 55%)',
    }}>
      <div style={{ width: '100%', maxWidth: '380px', padding: '0 16px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 48, height: 48, background: 'var(--accent-dim)',
            border: '1px solid var(--accent)', borderRadius: 12,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Package2 size={22} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
            IMVEX
          </h1>
          <p>
            Sistema de Inventario
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '28px 24px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Usuario</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Ingrese su Usuario"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
              </div>

              {error && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 12px', background: 'var(--danger-dim)',
                  border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--danger)', fontSize: 13,
                }}>
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '10px' }}
              >
                {loading ? 'Ingresando…' : <><LogIn size={15} /> Ingresar</>}
              </button>
            </div>
          </form>
        </div>

        {/* Demo hint */}
        <div style={{
          marginTop: 20, padding: '12px 16px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>Cuentas demo</div>
          <div>Superadmin: <span className="mono" style={{ color: 'var(--accent)' }}>superadmin / admin123</span></div>
          <div>Empresa: <span className="mono" style={{ color: 'var(--info)' }}> demo_admin / empresa123</span></div>
          <div>Usuario Pos: <span className="mono" style={{ color: 'var(--info)' }}> demo_userpos / empresapos</span></div>
        </div>
      </div>
    </div>
  )
}
