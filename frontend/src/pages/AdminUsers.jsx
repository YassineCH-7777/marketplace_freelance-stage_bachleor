import { useEffect, useMemo, useState } from 'react';
import { Ban, Loader2, Search, UserCheck, Users } from 'lucide-react';
import { activateAdminUser, getAdminUsers, suspendAdminUser } from '../api/adminApi';
import { formatAdminDate, getAdminBadgeClass } from '../utils/adminMeta';
import './Dashboard.css';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suspendingId, setSuspendingId] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  useEffect(() => {
    let isMounted = true;

    getAdminUsers()
      .then((response) => {
        if (isMounted) setUsers(response.data);
      })
      .catch(() => {
        if (isMounted) setUsers([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();

    return users.filter((entry) => {
      const matchesRole = userRoleFilter === 'ALL' || entry.role === userRoleFilter;
      const searchable = `${entry.firstName || ''} ${entry.lastName || ''} ${entry.email || ''}`.toLowerCase();
      return matchesRole && (!query || searchable.includes(query));
    });
  }, [users, userRoleFilter, userSearch]);

  const handleUserStatus = async (userId, nextStatus) => {
    setSuspendingId(userId);
    try {
      if (nextStatus === 'ACTIVE') {
        await activateAdminUser(userId);
      } else {
        await suspendAdminUser(userId);
      }
      setUsers((currentUsers) =>
        currentUsers.map((entry) => (entry.id === userId ? { ...entry, status: nextStatus } : entry)),
      );
    } finally {
      setSuspendingId(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <Users size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Utilisateurs
          </h1>
          <p className="dashboard-subtitle">Recherchez les comptes et gerez les activations.</p>
        </div>

        <section className="admin-section">
          <div className="admin-section-head">
            <div>
              <span className="admin-kicker">
                <Users size={15} /> Utilisateurs
              </span>
              <h2>Gestion des comptes</h2>
            </div>
            <div className="admin-tools">
              <div className="admin-search">
                <Search size={16} />
                <input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Rechercher..."
                />
              </div>
              <select value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)}>
                <option value="ALL">Tous les roles</option>
                <option value="CLIENT">Clients</option>
                <option value="FREELANCER">Freelances</option>
                <option value="ADMIN">Admins</option>
              </select>
            </div>
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
                    <th>Utilisateur</th>
                    <th>Role</th>
                    <th>Ville</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((entry) => (
                      <tr key={entry.id}>
                        <td className="td-title">
                          {entry.firstName || entry.lastName
                            ? `${entry.firstName || ''} ${entry.lastName || ''}`
                            : entry.email}
                          <span className="admin-muted-line">{entry.email}</span>
                        </td>
                        <td>{entry.role}</td>
                        <td>{entry.city || '-'}</td>
                        <td>
                          <span className={`badge ${getAdminBadgeClass(entry.status)}`}>{entry.status}</span>
                        </td>
                        <td>{formatAdminDate(entry.createdAt)}</td>
                        <td>
                          {entry.status === 'ACTIVE' ? (
                            <button
                              className="btn btn-sm btn-delete"
                              disabled={suspendingId === entry.id}
                              onClick={() => handleUserStatus(entry.id, 'SUSPENDED')}
                              type="button"
                            >
                              {suspendingId === entry.id ? <Loader2 size={14} className="spinner" /> : <Ban size={14} />}
                              Suspendre
                            </button>
                          ) : (
                            <button
                              className="btn btn-sm btn-accept"
                              disabled={suspendingId === entry.id}
                              onClick={() => handleUserStatus(entry.id, 'ACTIVE')}
                              type="button"
                            >
                              {suspendingId === entry.id ? (
                                <Loader2 size={14} className="spinner" />
                              ) : (
                                <UserCheck size={14} />
                              )}
                              Activer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ color: 'var(--text-muted)' }}>
                        Aucun utilisateur trouve.
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
