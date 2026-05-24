import { useEffect, useState, useRef } from 'react'
import {
  Building2, PlusCircle, Pencil, Trash2, X, Users,
  ChevronDown, ChevronRight, UserPlus, UserCog,
  ToggleLeft, ToggleRight, KeyRound, Upload, ImageIcon
} from 'lucide-react'
import Layout from '../../components/Layout'
import api from '../../api'
import { useToast } from '../../hooks/useToast'

const PLAN_OPTIONS = ['basic', 'professional', 'enterprise']
const EMPTY_COMPANY = { name:'', ruc:'', address:'', phone:'', email:'', plan:'basic' }
const EMPTY_USER    = { username:'', email:'', full_name:'', password:'', role:'company_admin' }

// ─── Company Logo component ───────────────────────────────────────────────────
function CompanyLogo({ company, size = 36 }) {
  const [err, setErr] = useState(false)
  if (company?.logo_url && !err) {
    return (
      <img src={company.logo_url} alt={company.name}
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: 8, objectFit: 'contain',
          border: '1px solid var(--border)', background: 'white', padding: 2 }} />
    )
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: 'var(--accent-dim)', border: '1px solid var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: 'var(--accent)' }}>
      {company?.name?.[0] || '?'}
    </div>
  )
}

export default function AdminCompanies() {
  const [companies, setCompanies]       = useState([])
  const [expanded, setExpanded]         = useState(null)
  const [companyUsers, setCompanyUsers] = useState({})

  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [editingCompany, setEditingCompany]     = useState(null)
  const [companyForm, setCompanyForm]           = useState(EMPTY_COMPANY)
  const [logoPreview, setLogoPreview]           = useState(null)
  const [logoFile, setLogoFile]                 = useState(null)
  const [uploadingLogo, setUploadingLogo]       = useState(false)
  const logoRef = useRef(null)

  const [showUserModal, setShowUserModal]     = useState(false)
  const [editingUser, setEditingUser]         = useState(null)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [userForm, setUserForm]               = useState(EMPTY_USER)
  const [changePassword, setChangePassword]   = useState(false)

  const [saving, setSaving] = useState(false)
  const { addToast, ToastContainer } = useToast()

  // ─── Load ──────────────────────────────────────────────────────────────────
  const loadCompanies = () =>
    api.get('/api/admin/companies').then(r => setCompanies(r.data))

  useEffect(() => { loadCompanies() }, [])

  const loadUsers = async (companyId, force = false) => {
    if (companyUsers[companyId] && !force) return
    const r = await api.get(`/api/admin/companies/${companyId}/users`)
    setCompanyUsers(prev => ({ ...prev, [companyId]: r.data }))
  }

  const refreshUsers = (id) => loadUsers(id, true)

  const toggleExpanded = (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id); loadUsers(id)
  }

  // ─── Company CRUD ──────────────────────────────────────────────────────────
  const openCreateCompany = () => {
    setEditingCompany(null)
    setCompanyForm(EMPTY_COMPANY)
    setLogoPreview(null)
    setLogoFile(null)
    setShowCompanyModal(true)
  }

  const openEditCompany = (c) => {
    setEditingCompany(c)
    setCompanyForm({ name:c.name, ruc:c.ruc||'', address:c.address||'', phone:c.phone||'', email:c.email||'', plan:c.plan })
    setLogoPreview(c.logo_url || null)
    setLogoFile(null)
    setShowCompanyModal(true)
  }

  const handleLogoFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { addToast('Máximo 3MB', 'error'); return }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const saveCompany = async () => {
    setSaving(true)
    try {
      let savedCompany
      if (editingCompany) {
        const r = await api.put(`/api/admin/companies/${editingCompany.id}`, companyForm)
        savedCompany = r.data
        addToast('Empresa actualizada', 'success')
      } else {
        const r = await api.post('/api/admin/companies', companyForm)
        savedCompany = r.data
        addToast('Empresa creada', 'success')
      }

      // Upload logo if selected
      if (logoFile && savedCompany?.id) {
        setUploadingLogo(true)
        try {
          const fd = new FormData()
          fd.append('file', logoFile)
          await api.post(`/api/admin/companies/${savedCompany.id}/logo`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          addToast('Logo guardado', 'success')
        } catch {
          addToast('Error al subir el logo', 'error')
        } finally { setUploadingLogo(false) }
      }

      setShowCompanyModal(false)
      loadCompanies()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Error al guardar', 'error')
    } finally { setSaving(false) }
  }

  const toggleActive = async (c) => {
    await api.put(`/api/admin/companies/${c.id}`, { is_active: !c.is_active })
    addToast(`Empresa ${c.is_active ? 'desactivada' : 'activada'}`, 'info')
    loadCompanies()
  }

  const deleteCompany = async (c) => {
    if (!confirm(`¿Eliminar "${c.name}"? Se eliminarán todos sus datos.`)) return
    await api.delete(`/api/admin/companies/${c.id}`)
    addToast('Empresa eliminada', 'success')
    loadCompanies()
  }

  // ─── User CRUD ─────────────────────────────────────────────────────────────
  const openCreateUser = (company) => {
    setSelectedCompany(company); setEditingUser(null)
    setUserForm(EMPTY_USER); setChangePassword(false); setShowUserModal(true)
  }
  const openEditUser = (company, user) => {
    setSelectedCompany(company); setEditingUser(user)
    setUserForm({ username:user.username, email:user.email, full_name:user.full_name||'', password:'', role:user.role })
    setChangePassword(false); setShowUserModal(true)
  }
  const saveUser = async () => {
    setSaving(true)
    try {
      if (editingUser) {
        const payload = { email:userForm.email, full_name:userForm.full_name, role:userForm.role, is_active:userForm.is_active!==false }
        if (changePassword && userForm.password) payload.password = userForm.password
        await api.put(`/api/admin/companies/${selectedCompany.id}/users/${editingUser.id}`, payload)
        addToast('Usuario actualizado', 'success')
      } else {
        await api.post(`/api/admin/companies/${selectedCompany.id}/users`, userForm)
        addToast('Usuario creado', 'success')
      }
      setShowUserModal(false); refreshUsers(selectedCompany.id)
    } catch (err) {
      addToast(err.response?.data?.detail || 'Error al guardar', 'error')
    } finally { setSaving(false) }
  }
  const toggleUserActive = async (company, user) => {
    await api.put(`/api/admin/companies/${company.id}/users/${user.id}`, { is_active: !user.is_active })
    addToast(`Usuario ${user.is_active ? 'desactivado' : 'activado'}`, 'info')
    refreshUsers(company.id)
  }
  const deleteUser = async (company, user) => {
    if (!confirm(`¿Eliminar usuario "${user.username}"?`)) return
    await api.delete(`/api/admin/companies/${company.id}/users/${user.id}`)
    addToast('Usuario eliminado', 'success'); refreshUsers(company.id)
  }

  const ROLE_LABELS = { company_admin:'Admin', company_user:'Cajero' }
  const ROLE_COLORS = { company_admin:'badge-info', company_user:'badge-accent' }

  return (
    <Layout isAdmin>
      <ToastContainer />
      <div className="page-header">
        <div>
          <div className="page-title">Empresas</div>
          <div className="page-subtitle">{companies.length} empresa(s) registrada(s)</div>
        </div>
        <button className="btn btn-primary" onClick={openCreateCompany}>
          <PlusCircle size={14}/> Nueva empresa
        </button>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {companies.length === 0
          ? <div className="empty-state"><Building2 size={32}/><p>Sin empresas.</p></div>
          : companies.map(c => (
          <div key={c.id} style={{ borderBottom:'1px solid var(--border)' }}>
            {/* Company row */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background=''}>
              <button className="btn btn-ghost btn-icon btn-sm" style={{ padding:3 }} onClick={() => toggleExpanded(c.id)}>
                {expanded===c.id ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
              </button>

              <CompanyLogo company={c} size={36} />

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{c.name}</div>
                <div style={{ fontSize:11, color:'var(--text-secondary)', display:'flex', gap:10 }}>
                  {c.ruc && <span className="mono">RUC: {c.ruc}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                </div>
              </div>

              <span className="badge badge-accent">{c.plan}</span>
              <span className={`badge ${c.is_active?'badge-success':'badge-danger'}`}>{c.is_active?'Activa':'Inactiva'}</span>
              <span style={{ fontSize:11, color:'var(--text-muted)', minWidth:80, textAlign:'right' }}>
                {new Date(c.created_at).toLocaleDateString('es-PE')}
              </span>
              <div style={{ display:'flex', gap:3 }}>
                <button className="btn btn-ghost btn-icon btn-sm" title="Agregar usuario" onClick={() => openCreateUser(c)}><UserPlus size={13}/></button>
                <button className="btn btn-ghost btn-icon btn-sm" title="Editar" onClick={() => openEditCompany(c)}><Pencil size={13}/></button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{ color:c.is_active?'var(--warning)':'var(--success)' }} onClick={() => toggleActive(c)}>
                  {c.is_active?<ToggleRight size={14}/>:<ToggleLeft size={14}/>}
                </button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--danger)' }} onClick={() => deleteCompany(c)}><Trash2 size={13}/></button>
              </div>
            </div>

            {/* Expanded users */}
            {expanded===c.id && (
              <div style={{ background:'var(--bg-elevated)', borderTop:'1px solid var(--border)', padding:'12px 16px 14px 62px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', display:'flex', alignItems:'center', gap:5 }}>
                    <Users size={12}/> Usuarios ({(companyUsers[c.id]||[]).length})
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => openCreateUser(c)}><UserPlus size={12}/> Agregar usuario</button>
                </div>
                {!companyUsers[c.id]
                  ? <div style={{ color:'var(--text-muted)', fontSize:12 }}>Cargando…</div>
                  : companyUsers[c.id].length===0
                    ? <div style={{ color:'var(--text-muted)', fontSize:12 }}>Sin usuarios asignados.</div>
                    : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {companyUsers[c.id].map(u => (
                          <div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:7 }}>
                            <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:u.is_active?'var(--info-dim)':'var(--bg-elevated)', border:`1px solid ${u.is_active?'var(--info)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:u.is_active?'var(--info)':'var(--text-muted)' }}>
                              {(u.full_name||u.username)[0].toUpperCase()}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:600 }}>{u.full_name||u.username}</div>
                              <div style={{ fontSize:11, color:'var(--text-muted)', display:'flex', gap:8 }}>
                                <span className="mono">@{u.username}</span><span>{u.email}</span>
                              </div>
                            </div>
                            <span className={`badge ${ROLE_COLORS[u.role]||'badge-accent'}`} style={{ fontSize:10 }}>{ROLE_LABELS[u.role]||u.role}</span>
                            <span className={`badge ${u.is_active?'badge-success':'badge-danger'}`} style={{ fontSize:10 }}>{u.is_active?'Activo':'Inactivo'}</span>
                            <div style={{ display:'flex', gap:3 }}>
                              <button className="btn btn-ghost btn-icon btn-sm" title="Editar" onClick={() => openEditUser(c,u)}><UserCog size={13}/></button>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color:u.is_active?'var(--warning)':'var(--success)' }} onClick={() => toggleUserActive(c,u)}>
                                {u.is_active?<ToggleRight size={13}/>:<ToggleLeft size={13}/>}
                              </button>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ color:'var(--danger)' }} onClick={() => deleteUser(c,u)}><Trash2 size={13}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                }
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Modal empresa ── */}
      {showCompanyModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowCompanyModal(false)}>
          <div className="modal" style={{ maxWidth:540 }}>
            <div className="modal-header">
              <span className="modal-title">{editingCompany?'Editar empresa':'Nueva empresa'}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowCompanyModal(false)}><X size={14}/></button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Logo upload */}
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Logo de la empresa</div>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  {/* Preview */}
                  <div style={{ width:72, height:72, borderRadius:10, border:'2px dashed var(--border)', background:'var(--bg-elevated)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                    {logoPreview
                      ? <img src={logoPreview} alt="logo" style={{ width:'100%', height:'100%', objectFit:'contain' }} />
                      : <ImageIcon size={24} color="var(--text-muted)" />
                    }
                  </div>
                  <div style={{ flex:1 }}>
                    <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} onChange={handleLogoFile} />
                    <button className="btn btn-ghost" style={{ gap:7, width:'100%', justifyContent:'center', borderStyle:'dashed' }} onClick={() => logoRef.current?.click()}>
                      <Upload size={14}/> {logoPreview ? 'Cambiar logo' : 'Subir logo'}
                    </button>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>JPG, PNG · máx. 3MB · Se mostrará en la boleta de venta</div>
                  </div>
                </div>
              </div>

              <div style={{ height:1, background:'var(--border)' }} />

              <div className="form-group">
                <label className="form-label">Razón Social *</label>
                <input className="form-input" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name:e.target.value})} placeholder="Nombre de la empresa" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">RUC</label>
                  <input className="form-input mono" value={companyForm.ruc} onChange={e => setCompanyForm({...companyForm, ruc:e.target.value})} placeholder="20XXXXXXXXX" maxLength={11} />
                </div>
                <div className="form-group">
                  <label className="form-label">Plan</label>
                  <select className="form-input" value={companyForm.plan} onChange={e => setCompanyForm({...companyForm, plan:e.target.value})}>
                    {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Dirección</label>
                <input className="form-input" value={companyForm.address} onChange={e => setCompanyForm({...companyForm, address:e.target.value})} placeholder="Dirección física" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Teléfono</label>
                  <input className="form-input" value={companyForm.phone} onChange={e => setCompanyForm({...companyForm, phone:e.target.value})} placeholder="987654321" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={companyForm.email} onChange={e => setCompanyForm({...companyForm, email:e.target.value})} placeholder="empresa@correo.com" />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCompanyModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveCompany} disabled={saving||!companyForm.name}>
                {saving||uploadingLogo ? 'Guardando…' : editingCompany ? 'Actualizar empresa' : 'Crear empresa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal usuario ── */}
      {showUserModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowUserModal(false)}>
          <div className="modal" style={{ maxWidth:480 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{editingUser?'Editar usuario':'Nuevo usuario'}</div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>{selectedCompany?.name}</div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowUserModal(false)}><X size={14}/></button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Usuario {!editingUser&&'*'}</label>
                  <input className="form-input mono" value={userForm.username} onChange={e => setUserForm({...userForm, username:e.target.value})} placeholder="nombre_usuario" disabled={!!editingUser} style={editingUser?{opacity:0.5,cursor:'not-allowed'}:{}} />
                  {editingUser && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>No se puede cambiar</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="form-input" value={userForm.role} onChange={e => setUserForm({...userForm, role:e.target.value})}>
                    <option value="company_admin">Admin empresa</option>
                    <option value="company_user">Cajero (POS)</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre completo</label>
                <input className="form-input" value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name:e.target.value})} placeholder="Nombre Apellido" />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email:e.target.value})} placeholder="usuario@empresa.com" />
              </div>
              {!editingUser
                ? <div className="form-group">
                    <label className="form-label">Contraseña *</label>
                    <input className="form-input" type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password:e.target.value})} placeholder="mínimo 8 caracteres" />
                  </div>
                : <div>
                    <button className="btn btn-ghost btn-sm" style={{ gap:6, color:changePassword?'var(--warning)':'var(--text-secondary)' }} onClick={() => { setChangePassword(!changePassword); setUserForm({...userForm, password:''}) }}>
                      <KeyRound size={13}/>{changePassword?'Cancelar cambio':'Cambiar contraseña'}
                    </button>
                    {changePassword && (
                      <div className="form-group" style={{ marginTop:10 }}>
                        <label className="form-label">Nueva contraseña</label>
                        <input className="form-input" type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password:e.target.value})} placeholder="Nueva contraseña" autoFocus />
                      </div>
                    )}
                  </div>
              }
              {editingUser && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--bg-elevated)', borderRadius:6, border:'1px solid var(--border)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>Estado del usuario</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>Desactivar impide el acceso sin eliminar</div>
                  </div>
                  <button className={`btn btn-sm ${userForm.is_active===false?'btn-ghost':'btn-primary'}`} style={{ gap:5 }} onClick={() => setUserForm({...userForm, is_active:userForm.is_active===false})}>
                    {userForm.is_active===false ? <><ToggleLeft size={13}/> Inactivo</> : <><ToggleRight size={13}/> Activo</>}
                  </button>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowUserModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveUser} disabled={saving||!userForm.email||(!editingUser&&(!userForm.username||!userForm.password))}>
                {saving?'Guardando…':editingUser?'Guardar cambios':'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
