import { useEffect, useState } from 'react'
import { ShoppingCart, PlusCircle, Trash2, X, Search, Check } from 'lucide-react'
import Layout from '../../components/Layout'
import api from '../../api'
import { useToast } from '../../hooks/useToast'

export default function Sales() {
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const { addToast, ToastContainer } = useToast()

  const load = () => api.get('/api/sales').then(r => setSales(r.data))
  const loadProducts = () => api.get('/api/products').then(r => setProducts(r.data))

  useEffect(() => { load(); loadProducts() }, [])

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code || '').toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id)
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
          : i)
      }
      return [...prev, {
        product_id: product.id,
        product_name: product.name,
        unit_price: Number(product.sale_price),
        quantity: 1,
        subtotal: Number(product.sale_price),
        max_stock: product.stock,
      }]
    })
  }

  const updateQty = (productId, qty) => {
    const q = parseInt(qty) || 1
    setCart(prev => prev.map(i => i.product_id === productId
      ? { ...i, quantity: Math.min(q, i.max_stock), subtotal: Math.min(q, i.max_stock) * i.unit_price }
      : i))
  }

  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product_id !== productId))

  const total = cart.reduce((s, i) => s + i.subtotal, 0)
  const totalWithDiscount = total - (parseFloat(discount) || 0)

  const confirmSale = async () => {
    if (cart.length === 0) return
    setSaving(true)
    try {
      await api.post('/api/sales', {
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })),
        discount: parseFloat(discount) || 0,
        notes,
      })
      addToast('Venta registrada exitosamente', 'success')
      setShowModal(false)
      setCart([])
      setDiscount('')
      setNotes('')
      load()
      loadProducts()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Error al registrar venta', 'error')
    } finally { setSaving(false) }
  }

  return (
    <Layout theme="theme-company">
      <ToastContainer />
      <div className="page-header">
        <div>
          <div className="page-title">Ventas</div>
          <div className="page-subtitle">{sales.length} venta(s) registrada(s)</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <PlusCircle size={14} /> Nueva venta
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {sales.length === 0 ? (
          <div className="empty-state"><ShoppingCart size={32} /><p>Sin ventas. Registra la primera.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Ítems</th>
                  <th>Descuento</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td><span className="mono" style={{ fontSize: 12 }}>#{s.id}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {new Date(s.sale_date).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {s.items.slice(0, 3).map(i => (
                          <span key={i.id} className="badge badge-info" style={{ fontSize: 11 }}>
                            {i.product?.name} ×{i.quantity}
                          </span>
                        ))}
                        {s.items.length > 3 && <span className="badge badge-accent" style={{ fontSize: 11 }}>+{s.items.length - 3}</span>}
                      </div>
                    </td>
                    <td>
                      {Number(s.discount) > 0
                        ? <span className="mono" style={{ color: 'var(--warning)', fontSize: 12 }}>-S/ {Number(s.discount).toFixed(2)}</span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 600, color: 'var(--success)' }}>
                        S/ {Number(s.total_amount).toFixed(2)}
                      </span>
                    </td>
                    <td><span className="badge badge-success">{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Sale Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 700, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: 0, overflow: 'hidden' }}>
            {/* Left: Product picker */}
            <div style={{ padding: 20, borderRight: '1px solid var(--border)', overflowY: 'auto', maxHeight: '80vh' }}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Agregar productos</div>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingLeft: 30 }} placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredProducts.map(p => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      borderRadius: 6, cursor: p.stock > 0 ? 'pointer' : 'not-allowed',
                      opacity: p.stock > 0 ? 1 : 0.4, transition: 'all 0.1s',
                    }}
                    onClick={() => p.stock > 0 && addToCart(p)}
                    onMouseEnter={e => p.stock > 0 && (e.currentTarget.style.borderColor = 'var(--accent)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stock: {p.stock}</div>
                    </div>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                      S/ {Number(p.sale_price).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Cart */}
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Carrito</div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowModal(false)}><X size={14} /></button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    Haz clic en un producto para agregarlo
                  </div>
                ) : cart.map(item => (
                  <div key={item.product_id} style={{
                    padding: '8px 10px', background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)', borderRadius: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{item.product_name}</div>
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)', padding: 3 }} onClick={() => removeFromCart(item.product_id)}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cant:</span>
                      <input
                        type="number" min="1" max={item.max_stock}
                        value={item.quantity}
                        onChange={e => updateQty(item.product_id, e.target.value)}
                        style={{ width: 56, padding: '3px 6px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                      />
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                        S/ {item.subtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <span>Subtotal</span>
                  <span className="mono">S/ {total.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>Descuento (S/)</span>
                  <input
                    type="number" min="0" max={total} step="0.50"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    placeholder="0.00"
                    style={{ width: 80, padding: '4px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--warning)', fontSize: 12, fontFamily: 'var(--font-mono)', textAlign: 'right' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginBottom: 10 }}>
                  <span>Total</span>
                  <span className="mono" style={{ color: 'var(--success)' }}>S/ {totalWithDiscount.toFixed(2)}</span>
                </div>
                <input
                  className="form-input" placeholder="Notas (opcional)" value={notes}
                  onChange={e => setNotes(e.target.value)} style={{ marginBottom: 10, fontSize: 12 }}
                />
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={confirmSale}
                  disabled={saving || cart.length === 0}
                >
                  <Check size={14} />
                  {saving ? 'Procesando…' : 'Confirmar venta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
