import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Users, Package, ShoppingCart, TrendingUp, PlusCircle } from 'lucide-react'
import Layout from '../../components/Layout'
import api from '../../api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [companies, setCompanies] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/api/admin/companies/stats/summary').then(r => setStats(r.data)).catch(() => {})
    api.get('/api/admin/companies').then(r => setCompanies(r.data.slice(0, 5))).catch(() => {})
  }, [])

  const STAT_CARDS = [
    { label: 'Empresas registradas', value: stats?.total_companies ?? '—', sub: `${stats?.active_companies ?? 0} activas`, icon: Building2, color: 'var(--accent)' },
    { label: 'Usuarios totales', value: stats?.total_users ?? '—', icon: Users, color: 'var(--info)' },
    { label: 'Productos registrados', value: stats?.total_products ?? '—', icon: Package, color: 'var(--warning)' },
    { label: 'Ventas registradas', value: stats?.total_sales ?? '—', icon: ShoppingCart, color: 'var(--success)' },
  ]

  return (
    <Layout isAdmin>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Resumen general del sistema</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/companies')}>
          <PlusCircle size={14} /> Nueva empresa
        </button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {STAT_CARDS.map(c => (
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
            <div className="stat-value">{c.value}</div>
            {c.sub && <div className="stat-sub">{c.sub}</div>}
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Empresas recientes</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/companies')}>Ver todas</button>
        </div>
        {companies.length === 0 ? (
          <div className="empty-state"><Building2 size={32} /><p>Sin empresas registradas</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>RUC</th>
                  <th>Plan</th>
                  <th>Estado</th>
                  <th>Creada</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/admin/companies')}>
                    <td><span style={{ fontWeight: 500 }}>{c.name}</span></td>
                    <td><span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.ruc || '—'}</span></td>
                    <td><span className="badge badge-accent">{c.plan}</span></td>
                    <td>
                      <span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {c.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                      {new Date(c.created_at).toLocaleDateString('es-PE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
