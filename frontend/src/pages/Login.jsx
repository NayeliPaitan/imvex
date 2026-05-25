import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Package2, LogIn, AlertCircle, Eye, EyeOff, Copy, Check } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  
  // 1. Añadido campo 'rememberMe' al estado del formulario
  const [form, setForm] = useState({ username: '', password: '', rememberMe: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Estados para las nuevas funciones de UX
  const [showPassword, setShowPassword] = useState(false)
  const [copiedText, setCopiedText] = useState('') 

  // 2. Referencia para el Auto-foco táctil/visual
  const usernameRef = useRef(null)

  // Cargar usuario recordado y aplicar auto-foco
  useEffect(() => {
    const savedUser = localStorage.getItem('remembered_username')
    if (savedUser) {
      setForm(prev => ({ ...prev, username: savedUser, rememberMe: true }))
    }
    
    if (usernameRef.current) {
      usernameRef.current.focus()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (form.rememberMe) {
        localStorage.setItem('remembered_username', form.username)
      } else {
        localStorage.removeItem('remembered_username')
      }

      const user = await login(form.username, form.password)
      if (user.role === 'superadmin') navigate('/admin')
      else if (user.role === 'company_user') navigate('/pos')
      else navigate('/company')
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  // 3. Función optimizada para copiar credenciales demo de un solo toque
  const handleCopy = (username, password, id) => {
    navigator.clipboard.writeText(`${username} ${password}`)
    setCopiedText(id)
    setForm(prev => ({ ...prev, username, password })) 
    setTimeout(() => setCopiedText(''), 2000)
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
          <p style={{ color: 'var(--text-secondary)' }}>
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
              
              {/* CAMPO USUARIO CON AUTOFOCO */}
              <div className="form-group">
                <label htmlFor="username" className="form-label">Usuario</label>
                <input
                  id="username"
                  ref={usernameRef}
                  className="form-input"
                  type="text"
                  placeholder="Ingrese su Usuario"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
              
              {/* CAMPO CONTRASEÑA CON MOSTRAR/OCULTAR */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">Contraseña</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="password"
                    className="form-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                    style={{ width: '100%', paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '12px', background: 'none',
                      border: 'none', padding: 0, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', color: 'var(--text-secondary)'
                    }}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {/* Enlace de recuperación de la contraseña */}
                  <div style={{ textAlign: 'right', marginTop: -4 }}>
                    <a 
                      href="/forgot-password" 
                      style={{ 
                        fontSize: 12, 
                        color: 'var(--accent)', 
                        textDecoration: 'none',
                        opacity: loading ? 0.5 : 1,
                        pointerEvents: loading ? 'none' : 'auto'
                      }}
                      onClick={(e) => {
                        if (loading) e.preventDefault();
                        // Aquí usare navigate('/forgot-password') aun falta crear la ruta
                      }}
                    >
                      ¿Olvidaste tu contraseña?
                    </a>
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

              {/* CHECKBOX RECORDAR USUARIO */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '2px 0 6px 0' }}>
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={e => setForm({ ...form, rememberMe: e.target.checked })}
                  style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                />
                <label 
                  htmlFor="rememberMe" 
                  style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}
                >
                  Recordar mi usuario
                </label>
              </div>

              {/* Botón de ingreso con estado de carga estructurado */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ 
                  width: '100%', 
                  justifyContent: 'center', 
                  marginTop: 4, 
                  padding: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {loading ? (
                  <>
                    {/* Spinner*/}
                    <span 
                      style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid transparent',
                        borderTopColor: 'currentColor',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                        display: 'inline-block'
                      }}
                    />
                    <span>Ingresando…</span>
                  </>
                ) : (
                  <>
                    <LogIn size={15} /> Ingresar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Demo MEJORADO CON CLICK PARA COPIAR Y AUTOCOMPLETAR */}
        <div style={{
          marginTop: 20, padding: '12px 16px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 10 }}>
            Cuentas demo (Haz clic para copiar y rellenar)
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { id: 'super', role: 'Superadmin:', user: 'superadmin', pass: 'admin123', color: 'var(--accent)' },
              { id: 'empresa', role: 'Empresa:', user: 'demo_admin', pass: 'empresa123', color: 'var(--info)' },
              { id: 'pos', role: 'Usuario POS:', user: 'demo_userpos', pass: 'empresapos', color: 'var(--info)' }
            ].map((account) => (
              <div 
                key={account.id}
                onClick={() => handleCopy(account.user, account.pass, account.id)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  cursor: 'pointer', padding: '4px 6px', borderRadius: '4px',
                  transition: 'background 0.2s'
                }}
                className="demo-row-hover"
              >
                <div>
                  {account.role} <span className="mono" style={{ color: account.color }}>{account.user} / {account.pass}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                  {copiedText === account.id ? <Check size={14} color="var(--success, #10b981)" /> : <Copy size={14} />}
                </div>
              </div>
            ))}
          </div>
        </div>
            {/*estilo*/}
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
      </div>
    </div>
  )
}
