import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Search, Trash2, Plus, Minus, X,
  Printer, CheckCircle, LogOut, Package, Tag,
  ClipboardList, Lock, Banknote, Smartphone,
  ArrowRightLeft, CreditCard, QrCode
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import { useToast } from '../../hooks/useToast'

// ─── Métodos de pago ──────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: 'efectivo',      label: 'Efectivo',      icon: Banknote,       color: '#3fb950' },
  { key: 'yape',          label: 'Yape',          icon: Smartphone,     color: '#7c3aed' },
  { key: 'plin',          label: 'Plin',          icon: QrCode,         color: '#0ea5e9' },
  { key: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft, color: '#f59e0b' },
  { key: 'izipay',        label: 'Izipay',        icon: CreditCard,     color: '#ef4444' },
]

const PM_MAP = Object.fromEntries(PAYMENT_METHODS.map(p => [p.key, p]))

// ─── Boleta HTML ──────────────────────────────────────────────────────────────
function buildBoletaHTML(sale, items, companyName, cashier, paymentMethod, logoUrl = null) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })
  const timeStr = now.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })
  const subtotal = items.reduce((s,i) => s + Number(i.subtotal), 0)
  const igv = subtotal * 0.18
  const base = subtotal - igv
  const pm = PM_MAP[paymentMethod] || PM_MAP['efectivo']

  const rows = items.map(i => `
    <tr>
      <td style="padding:3px 0;font-size={12}px;">${i.product_name}</td>
      <td style="text-align:center;font-size={12}px;">${i.quantity}</td>
      <td style="text-align:right;font-size={12}px;">S/${Number(i.unit_price).toFixed(2)}</td>
      <td style="text-align:right;font-size={12}px;font-weight:600;">S/${Number(i.subtotal).toFixed(2)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Boleta #${sale.id}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;width:80mm;margin:0 auto;padding:8px;font-size={12}px;color:#000}
  .center{text-align:center}.bold{font-weight:bold}
  .dash{border-top:1px dashed #000;margin:6px 0}
  .solid{border-top:2px solid #000;margin:6px 0}
  table{width:100%;border-collapse:collapse}
  th{font-size={11}px;padding:2px 0;border-bottom:1px dashed #000;text-align:left}
  th:nth-child(2){text-align:center}
  th:nth-child(3),th:nth-child(4){text-align:right}
  @media print{body{width:80mm}@page{margin:0;size:80mm auto}}
</style></head><body>
  <div class="center bold" style="font-size:15px;margin-bottom:2px;">${companyName}</div>
  <div class="center" style="font-size={11}px;">Boleta de Venta Electrónica</div>
  <div class="solid"></div>
  <div style="font-size={11}px;">
    <div><b>N°</b> ${String(sale.id).padStart(8,'0')}</div>
    <div><b>Fecha:</b> ${dateStr} ${timeStr}</div>
    <div><b>Cajero/a:</b> ${cashier}</div>
    <div><b>Pago:</b> ${pm.label}</div>
  </div>
  <div class="dash"></div>
  <table>
    <thead><tr>
      <th>DESCRIPCIÓN</th><th style="text-align:center">CANT</th>
      <th style="text-align:right">P.U.</th><th style="text-align:right">TOTAL</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="dash"></div>
  <table>
    <tr><td style="font-size={11}px;">OP. GRAVADA</td><td style="text-align:right;font-size={11}px;">S/${base.toFixed(2)}</td></tr>
    <tr><td style="font-size={11}px;">IGV (18%)</td><td style="text-align:right;font-size={11}px;">S/${igv.toFixed(2)}</td></tr>
    ${Number(sale.discount)>0?`<tr><td style="font-size={11}px;color:#c00;">DESCUENTO</td><td style="text-align:right;font-size={11}px;color:#c00;">-S/${Number(sale.discount).toFixed(2)}</td></tr>`:''}
    <tr><td style="padding-top:6px;border-top:1px solid #000;font-weight:bold;font-size={13}px;">TOTAL</td>
        <td style="text-align:right;padding-top:6px;border-top:1px solid #000;font-weight:bold;font-size:15px;">S/${Number(sale.total_amount).toFixed(2)}</td></tr>
  </table>
  <div class="dash"></div>
  <div class="center" style="font-size={11}px;">
    <div>*** GRACIAS POR SU COMPRA ***</div>
    <div style="margin-top:3px;font-size:10px;">Documento no tiene valor tributario</div>
  </div>
  <script>window.onload=()=>{window.print()}</script>
</body></html>`
}

