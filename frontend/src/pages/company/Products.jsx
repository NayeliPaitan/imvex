import { useEffect, useState } from 'react'
import { Package, PlusCircle, Pencil, Trash2, X, Search, AlertTriangle } from 'lucide-react'
import Layout from '../../components/Layout'
import api from '../../api'
import { useToast } from '../../hooks/useToast'

const EMPTY = { category_id: '', code: '', name: '', description: '', unit_cost: '', sale_price: '', stock: '', stock_minimum: '', unit: 'unidad' }

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const { addToast, ToastContainer } = useToast()

  const load = () => {
    api.get('/api/products', { params: { search: search || undefined, category_id: catFilter || undefined } })
      .then(r => setProducts(r.data))
    api.get('/api/inventory/categories').then(r => setCategories(r.data))
  }

  useEffect(() => { load() }, [search, catFilter])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({
      category_id: p.category_id || '', code: p.code || '', name: p.name,
      description: p.description || '', unit_cost: p.unit_cost, sale_price: p.sale_price,
      stock: p.stock, stock_minimum: p.stock_minimum, unit: p.unit,
    })
    setShowModal(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        unit_cost: parseFloat(form.unit_cost) || 0,
        sale_price: parseFloat(form.sale_price) || 0,
        stock: parseInt(form.stock) || 0,
        stock_minimum: parseInt(form.stock_minimum) || 0,
      }
      if (editing) {
        await api.put(`/api/products/${editing.id}`, payload)
        addToast('Producto actualizado', 'success')
      } else {
        await api.post('/api/products', payload)
        addToast('Producto creado', 'success')
      }
      setShowModal(false)
      load()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Error al guardar', 'error')
    } finally { setSaving(false) }
  }

  const del = async (p) => {
    if (!confirm(`¿Eliminar "${p.name}"?`)) return
    await api.delete(`/api/products/${p.id}`)
    addToast('Producto eliminado', 'success')
    load()
  }

  const margin = (p) => {
    if (!p.unit_cost || !p.sale_price) return null
    return (((p.sale_price - p.unit_cost) / p.sale_price) * 100).toFixed(0)
  }

  return (
    <Layout theme="theme-company">
      <ToastContainer />
      <div className="page-header">
        <div>
          <div className="page-title">Productos</div>
          <div className="page-subtitle">{products.length} producto(s)</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}><PlusCircle size={14} /> Nuevo producto</button>
      </div>

      {/* Filters */}
      <div className="flex-row" style={{ marginBottom: 16, gap: 10 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input" style={{ paddingLeft: 32 }}
            placeholder="Buscar por nombre…" value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input" style={{ width: 180 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {products.length === 0 ? (
          <div className="empty-state"><Package size={32} /><p>Sin productos. Agrega el primero.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th style={{ textAlign: 'right' }}>Costo</th>
                  <th style={{ textAlign: 'right' }}>Precio</th>
                  <th style={{ textAlign: 'right' }}>Margen</th>
                  <th style={{ textAlign: 'center' }}>Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const lowStock = p.stock <= p.stock_minimum
                  const m = margin(p)
                  return (
                    <tr key={p.id}>
                      <td><span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{p.code || '—'}</span></td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.description}</div>}
                      </td>
                      <td>
                        {p.category ? <span className="badge badge-info">{p.category.name}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="mono" style={{ fontSize: 12 }}>S/ {Number(p.unit_cost).toFixed(2)}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>S/ {Number(p.sale_price).toFixed(2)}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {m !== null && (
                          <span style={{ fontSize: 12, color: parseInt(m) > 30 ? 'var(--success)' : 'var(--warning)' }} className="mono">{m}%</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                          {lowStock && <AlertTriangle size={12} color="var(--warning)" />}
                          <span className={`badge ${lowStock ? 'badge-warning' : 'badge-success'}`}>
                            {p.stock} {p.unit}
                          </span>
                        </div>
                        {lowStock && <div style={{ fontSize: 10, color: 'var(--warning)', marginTop: 2 }}>Mín: {p.stock_minimum}</div>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(p)}><Pencil size={12} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => del(p)}><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <span className="modal-title">{editing ? 'Editar producto' : 'Nuevo producto'}</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Código</label>
                  <input className="form-input mono" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="BRA-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre del producto" />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descripción opcional" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Costo unitario (S/)</label>
                  <input className="form-input mono" type="number" step="0.01" min="0" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio de venta (S/)</label>
                  <input className="form-input mono" type="number" step="0.01" min="0" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Stock inicial</label>
                  <input className="form-input mono" type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock mínimo</label>
                  <input className="form-input mono" type="number" min="0" value={form.stock_minimum} onChange={e => setForm({ ...form, stock_minimum: e.target.value })} placeholder="0" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <select className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  {['unidad', 'par', 'paquete', 'docena', 'kg', 'metro'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !form.name}>
                {saving ? 'Guardando…' : editing ? 'Actualizar' : 'Crear producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
