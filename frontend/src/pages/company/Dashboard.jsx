import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Package, AlertTriangle, DollarSign, TrendingUp, ShoppingCart } from 'lucide-react'
import Layout from '../../components/Layout'
import api from '../../api'
import { useAuth } from '../../contexts/AuthContext'

const fmt = (v) => `S/ ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`

export default function CompanyDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/inventory/dashboard')
      .then(r => setStats(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <Layout theme="theme-company">
      <div style={{ color: 'var(--text-muted)', padding: 40 }}>Cargando dashboard...</div>
    </Layout>
  )

  const CARDS = [
    { label: 'Productos activos', value: stats?.total_products ?? 0, icon: Package, color: 'var(--accent)' },
    { label: 'Stock bajo / agotado', value: stats?.low_stock_count ?? 0, icon: AlertTriangle, color: 'var(--warning)' },
    { label: 'Ventas hoy', value: fmt(stats?.total_sales_today ?? 0), icon: DollarSign, color: 'var(--success)', mono: true },
    { label: 'Ventas este mes', value: fmt(stats?.total_sales_month ?? 0), icon: TrendingUp, color: 'var(--info)', mono: true },
  ]

  return (
    <Layout theme="theme-company">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Bienvenido, {user?.full_name || user?.username}</div>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {CARDS.map(c => (
          <div key={c.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <c.icon size={16} color={c.color} />
              </div>
              <span className="stat-label" style={{ marginBottom: 0 }}>{c.label}</span>
            </div>
            <div className={`stat-value ${c.mono ? 'mono' : ''}`} style={{ fontSize: c.mono ? 20 : 28 }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top Products Chart */}
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
            TOP PRODUCTOS — ESTE MES
          </h3>
          {stats?.top_products?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.top_products} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
                  formatter={(v) => [v, 'unidades']}
                  labelStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
                  {stats.top_products.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? 'var(--accent)' : 'var(--info)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <ShoppingCart size={28} />
              <p style={{ marginTop: 8, fontSize: 13 }}>Sin ventas este mes</p>
            </div>
          )}
        </div>

        {/* Recent Sales */}
        <div className="card">
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
            VENTAS RECIENTES
          </h3>
          {stats?.recent_sales?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.recent_sales.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: 'var(--bg-elevated)',
                  borderRadius: 6, border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, background: 'var(--success-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <ShoppingCart size={12} color="var(--success)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>Venta #{s.id}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(s.date).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>
                    {fmt(s.total)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <ShoppingCart size={28} />
              <p style={{ marginTop: 8, fontSize: 13 }}>Sin ventas registradas</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