// ─── Reporte de cierre HTML ───────────────────────────────────────────────────
function buildCierreHTML(cierre, companyName, cashier) {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })
  const methods = Object.entries(cierre.por_metodo || {})

  const methodRows = methods.map(([key, data]) => {
    const pm = PM_MAP[key] || { label: key }
    return `<tr>
      <td style="padding:4px 0;font-size={12}px;">${pm.label}</td>
      <td style="text-align:center;font-size={12}px;">${data.count}</td>
      <td style="text-align:right;font-size={13}px;font-weight:bold;">S/${data.total.toFixed(2)}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Cierre de Caja</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;width:80mm;margin:0 auto;padding:8px;color:#000}
  .center{text-align:center}.bold{font-weight:bold}
  .dash{border-top:1px dashed #000;margin:6px 0}
  .solid{border-top:2px solid #000;margin:6px 0}
  table{width:100%;border-collapse:collapse}
  @media print{body{width:80mm}@page{margin:0;size:80mm auto}}
</style></head><body>
  <div class="center bold" style="font-size:14px;">${companyName}</div>
  <div class="center bold" style="font-size={12}px;margin-top:2px;">═══ CIERRE DE CAJA ═══</div>
  <div class="solid"></div>
  <div style="font-size={11}px;">
    <div><b>Fecha:</b> ${cierre.fecha}</div>
    <div><b>Hora cierre:</b> ${timeStr}</div>
    <div><b>Cajero/a:</b> ${cashier}</div>
  </div>
  <div class="dash"></div>
  <div class="bold" style="font-size={11}px;margin-bottom:4px;">RESUMEN POR MÉTODO DE PAGO</div>
  <table>
    <thead><tr>
      <th>MÉTODO</th><th style="text-align:center">VENTAS</th><th style="text-align:right">MONTO</th>
    </tr></thead>
    <tbody>${methodRows}</tbody>
  </table>
  <div class="dash"></div>
  <table>
    <tr><td style="font-size={11}px;">Total transacciones</td><td style="text-align:right;font-size={11}px;">${cierre.total_ventas}</td></tr>
    <tr><td style="font-size={11}px;">Total ítems vendidos</td><td style="text-align:right;font-size={11}px;">${cierre.total_items}</td></tr>
    <tr><td style="font-size={11}px;">Total descuentos</td><td style="text-align:right;font-size={11}px;color:#c00;">-S/${Number(cierre.total_descuentos).toFixed(2)}</td></tr>
  </table>
  <div class="solid"></div>
  <table>
    <tr>
      <td style="font-weight:bold;font-size:14px;">TOTAL CAJA</td>
      <td style="text-align:right;font-weight:bold;font-size:18px;">S/${Number(cierre.total_general).toFixed(2)}</td>
    </tr>
  </table>
  <div class="dash"></div>
  <div class="center" style="font-size:10px;">Reporte generado automáticamente</div>
  <script>window.onload=()=>{window.print()}</script>
</body></html>`
}

// ─── POS Principal ────────────────────────────────────────────────────────────
export default function POS() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { addToast, ToastContainer } = useToast()

  const [tab, setTab]               = useState('venta')   // venta | historial | cierre
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [catFilter, setCatFilter]   = useState('all')
  const [search, setSearch]         = useState('')
  const [cart, setCart]             = useState([])
  const [discount, setDiscount]     = useState('')
  const [payMethod, setPayMethod]   = useState('efectivo')
  const [saving, setSaving]         = useState(false)
  const [lastSale, setLastSale]     = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Historial + cierre
  const [company, setCompany]       = useState(null)
  const [todaySales, setTodaySales] = useState([])
  const [cierre, setCierre]         = useState(null)
  const [loadingTab, setLoadingTab] = useState(false)

  const companyName = company?.name || 'Mi Empresa'

  const loadProducts = () => {
    api.get('/api/products').then(r => setProducts(r.data))
    api.get('/api/inventory/categories').then(r => setCategories(r.data))
  }
  useEffect(() => {
    api.get('/api/inventory/company-info').then(r => setCompany(r.data)).catch(()=>{})
  }, [])
  useEffect(() => { loadProducts() }, [])

  const loadToday = async () => {
    setLoadingTab(true)
    try {
      const r = await api.get('/api/sales/today')
      setTodaySales(r.data)
    } finally { setLoadingTab(false) }
  }

  const loadCierre = async () => {
    setLoadingTab(true)
    try {
      const r = await api.get('/api/sales/cierre')
      setCierre(r.data)
    } finally { setLoadingTab(false) }
  }

  const handleTab = (t) => {
    setTab(t)
    if (t === 'historial') loadToday()
    if (t === 'cierre') loadCierre()
  }

  // ─── Cart logic ──────────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const matchCat = catFilter === 'all' || String(p.category_id) === catFilter
    const matchQ   = p.name.toLowerCase().includes(search.toLowerCase()) ||
                     (p.code||'').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchQ && p.stock > 0
  })

  const addToCart = (product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product_id === product.id)
      if (ex) {
        if (ex.quantity >= product.stock) { addToast(`Stock máximo: ${product.stock}`, 'error'); return prev }
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity+1, subtotal: (i.quantity+1)*i.unit_price } : i)
      }
      return [...prev, {
        product_id: product.id, product_name: product.name,
        unit_price: Number(product.sale_price), quantity: 1,
        subtotal: Number(product.sale_price), max_stock: product.stock,
      }]
    })
  }

  const changeQty = (id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product_id !== id) return i
      const q = i.quantity + delta
      if (q <= 0) return null
      if (q > i.max_stock) { addToast(`Máx: ${i.max_stock}`, 'error'); return i }
      return { ...i, quantity: q, subtotal: q * i.unit_price }
    }).filter(Boolean))
  }

  const removeItem  = (id) => setCart(prev => prev.filter(i => i.product_id !== id))
  const clearCart   = () => { setCart([]); setDiscount('') }

  const subtotal    = cart.reduce((s,i) => s + i.subtotal, 0)
  const discountVal = Math.min(parseFloat(discount)||0, subtotal)
  const total       = subtotal - discountVal

  // ─── Confirm sale ─────────────────────────────────────────────────────────────
  const confirmSale = async () => {
    if (!cart.length) return
    setSaving(true)
    try {
      const res = await api.post('/api/sales', {
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })),
        discount: discountVal,
        payment_method: payMethod,
        notes: '',
      })
      setLastSale({ sale: res.data, items: [...cart], discount: discountVal, payMethod })
      setShowSuccess(true)
      clearCart()
      setPayMethod('efectivo')
      loadProducts()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Error al registrar venta', 'error')
    } finally { setSaving(false) }
  }

  const printBoleta = (saleData) => {
    const s = saleData || lastSale
    if (!s) return
    const html = buildBoletaHTML(s.sale, s.items, companyName, user?.full_name || user?.username, s.payMethod || s.sale?.payment_method || 'efectivo', company?.logo_url)
    const w = window.open('', '_blank', 'width=420,height=620')
    w.document.write(html); w.document.close()
  }

  const printCierre = () => {
    if (!cierre) return
    const html = buildCierreHTML(cierre, companyName, user?.full_name || user?.username)
    const w = window.open('', '_blank', 'width=420,height=680')
    w.document.write(html); w.document.close()
  }

  const handleLogout = () => { logout(); navigate('/login') }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'var(--bg-base)', overflow:'hidden' }} className="theme-company">
      <ToastContainer />

      {/* ── Topbar ── */}
      <header style={{
        height:50, background:'var(--bg-surface)', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', padding:'0 16px', gap:10, flexShrink:0,
      }}>
        <div style={{ width:28, height:28, background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ShoppingCart size={14} color="var(--accent)" />
        </div>
        <span style={{ fontWeight:700, fontSize:14 }}>Punto de Venta</span>
        <span style={{ padding:'2px 8px', background:'var(--accent-dim)', color:'var(--accent)', borderRadius:99, fontSize:10, fontWeight:700, border:'1px solid var(--accent)' }}>CAJA</span>

        {/* Tabs */}
        <div style={{ marginLeft:16, display:'flex', gap:2 }}>
          {[
            { key:'venta',     label:'Nueva Venta',    icon:ShoppingCart },
            { key:'historial', label:'Historial Hoy',  icon:ClipboardList },
            { key:'cierre',    label:'Cerrar Caja',    icon:Lock },
          ].map(t => (
            <button key={t.key} onClick={() => handleTab(t.key)}
              style={{
                display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
                borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:500,
                background: tab === t.key ? 'var(--accent-dim)' : 'transparent',
                color: tab === t.key ? 'var(--accent)' : 'var(--text-secondary)',
                transition:'all 0.12s',
              }}>
              <t.icon size={13} />{t.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{user?.full_name || user?.username}</span>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ gap:5 }}>
            <LogOut size={12} /> Salir
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════
          TAB: NUEVA VENTA
      ══════════════════════════════════════════════════ */}
      {tab === 'venta' && (
        <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

          {/* LEFT — Productos */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid var(--border)' }}>
            {/* Búsqueda */}
            <div style={{ padding:'10px 12px', background:'var(--bg-surface)', borderBottom:'1px solid var(--border)', display:'flex', gap:8 }}>
              <div style={{ position:'relative', flex:1 }}>
                <Search size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingLeft:28, height:34 }} placeholder="Buscar producto…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            {/* Categorías */}
            <div style={{ display:'flex', gap:6, padding:'7px 12px', overflowX:'auto', background:'var(--bg-surface)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              {[{ id:'all', name:'Todos' }, ...categories].map(c => (
                <button key={c.id} onClick={() => setCatFilter(String(c.id))} style={{
                  padding:'3px 10px', borderRadius:99, border:'1px solid',
                  borderColor: catFilter===String(c.id) ? 'var(--accent)' : 'var(--border)',
                  background: catFilter===String(c.id) ? 'var(--accent-dim)' : 'transparent',
                  color: catFilter===String(c.id) ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize:11, fontWeight:500, cursor:'pointer', whiteSpace:'nowrap',
                }}>{c.name}</button>
              ))}
            </div>
            {/* Grid */}
            <div style={{ flex:1, overflowY:'auto', padding:12, display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:8, alignContent:'start' }}>
              {filtered.length === 0
                ? <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}><Package size={28} style={{ opacity:0.2, marginBottom:8 }} /><div style={{ fontSize:13 }}>Sin productos</div></div>
                : filtered.map(p => (
                <button key={p.id} onClick={() => addToCart(p)} style={{
                  background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:10,
                  padding:'10px 8px', cursor:'pointer', textAlign:'left', transition:'all 0.12s',
                  display:'flex', flexDirection:'column', gap:5,
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.transform='translateY(-1px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='' }}
                >
                  <div style={{ width:'100%', height:44, background:'var(--accent-dim)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Tag size={18} color="var(--accent)" style={{ opacity:0.7 }} />
                  </div>
                  <div style={{ fontSize:11, fontWeight:600, lineHeight:1.3 }}>{p.name}</div>
                  {p.code && <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{p.code}</div>}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--accent)', fontFamily:'var(--font-mono)' }}>S/{Number(p.sale_price).toFixed(2)}</span>
                    <span style={{ fontSize:10, padding:'1px 5px', borderRadius:99, background: p.stock<=5?'var(--warning-dim)':'var(--success-dim)', color: p.stock<=5?'var(--warning)':'var(--success)' }}>{p.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT — Carrito */}
          <div style={{ width:320, display:'flex', flexDirection:'column', background:'var(--bg-surface)', flexShrink:0 }}>
            {/* Header carrito */}
            <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <ShoppingCart size={14} color="var(--accent)" />
              <span style={{ fontWeight:600, fontSize:13 }}>Carrito</span>
              <span style={{ background:'var(--accent)', color:'#0d1117', borderRadius:99, width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>
                {cart.reduce((s,i)=>s+i.quantity,0)}
              </span>
              {cart.length>0 && <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto', color:'var(--danger)', fontSize:11 }} onClick={clearCart}><X size={11}/> Limpiar</button>}
            </div>

            {/* Items */}
            <div style={{ flex:1, overflowY:'auto', padding:'8px 10px', display:'flex', flexDirection:'column', gap:5 }}>
              {cart.length === 0
                ? <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)' }}><ShoppingCart size={28} style={{ opacity:0.2, marginBottom:8 }}/><div style={{ fontSize:12 }}>Agrega productos</div></div>
                : cart.map(item => (
                <div key={item.product_id} style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:7, padding:'8px 10px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:5, marginBottom:6 }}>
                    <div style={{ flex:1, fontSize:12, fontWeight:600, lineHeight:1.3 }}>{item.product_name}</div>
                    <button onClick={() => removeItem(item.product_id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', padding:2 }}><X size={12}/></button>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ display:'flex', alignItems:'center', background:'var(--bg-surface)', borderRadius:5, border:'1px solid var(--border)', overflow:'hidden' }}>
                      <button onClick={() => changeQty(item.product_id,-1)} style={{ width:24, height:24, background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center' }}><Minus size={11}/></button>
                      <span style={{ width:28, textAlign:'center', fontSize:12, fontWeight:700, fontFamily:'var(--font-mono)' }}>{item.quantity}</span>
                      <button onClick={() => changeQty(item.product_id,+1)} style={{ width:24, height:24, background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center' }}><Plus size={11}/></button>
                    </div>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>×S/{item.unit_price.toFixed(2)}</span>
                    <span style={{ marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize:12, fontWeight:700 }}>S/{item.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)', background:'var(--bg-elevated)' }}>
              {/* Método de pago */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>Método de pago</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                  {PAYMENT_METHODS.map(pm => (
                    <button key={pm.key} onClick={() => setPayMethod(pm.key)} style={{
                      display:'flex', alignItems:'center', gap:5, padding:'6px 8px',
                      borderRadius:6, border:'1px solid',
                      borderColor: payMethod===pm.key ? pm.color : 'var(--border)',
                      background: payMethod===pm.key ? `${pm.color}18` : 'var(--bg-surface)',
                      color: payMethod===pm.key ? pm.color : 'var(--text-secondary)',
                      fontSize:11, fontWeight:500, cursor:'pointer', transition:'all 0.1s',
                    }}>
                      <pm.icon size={12}/>{pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtotal + descuento */}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-secondary)', marginBottom:5 }}>
                <span>Subtotal</span><span className="mono">S/{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                <span style={{ fontSize:11, color:'var(--text-secondary)', flex:1 }}>Descuento (S/)</span>
                <input type="number" min="0" step="0.5" placeholder="0.00" value={discount} onChange={e => setDiscount(e.target.value)}
                  style={{ width:70, padding:'4px 7px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:4, color:'var(--warning)', fontFamily:'var(--font-mono)', fontSize:12, textAlign:'right' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderTop:'1px solid var(--border)', marginBottom:10 }}>
                <span style={{ fontSize:15, fontWeight:700 }}>TOTAL</span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:20, fontWeight:800, color:'var(--accent)' }}>S/{total.toFixed(2)}</span>
              </div>
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'11px', fontSize:13, fontWeight:700 }}
                onClick={confirmSale} disabled={saving||!cart.length}>
                {saving ? 'Procesando…' : <><CheckCircle size={15}/> Cobrar S/{total.toFixed(2)}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: HISTORIAL HOY
      ══════════════════════════════════════════════════ */}
      {tab === 'historial' && (
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700 }}>Ventas de hoy</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'})}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost btn-sm" onClick={loadToday}>↻ Actualizar</button>
            </div>
          </div>

          {loadingTab
            ? <div style={{ color:'var(--text-muted)', textAlign:'center', padding:40 }}>Cargando…</div>
            : todaySales.length === 0
              ? <div className="empty-state"><ClipboardList size={32}/><p style={{ marginTop:8 }}>Sin ventas registradas hoy</p></div>
              : <>
                {/* Resumen rápido */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:16 }}>
                  {[
                    { label:'Ventas', value: todaySales.length, color:'var(--info)' },
                    { label:'Total S/', value: `S/${todaySales.reduce((s,v)=>s+Number(v.total_amount),0).toFixed(2)}`, color:'var(--success)', mono:true },
                    { label:'Ítems vendidos', value: todaySales.reduce((s,v)=>s+v.items.reduce((a,i)=>a+i.quantity,0),0), color:'var(--accent)' },
                  ].map(c => (
                    <div key={c.label} className="stat-card" style={{ padding:'12px 14px' }}>
                      <div style={{ fontSize:11, color:'var(--text-secondary)', marginBottom:4 }}>{c.label}</div>
                      <div className={c.mono?'mono':''} style={{ fontSize:18, fontWeight:700, color:c.color }}>{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* Lista */}
                <div className="card" style={{ padding:0, overflow:'hidden' }}>
                  <table>
                    <thead><tr>
                      <th>#</th><th>Hora</th><th>Productos</th><th>Pago</th><th style={{ textAlign:'right' }}>Total</th><th></th>
                    </tr></thead>
                    <tbody>
                      {todaySales.map(s => {
                        const pm = PM_MAP[s.payment_method] || { label: s.payment_method, color:'var(--text-secondary)' }
                        return (
                          <tr key={s.id}>
                            <td><span className="mono" style={{ fontSize:11 }}>#{s.id}</span></td>
                            <td style={{ fontSize:12, color:'var(--text-secondary)' }}>{new Date(s.sale_date).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</td>
                            <td>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                                {s.items.slice(0,3).map(i => (
                                  <span key={i.id} className="badge badge-info" style={{ fontSize:10 }}>{i.product?.name} ×{i.quantity}</span>
                                ))}
                                {s.items.length>3 && <span className="badge badge-accent" style={{ fontSize:10 }}>+{s.items.length-3}</span>}
                              </div>
                            </td>
                            <td>
                              <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color: pm.color, fontWeight:500 }}>
                                {pm.label}
                              </span>
                            </td>
                            <td style={{ textAlign:'right' }}>
                              <span className="mono" style={{ fontWeight:700, color:'var(--success)' }}>S/{Number(s.total_amount).toFixed(2)}</span>
                            </td>
                            <td>
                              <button className="btn btn-ghost btn-icon btn-sm" title="Reimprimir boleta"
                                onClick={() => {
                                  const items = s.items.map(i => ({ product_name: i.product?.name||'Producto', unit_price: i.unit_price, quantity: i.quantity, subtotal: i.subtotal }))
                                  printBoleta({ sale: s, items, payMethod: s.payment_method })
                                }}>
                                <Printer size={12}/>
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
          }
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB: CERRAR CAJA
      ══════════════════════════════════════════════════ */}
      {tab === 'cierre' && (
        <div style={{ flex:1, overflowY:'auto', padding:20, maxWidth:600, margin:'0 auto', width:'100%' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700 }}>Cierre de Caja</div>
              <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost btn-sm" onClick={loadCierre}>↻ Actualizar</button>
              <button className="btn btn-primary btn-sm" onClick={printCierre} disabled={!cierre}>
                <Printer size={13}/> Imprimir reporte
              </button>
            </div>
          </div>

          {loadingTab
            ? <div style={{ color:'var(--text-muted)', textAlign:'center', padding:40 }}>Calculando…</div>
            : !cierre
              ? <div className="empty-state"><Lock size={32}/><p style={{ marginTop:8 }}>Cargando datos de caja…</p></div>
              : <>
                {/* Total grande */}
                <div className="card" style={{ textAlign:'center', marginBottom:16, padding:'24px 20px', background:'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)' }}>
                  <div style={{ fontSize:12, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Total recaudado hoy</div>
                  <div className="mono" style={{ fontSize:40, fontWeight:800, color:'var(--success)' }}>S/{Number(cierre.total_general).toFixed(2)}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>
                    {cierre.total_ventas} venta(s) · {cierre.total_items} ítem(s) vendido(s)
                    {cierre.total_descuentos>0 && ` · S/${Number(cierre.total_descuentos).toFixed(2)} en descuentos`}
                  </div>
                </div>

                {/* Por método de pago */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Desglose por método de pago</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {Object.keys(cierre.por_metodo).length === 0
                      ? <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:20 }}>Sin ventas hoy</div>
                      : Object.entries(cierre.por_metodo).map(([key, data]) => {
                          const pm = PM_MAP[key] || { label:key, color:'var(--text-secondary)', icon: Banknote }
                          const pct = cierre.total_general > 0 ? (data.total / cierre.total_general * 100) : 0
                          return (
                            <div key={key} className="card" style={{ padding:'14px 16px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                                <div style={{ width:32, height:32, borderRadius:8, background:`${pm.color}18`, border:`1px solid ${pm.color}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                  <pm.icon size={14} color={pm.color}/>
                                </div>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontWeight:600, fontSize:13 }}>{pm.label}</div>
                                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>{data.count} transacción(es)</div>
                                </div>
                                <div className="mono" style={{ fontSize:18, fontWeight:700, color:pm.color }}>S/{data.total.toFixed(2)}</div>
                              </div>
                              {/* Progress bar */}
                              <div style={{ height:4, background:'var(--bg-elevated)', borderRadius:2, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${pct}%`, background:pm.color, borderRadius:2, transition:'width 0.4s' }}/>
                              </div>
                              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3, textAlign:'right' }}>{pct.toFixed(0)}% del total</div>
                            </div>
                          )
                        })
                    }
                  </div>
                </div>

                {/* Botón cerrar */}
                <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:13, fontWeight:700 }} onClick={printCierre}>
                  <Printer size={15}/> Imprimir y cerrar caja
                </button>
              </>
          }
        </div>
      )}

      {/* ── Modal éxito ── */}
      {showSuccess && lastSale && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:360, textAlign:'center' }}>
            <div style={{ width:56, height:56, background:'var(--success-dim)', border:'2px solid var(--success)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
              <CheckCircle size={28} color="var(--success)"/>
            </div>
            <div style={{ fontSize:17, fontWeight:700, marginBottom:3 }}>¡Venta registrada!</div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:3 }}>Boleta N° {String(lastSale.sale.id).padStart(8,'0')}</div>
            {(() => { const pm = PM_MAP[lastSale.payMethod]||PM_MAP['efectivo']; return (
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:99, background:`${pm.color}18`, color:pm.color, fontSize:12, fontWeight:600, marginBottom:12, border:`1px solid ${pm.color}` }}>
                <pm.icon size={12}/>{pm.label}
              </div>
            )})()}
            <div className="mono" style={{ fontSize:26, fontWeight:800, color:'var(--success)', marginBottom:16 }}>S/{Number(lastSale.sale.total_amount).toFixed(2)}</div>
            {/* Items */}
            <div style={{ background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:7, padding:'8px 12px', marginBottom:16, textAlign:'left' }}>
              {lastSale.items.map(i => (
                <div key={i.product_id} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'2px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                  <span>{i.product_name} ×{i.quantity}</span>
                  <span className="mono">S/{i.subtotal.toFixed(2)}</span>
                </div>
              ))}
              {lastSale.discount>0 && (
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0', color:'var(--warning)' }}>
                  <span>Descuento</span><span className="mono">-S/{lastSale.discount.toFixed(2)}</span>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={() => setShowSuccess(false)}>Nueva venta</button>
              <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={() => { printBoleta(); setShowSuccess(false) }}>
                <Printer size={13}/> Boleta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
