import { useEffect, useState } from 'react'
import { Boxes, PlusCircle, X, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react'
import Layout from '../../components/Layout'
import api from '../../api'
import { useToast } from '../../hooks/useToast'

const TYPE_MAP = {
  in:         { label: 'Entrada',     color: 'var(--success)', icon: ArrowUpCircle },
  out:        { label: 'Salida',      color: 'var(--danger)',  icon: ArrowDownCircle },
  adjustment: { label: 'Ajuste',      color: 'var(--warning)', icon: RefreshCw },
}

export default function Inventory() {
  const [movements, setMovements] = useState([])
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ product_id: '', movement_type: 'in', quantity: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const { addToast, ToastContainer } = useToast()

  const load = () => {
    api.get('/api/inventory/movements').then(r => setMovements(r.data))
    api.get('/api/products').then(r => setProducts(r.data))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.post('/api/inventory/movements', {
        ...form,
        product_id: parseInt(form.product_id),
        quantity: parseInt(form.quantity),
      })
      addToast('Movimiento registrado', 'success')
      setShowModal(false)
      setForm({ product_id: '', movement_type: 'in', quantity: '', reason: '' })
      load()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Error al registrar', 'error')
    } finally { setSaving(false) }
  }

  // Stock level indicator
  const getStockStatus = (p) => {
    if (p.stock === 0) return { label: 'Agotado', cls: 'badge-danger' }
    if (p.stock <= p.stock_minimum) return { label: 'Bajo', cls: 'badge-warning' }
    return { label: 'OK', cls: 'badge-success' }
  }

  return (
    <Layout theme="theme-company">
      <ToastContainer />
      <div className="page-header">
        <div>
          <div className="page-title">Inventario</div>
          <div className="page-subtitle">Movimientos y niveles de stock</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={14} /> Registrar movimiento
        </button>
      </div>

      {/* Stock overview */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Estado del stock
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {products.map(p => {
            const status = getStockStatus(p)
            return (
              <div key={p.id} style={{
                padding: '10px 12px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', borderRadius: 6,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div>
                  {p.code && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.code}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{p.stock}</div>
                  <span className={`badge ${status.cls}`} style={{ fontSize: 10 }}>{status.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Movements history */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 13 }}>
          Historial de movimientos
        </div>
        {movements.length === 0 ? (
          <div className="empty-state"><Boxes size={32} /><p>Sin movimientos registrados.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Producto</th>
                  <th style={{ textAlign: 'right' }}>Cantidad</th>
                  <th style={{ textAlign: 'right' }}>Stock anterior</th>
                  <th style={{ textAlign: 'right' }}>Stock nuevo</th>
                  <th>Motivo</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movements.map(m => {
                  const t = TYPE_MAP[m.movement_type] || TYPE_MAP.adjustment
                  const Icon = t.icon
                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Icon size={14} color={t.color} />
                          <span style={{ fontSize: 12, color: t.color, fontWeight: 500 }}>{t.label}</span>
                        </div>
                      </td>
                      <td>
                        {products.find(p => p.id === m.product_id)?.name || `Producto #${m.product_id}`}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="mono" style={{ color: t.color, fontWeight: 600 }}>
                          {m.movement_type === 'out' ? '-' : m.movement_type === 'adjustment' ? '=' : '+'}{m.quantity}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.previous_stock ?? '—'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{m.new_stock ?? '—'}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.reason || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(m.created_at).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Movement Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">Registrar movimiento</span>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Producto *</label>
                <select className="form-input" value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })}>
                  <option value="">Seleccionar producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo de movimiento *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(TYPE_MAP).map(([key, t]) => (
                    <button
                      key={key}
                      className="btn btn-ghost"
                      style={{
                        flex: 1, justifyContent: 'center',
                        borderColor: form.movement_type === key ? t.color : 'var(--border)',
                        color: form.movement_type === key ? t.color : 'var(--text-secondary)',
                        background: form.movement_type === key ? `${t.color}18` : '',
                      }}
                      onClick={() => setForm({ ...form, movement_type: key })}
                    >
                      <t.icon size={13} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  {form.movement_type === 'adjustment' ? 'Nuevo stock total *' : 'Cantidad *'}
                </label>
                <input
                  className="form-input mono" type="number" min="0"
                  value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                  placeholder={form.movement_type === 'adjustment' ? 'Ej: 50 (stock final)' : 'Ej: 10'}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Motivo / Referencia</label>
                <input
                  className="form-input" value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="Ej: Compra proveedor, conteo físico..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={saving || !form.product_id || !form.quantity}
              >
                {saving ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
