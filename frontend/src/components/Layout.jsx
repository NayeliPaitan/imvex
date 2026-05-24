import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Building2, Package, ShoppingCart, ShoppingBag,
  Boxes, Tags, LogOut, X, Camera, KeyRound, Save, CreditCard,
  LifeBuoy, Settings,Megaphone, ShieldCheck,
  Link as LinkIcon, Upload,
  MonitorPlay, Wallet, Users, Truck, BarChart3, UserCheck,
  Sun, Moon, Monitor,
} from 'lucide-react'
import api from '../api'
import { useToast } from '../hooks/useToast'

const ROLE_LABELS = {
  superadmin:    'Saas Imvex',
  company_admin: 'Administrador',
  company_user:  'Cajero',
}

const ADMIN_NAV = [
  { section: 'SaaS Core' },
  { to: '/admin',               label: 'Dashboard',             icon: LayoutDashboard, end: true },
  { to: '/admin/companies',     label: 'Empresas / Clientes',   icon: Building2 }, 
  { to: '/admin/subscriptions', label: 'Planes y Facturación',  icon: CreditCard }, // Planes basic, professional , enterprise

  { section: 'Finanzas e Insights' },
  { to: '/admin/metrics',       label: 'Métricas de Negocio',   icon: BarChart3 }, // MRR, Churn Rate, LTV, ARPU
  { to: '/admin/coupons',       label: 'Cupones y Descuentos',  icon: Tags },      // Estrategias de marketing y captación

  { section: 'Atención y Retención' },
  { to: '/admin/support',       label: 'Soporte Técnico',       icon: LifeBuoy },  // Tickets activos y chat de ayuda
  { to: '/admin/notifications', label: 'Anuncios Globales',     icon: Megaphone }, // Alertas de mantenimiento o actualizaciones

  { section: 'Seguridad y DevOps' },
  { to: '/admin/audit-logs',    label: 'Logs de Auditoría',     icon: ShieldCheck }, // Acciones críticas de tus clientes o staff
  { to: '/admin/configuration', label: 'Variables de Sistema',  icon: Settings },    // Pasarelas de pago, integraciones, respaldos

]

