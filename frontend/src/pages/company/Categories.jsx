import { useEffect, useState } from 'react'
import { Tags, PlusCircle, Trash2, X } from 'lucide-react'
import Layout from '../../components/Layout'
import api from '../../api'
import { useToast } from '../../hooks/useToast'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const { addToast, ToastContainer } = useToast()

  const load = () => api.get('/api/inventory/categories').then(r => setCategories(r.data))
  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/api/inventory/categories', form)
      addToast('Categoría creada', 'success')
      setShowModal(false)
      setForm({ name: '', description: '' })
      load()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Error al guardar', 'error')
    } finally { setSaving(false) }
  }

  const del = async (cat) => {
    if (!confirm(`¿Eliminar categoría "${cat.name}"?`)) return
    try {
      await api.delete(`/api/inventory/categories/${cat.id}`)
      addToast('Categoría eliminada', 'success')
      load()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Error al eliminar', 'error')
    }
  }

  return (
    <Layout theme="theme-company">
      <ToastContainer />
      <div className="page-header">
        <div>
          <div className="page-title">Categorías</div>
          <div className="page-subtitle">{categories.length} categoría(s)</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={14} /> Nueva categoría
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {categories.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <Tags size={32} />
            <p>Sin categorías. Crea la primera.</p>
          </div>
        ) : categories.map(cat => (
          <div key={cat.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 8, flexShrink: 0,
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Tags size={16} color="var(--accent)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{cat.name}</div>
              {cat.description && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{cat.description}</div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {new Date(cat.created_at).toLocaleDateString('es-PE')}
              </div>
            </div>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              style={{ color: 'var(--danger)', flexShrink: 0 }}
              onClick={() => del(cat)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Nueva categoría</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Lencería" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descripción opcional" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name}>
                {saving ? 'Guardando…' : 'Crear categoría'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
