import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Briefcase,
  CheckCircle2,
  FolderKanban,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  getAdminCategories,
  getAdminReports,
  getAdminStats,
  getAdminUsers,
  resolveAdminReport,
  suspendAdminUser,
} from '../api/adminApi';
import './Dashboard.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suspendingId, setSuspendingId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      getAdminStats(),
      getAdminUsers(),
      getAdminReports(),
      getAdminCategories(),
    ])
      .then(([statsResult, usersResult, reportsResult, categoriesResult]) => {
        if (!isMounted) {
          return;
        }

        setStats(statsResult.status === 'fulfilled' ? statsResult.value.data : null);
        setUsers(usersResult.status === 'fulfilled' ? usersResult.value.data : []);
        setReports(reportsResult.status === 'fulfilled' ? reportsResult.value.data : []);
        setCategories(categoriesResult.status === 'fulfilled' ? categoriesResult.value.data : []);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const dashboardStats = [
    {
      color: 'purple',
      icon: <Users size={22} />,
      label: 'Utilisateurs',
      value: stats?.totalUsers ?? users.length,
    },
    {
      color: 'blue',
      icon: <Briefcase size={22} />,
      label: 'Services actifs',
      value: stats?.activeServices ?? 0,
    },
    {
      color: 'green',
      icon: <ShieldCheck size={22} />,
      label: 'Commandes',
      value: stats?.totalOrders ?? 0,
    },
    {
      color: 'yellow',
      icon: <AlertTriangle size={22} />,
      label: 'Signalements ouverts',
      value: reports.filter((report) => report.status !== 'RESOLVED').length,
    },
  ];

  const handleSuspend = async (userId) => {
    setSuspendingId(userId);

    try {
      await suspendAdminUser(userId);
      setUsers((currentUsers) =>
        currentUsers.map((entry) =>
          entry.id === userId ? { ...entry, status: 'SUSPENDED' } : entry,
        ),
      );
    } finally {
      setSuspendingId(null);
    }
  };

  const handleResolve = async (reportId) => {
    const notes = window.prompt('Notes de resolution', 'Traite depuis le dashboard admin');

    if (notes === null) {
      return;
    }

    setResolvingId(reportId);

    try {
      await resolveAdminReport(reportId, notes);
      setReports((currentReports) =>
        currentReports.map((entry) =>
          entry.id === reportId
            ? { ...entry, adminNotes: notes, status: 'RESOLVED' }
            : entry,
        ),
      );
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="container">
          <div className="empty-state">
            <Loader2 size={32} className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">Pilotage de la plateforme</h1>
          <p className="dashboard-subtitle">
            Vue rapide sur l&apos;activite, les utilisateurs, les categories et les signalements.
          </p>
        </div>

        <div className="dashboard-stats stagger">
          {dashboardStats.map((stat) => (
            <div className="dash-stat-card animate-fade-in-up" key={stat.label}>
              <div className={`dash-stat-icon ${stat.color}`}>{stat.icon}</div>
              <div className="dash-stat-info">
                <span className="dash-stat-value">{stat.value}</span>
                <span className="dash-stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        <section className="animate-fade-in-up" style={{ marginBottom: 'var(--space-8)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>Categories disponibles</h2>
            <span className="badge badge-primary">{categories.length} categories</span>
          </div>

          <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {categories.length > 0 ? (
              categories.map((category) => (
                <div
                  key={category.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '9999px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <FolderKanban size={16} />
                  <span>{category.name}</span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>
                Aucune categorie n&apos;est encore definie.
              </p>
            )}
          </div>
        </section>

        <section className="animate-fade-in-up" style={{ marginBottom: 'var(--space-8)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>Utilisateurs recents</h2>
            <span className="badge badge-primary">{users.length} comptes</span>
          </div>

          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.slice(0, 8).map((entry) => (
                  <tr key={entry.id}>
                    <td className="td-title">{entry.email}</td>
                    <td>{entry.role}</td>
                    <td>
                      <span className={`badge ${entry.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td>{new Date(entry.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td>
                      {entry.status === 'ACTIVE' ? (
                        <button
                          className="btn btn-sm btn-delete"
                          disabled={suspendingId === entry.id}
                          onClick={() => handleSuspend(entry.id)}
                        >
                          {suspendingId === entry.id ? (
                            <Loader2 size={14} className="spinner" />
                          ) : (
                            <Ban size={14} />
                          )}
                          Suspendre
                        </button>
                      ) : (
                        <span className="badge badge-warning">Suspendu</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="animate-fade-in-up">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>Signalements</h2>
            <span className="badge badge-primary">{reports.length} entrees</span>
          </div>

          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Cible</th>
                  <th>Raison</th>
                  <th>Statut</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.length > 0 ? (
                  reports.slice(0, 8).map((entry) => (
                    <tr key={entry.id}>
                      <td className="td-title">
                        {entry.targetType} #{entry.targetId}
                      </td>
                      <td>{entry.reason}</td>
                      <td>
                        <span className={`badge ${entry.status === 'RESOLVED' ? 'badge-success' : 'badge-warning'}`}>
                          {entry.status}
                        </span>
                      </td>
                      <td>{new Date(entry.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td>
                        {entry.status === 'RESOLVED' ? (
                          <span className="badge badge-success">
                            <CheckCircle2 size={12} />
                            Resolus
                          </span>
                        ) : (
                          <button
                            className="btn btn-sm btn-accept"
                            disabled={resolvingId === entry.id}
                            onClick={() => handleResolve(entry.id)}
                          >
                            {resolvingId === entry.id ? (
                              <Loader2 size={14} className="spinner" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            Marquer comme resolu
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ color: 'var(--text-muted)' }}>
                      Aucun signalement pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