const COMPANY_NAV = [
  { section: 'Operaciones' },
  { to: '/company',            label: 'Dashboard',   icon: LayoutDashboard, end: true },
  { to: '/company/pos',        label: 'Punto de Venta', icon: MonitorPlay }, // ¡Indispensable! Acceso rápido a la caja

  { section: 'Catálogo' },
  { to: '/company/products',   label: 'Productos',   icon: Package },
  { to: '/company/categories', label: 'Categorías',  icon: Tags },
  
  { section: 'Movimientos' },
  { to: '/company/sales',       label: 'Ventas',      icon: ShoppingCart },
  { to: '/company/purchases',   label: 'Compras',     icon: ShoppingBag },
  { to: '/company/inventory',   label: 'Inventario',  icon: Boxes }, // Ajustes, mermas, transferencias
  { to: '/company/cash-control',label: 'Control de Caja', icon: Wallet }, // Cierres de caja (X/Z), ingresos/egresos

  { section: 'Contactos' },
  { to: '/company/customers',  label: 'Clientes',    icon: Users }, // Crédito a clientes, historial de compras
  { to: '/company/suppliers',  label: 'Proveedores', icon: Truck },  // Cuentas por pagar, datos de contacto

  { section: 'Administración' },
  { to: '/company/analytics',  label: 'Reportes',    icon: BarChart3 }, // Gráficas de utilidad, reportes fiscales
  { to: '/company/team',       label: 'Empleados',   icon: UserCheck }, // Roles, permisos y cajeros asignados
  { to: '/company/settings',   label: 'Configuración', icon: Settings }, // Datos fiscales, ticket, sucursales

]

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 34, onClick }) {
  const [err, setErr] = useState(false)
  const initial = (user?.full_name || user?.username || '?')[0].toUpperCase()
  const base = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    border: '2px solid var(--accent)', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default', transition: 'opacity 0.15s',
  }
  if (user?.avatar_url && !err) {
    return (
      <div style={base} onClick={onClick} title="Editar perfil">
        <img src={user.avatar_url} alt={initial} onError={() => setErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  return (
    <div style={{ ...base, background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: size * 0.38, fontWeight: 700 }}
      onClick={onClick} title="Editar perfil">
      {initial}
    </div>
  )
}

// ─── Profile Modal ────────────────────────────────────────────────────────────
function ProfileModal({ user, onClose, onSave }) {
  const [form, setForm]           = useState({ full_name: user?.full_name || '', avatar_url: user?.avatar_url || '', password: '', confirm: '' })
  const [tab, setTab]             = useState('upload')   // upload | url
  const [preview, setPreview]     = useState(user?.avatar_url || null)
  const [previewErr, setPreviewErr] = useState(false)
  const [showPwd, setShowPwd]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const { addToast } = useToast()

  // Upload file directly
  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { addToast('Máximo 2MB', 'error'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/api/auth/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const dataUrl = res.data.avatar_url
      setPreview(dataUrl)
      setPreviewErr(false)
      setForm(f => ({ ...f, avatar_url: dataUrl }))
      addToast('Foto actualizada', 'success')
      // Update localStorage immediately
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      const updated = { ...stored, avatar_url: dataUrl, full_name: res.data.full_name }
      localStorage.setItem('user', JSON.stringify(updated))
      onSave(updated)
    } catch (err) {
      addToast(err.response?.data?.detail || 'Error al subir foto', 'error')
    } finally { setUploading(false) }
  }

  const save = async () => {
    if (showPwd && form.password && form.password !== form.confirm) {
      addToast('Las contraseñas no coinciden', 'error'); return
    }
    setSaving(true)
    try {
      const payload = { full_name: form.full_name, avatar_url: form.avatar_url || null }
      if (showPwd && form.password) payload.password = form.password
      const res = await api.put('/api/auth/profile', payload)
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      const updated = { ...stored, full_name: res.data.full_name, avatar_url: res.data.avatar_url }
      localStorage.setItem('user', JSON.stringify(updated))
      addToast('Perfil guardado', 'success')
      onSave(updated)
      onClose()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Error al guardar', 'error')
    } finally { setSaving(false) }
  }

  const initial = (form.full_name || user?.username || '?')[0].toUpperCase()

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span className="modal-title">Mi perfil</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={14}/></button>
        </div>

        {/* Avatar preview */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {preview && !previewErr
              ? <img src={preview} alt="preview" onError={() => setPreviewErr(true)}
                  style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)' }} />
              : <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--accent-dim)', border: '3px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
                  {initial}
                </div>
            }
            {/* Camera badge */}
            <div onClick={() => fileRef.current?.click()} style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--bg-surface)' }}>
              <Camera size={12} color="#0d1117"/>
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {ROLE_LABELS[user?.role] || user?.role}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nombre */}
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <input className="form-input" value={form.full_name}
              onChange={e => setForm({...form, full_name: e.target.value})}
              placeholder="Nombre Apellido" />
          </div>

          {/* Foto — tabs upload vs URL */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Foto de perfil</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {[{ key:'upload', label:'Subir foto', icon: Upload }, { key:'url', label:'Pegar URL', icon: LinkIcon }].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:6, border:'1px solid', borderColor: tab===t.key?'var(--accent)':'var(--border)', background: tab===t.key?'var(--accent-dim)':'transparent', color: tab===t.key?'var(--accent)':'var(--text-secondary)', fontSize:12, fontWeight:500, cursor:'pointer' }}>
                  <t.icon size={12}/>{t.label}
                </button>
              ))}
            </div>

            {tab === 'upload' && (
              <div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={handleFile} />
                <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', gap:8, padding:'14px', border:'2px dashed var(--border)', borderRadius:8 }}
                  onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading
                    ? 'Subiendo foto…'
                    : <><Upload size={16}/> Seleccionar foto desde tu PC</>
                  }
                </button>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:5, textAlign:'center' }}>JPG, PNG o WEBP · máximo 2MB</div>
              </div>
            )}

            {tab === 'url' && (
              <div className="form-group">
                <input className="form-input" value={form.avatar_url}
                  onChange={e => { setForm({...form, avatar_url: e.target.value}); setPreview(e.target.value); setPreviewErr(false) }}
                  placeholder="https://i.imgur.com/tuimagen.jpg" />
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
                  Usa el link <b>directo</b> de la imagen (que termine en .jpg o .png)
                </div>
              </div>
            )}
          </div>

          {/* Cambiar contraseña */}
          <div>
            <button className="btn btn-ghost btn-sm" style={{ gap:6, color: showPwd?'var(--warning)':'var(--text-secondary)' }}
              onClick={() => { setShowPwd(!showPwd); setForm({...form, password:'', confirm:''}) }}>
              <KeyRound size={13}/>
              {showPwd ? 'Cancelar cambio de contraseña' : 'Cambiar contraseña'}
            </button>
            {showPwd && (
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:10 }}>
                <div className="form-group">
                  <label className="form-label">Nueva contraseña</label>
                  <input className="form-input" type="password" value={form.password}
                    onChange={e => setForm({...form, password:e.target.value})} placeholder="mínimo 8 caracteres" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirmar</label>
                  <input className="form-input" type="password" value={form.confirm}
                    onChange={e => setForm({...form, confirm:e.target.value})} placeholder="Repite la contraseña" />
                  {form.confirm && form.password !== form.confirm &&
                    <div style={{ fontSize:11, color:'var(--danger)', marginTop:3 }}>Las contraseñas no coinciden</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando…' : <><Save size={13}/> Guardar cambios</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function Layout({ children, isAdmin = false, theme = '' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showProfile, setShowProfile] = useState(false)
  const [localUser, setLocalUser] = useState(user)
  // modo dark 
  const [themeMode, setThemeMode] = useState(
    localStorage.getItem('theme') || 'dark'
  )

  const { ToastContainer } = useToast()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode)
    localStorage.setItem('theme', themeMode)
  }, [themeMode])


  const navItems = isAdmin ? ADMIN_NAV : COMPANY_NAV
  const currentUser = localUser || user

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className={`app-layout ${theme}`}>
      <ToastContainer />
      <nav className="sidebar">
        <div className="sidebar-logo">
          <span style={{ width:26, height:26, background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:6, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--accent)', flexShrink:0 }}>S</span>
          {/* name the layout */}
          {isAdmin ? 'IMVEX' : 'Inventario'}
        </div>
        <div style={{ flex:1, padding:'8px 0' }}>
          {navItems.map((item, i) => {
            if (item.section) return <div key={i} className="sidebar-section">{item.section}</div>
            return (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                <item.icon size={15}/>{item.label}
              </NavLink>
            )
          })}
        </div>
        {/* Theme Switch */}
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid var(--border)',
          }}
        >
          <button
            className="btn btn-ghost"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              gap: 8,
            }}
            onClick={() =>
              setThemeMode(themeMode === 'dark' ? 'light' : 'dark')
            }
          >
            {themeMode === 'dark'
              ? <Sun size={15} />
              : <Moon size={15} />
            }

            {themeMode === 'dark'
              ? 'Modo claro'
              : 'Modo oscuro'
            }
          </button>
        </div>
        {/* User info */}
        <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:9 }}>
          <Avatar user={currentUser} size={34} onClick={() => setShowProfile(true)} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer' }}
              onClick={() => setShowProfile(true)}>
              {currentUser?.full_name || currentUser?.username}
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>
              {ROLE_LABELS[currentUser?.role] || currentUser?.role}
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={handleLogout} title="Cerrar sesión" style={{ padding:5, flexShrink:0 }}>
            <LogOut size={14}/>
          </button>
        </div>
      </nav>

      <main className="main-content">
        <div className="page-body">{children}</div>
      </main>

      {showProfile && (
        <ProfileModal
          user={currentUser}
          onClose={() => setShowProfile(false)}
          onSave={(updated) => setLocalUser(updated)}
        />
      )}
    </div>
  )
}
