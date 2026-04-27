import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { getAdminReports, resolveAdminReport } from '../api/adminApi';
import { formatAdminDate, getAdminBadgeClass } from '../utils/adminMeta';
import './Dashboard.css';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    getAdminReports()
      .then((response) => {
        if (isMounted) setReports(response.data);
      })
      .catch(() => {
        if (isMounted) setReports([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleResolve = async (reportId) => {
    const notes = window.prompt('Notes de resolution', 'Traite depuis le dashboard admin');

    if (notes === null) return;

    setResolvingId(reportId);
    try {
      await resolveAdminReport(reportId, notes);
      setReports((currentReports) =>
        currentReports.map((entry) =>
          entry.id === reportId ? { ...entry, adminNotes: notes, status: 'RESOLVED' } : entry,
        ),
      );
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <AlertTriangle size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Signalements
          </h1>
          <p className="dashboard-subtitle">Traitez les abus signales par les utilisateurs.</p>
        </div>

        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <span className="admin-kicker">
                <AlertTriangle size={15} /> Signalements
              </span>
              <h2>Moderation des abus</h2>
            </div>
            <span className="badge badge-primary">{reports.length} entrees</span>
          </div>

          {loading ? (
            <div className="empty-state">
              <Loader2 size={32} className="spinner" />
            </div>
          ) : (
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
                    reports.map((entry) => (
                      <tr key={entry.id}>
                        <td className="td-title">
                          {entry.targetType} #{entry.targetId}
                        </td>
                        <td>{entry.reason}</td>
                        <td>
                          <span className={`badge ${getAdminBadgeClass(entry.status)}`}>{entry.status}</span>
                        </td>
                        <td>{formatAdminDate(entry.createdAt)}</td>
                        <td>
                          {entry.status === 'RESOLVED' ? (
                            <span className="badge badge-success">
                              <CheckCircle2 size={12} />
                              Resolu
                            </span>
                          ) : (
                            <button
                              className="btn btn-sm btn-accept"
                              disabled={resolvingId === entry.id}
                              onClick={() => handleResolve(entry.id)}
                              type="button"
                            >
                              {resolvingId === entry.id ? (
                                <Loader2 size={14} className="spinner" />
                              ) : (
                                <CheckCircle2 size={14} />
                              )}
                              Resoudre
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
          )}
        </section>
      </div>
    </div>
  );
}
