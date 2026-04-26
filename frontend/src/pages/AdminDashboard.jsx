import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Bell,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  Loader2,
  Megaphone,
  Package,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  activateAdminUser,
  createAdminCategory,
  getAdminCategories,
  getAdminOrders,
  getAdminReports,
  getAdminServices,
  getAdminStats,
  getAdminUsers,
  moderateAdminService,
  resolveAdminReport,
  sendAdminSystemNotification,
  suspendAdminUser,
  updateAdminCategory,
} from '../api/adminApi';
import './Dashboard.css';

const categoryInitialState = {
  description: '',
  id: null,
  isActive: true,
  name: '',
};

const notificationInitialState = {
  audience: 'ALL',
  content: '',
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('fr-FR') : '-';
}

function formatMoney(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('fr-FR', { currency: 'MAD', style: 'currency' }).format(Number(value));
}

function getBadgeClass(status) {
  if (['ACTIVE', 'PUBLISHED', 'COMPLETED', 'RESOLVED'].includes(status)) return 'badge-success';
  if (['SUSPENDED', 'CANCELLED', 'REJECTED', 'ARCHIVED'].includes(status)) return 'badge-warning';
  return 'badge-primary';
}

function normalizeCategory(category) {
  return {
    ...category,
    isActive: category.isActive ?? category.active ?? false,
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suspendingId, setSuspendingId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [moderatingId, setModeratingId] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('ALL');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [categoryForm, setCategoryForm] = useState(categoryInitialState);
  const [notificationForm, setNotificationForm] = useState(notificationInitialState);

  const loadAdminData = async () => {
    setLoading(true);
    const [statsResult, usersResult, reportsResult, categoriesResult, servicesResult, ordersResult] =
      await Promise.allSettled([
        getAdminStats(),
        getAdminUsers(),
        getAdminReports(),
        getAdminCategories(),
        getAdminServices(),
        getAdminOrders(),
      ]);

    setStats(statsResult.status === 'fulfilled' ? statsResult.value.data : null);
    setUsers(usersResult.status === 'fulfilled' ? usersResult.value.data : []);
    setReports(reportsResult.status === 'fulfilled' ? reportsResult.value.data : []);
    setCategories(
      categoriesResult.status === 'fulfilled'
        ? categoriesResult.value.data.map(normalizeCategory)
        : [],
    );
    setServices(servicesResult.status === 'fulfilled' ? servicesResult.value.data : []);
    setOrders(ordersResult.status === 'fulfilled' ? ordersResult.value.data : []);
    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    loadAdminData().finally(() => {
      if (!isMounted) return;
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

  const filteredServices = useMemo(
    () => services.filter((service) => serviceStatusFilter === 'ALL' || service.status === serviceStatusFilter),
    [serviceStatusFilter, services],
  );

  const filteredOrders = useMemo(
    () => orders.filter((order) => orderStatusFilter === 'ALL' || order.status === orderStatusFilter),
    [orderStatusFilter, orders],
  );

  const openReports = reports.filter((report) => report.status !== 'RESOLVED');

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

  const handleModerateService = async (serviceId, status) => {
    setModeratingId(serviceId);
    try {
      await moderateAdminService(serviceId, status);
      setServices((currentServices) =>
        currentServices.map((entry) => (entry.id === serviceId ? { ...entry, status } : entry)),
      );
    } finally {
      setModeratingId(null);
    }
  };

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

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    const payload = {
      active: categoryForm.isActive,
      description: categoryForm.description.trim(),
      isActive: categoryForm.isActive,
      name: categoryForm.name.trim(),
    };

    if (!payload.name) return;

    setSavingCategory(true);
    try {
      const response = categoryForm.id
        ? await updateAdminCategory(categoryForm.id, payload)
        : await createAdminCategory(payload);
      const savedCategory = normalizeCategory(response.data);

      setCategories((currentCategories) => {
        if (categoryForm.id) {
          return currentCategories.map((entry) => (entry.id === savedCategory.id ? savedCategory : entry));
        }
        return [...currentCategories, savedCategory];
      });
      setCategoryForm(categoryInitialState);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleEditCategory = (category) => {
    setCategoryForm({
      description: category.description || '',
      id: category.id,
      isActive: category.isActive,
      name: category.name || '',
    });
  };

  const handleNotificationSubmit = async (event) => {
    event.preventDefault();
    const content = notificationForm.content.trim();

    if (content.length < 5) return;

    setSendingNotification(true);
    setAdminMessage('');
    try {
      const response = await sendAdminSystemNotification({
        audience: notificationForm.audience,
        content,
      });
      setAdminMessage(`${response.data.recipients} utilisateur(s) notifie(s).`);
      setNotificationForm(notificationInitialState);
    } finally {
      setSendingNotification(false);
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
          <h1 className="dashboard-title">
            <ShieldCheck size={30} style={{ display: 'inline', verticalAlign: 'middle' }} /> Administration
          </h1>
          <p className="dashboard-subtitle">Controle des comptes, services, commandes et signalements.</p>
        </div>

        <section className="dashboard-stats admin-stat-grid">
          {[
            { color: 'purple', icon: <Users size={22} />, label: 'Utilisateurs', value: stats?.totalUsers ?? users.length },
            { color: 'blue', icon: <Briefcase size={22} />, label: 'Services publies', value: stats?.activeServices ?? 0 },
            { color: 'green', icon: <Package size={22} />, label: 'Commandes', value: stats?.totalOrders ?? orders.length },
            { color: 'yellow', icon: <AlertTriangle size={22} />, label: 'Signalements ouverts', value: stats?.openReports ?? openReports.length },
          ].map((stat) => (
            <div className="dash-stat-card" key={stat.label}>
              <div className={`dash-stat-icon ${stat.color}`}>{stat.icon}</div>
              <div className="dash-stat-info">
                <span className="dash-stat-value">{stat.value}</span>
                <span className="dash-stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="admin-grid" id="admin-notifications">
          <form className="card admin-panel" onSubmit={handleNotificationSubmit}>
            <div className="admin-panel-head">
              <div>
                <span className="admin-kicker">
                  <Megaphone size={15} /> Notification systeme
                </span>
                <h2>Envoyer une alerte</h2>
              </div>
              <span className="badge badge-primary">SYSTEM</span>
            </div>
            <div className="profile-form">
              <div className="form-group">
                <label className="form-label">Audience</label>
                <select
                  className="form-input"
                  value={notificationForm.audience}
                  onChange={(event) =>
                    setNotificationForm((current) => ({ ...current, audience: event.target.value }))
                  }
                >
                  <option value="ALL">Tous les utilisateurs</option>
                  <option value="CLIENT">Clients</option>
                  <option value="FREELANCER">Freelances</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label className="form-label">Message</label>
                <textarea
                  className="form-textarea"
                  value={notificationForm.content}
                  onChange={(event) =>
                    setNotificationForm((current) => ({ ...current, content: event.target.value }))
                  }
                  placeholder="Maintenance prevue ce soir a 22h..."
                />
              </div>
            </div>
            <div className="admin-panel-actions">
              {adminMessage && <span className="client-profile-saved">{adminMessage}</span>}
              <button className="btn btn-primary btn-sm" disabled={sendingNotification} type="submit">
                {sendingNotification ? <Loader2 size={14} className="spinner" /> : <Bell size={14} />}
                Envoyer
              </button>
            </div>
          </form>

          <form className="card admin-panel" id="admin-categories" onSubmit={handleCategorySubmit}>
            <div className="admin-panel-head">
              <div>
                <span className="admin-kicker">
                  <FolderKanban size={15} /> Categories
                </span>
                <h2>{categoryForm.id ? 'Modifier une categorie' : 'Ajouter une categorie'}</h2>
              </div>
              <span className="badge badge-primary">{categories.length}</span>
            </div>
            <div className="profile-form">
              <div className="form-group">
                <label className="form-label">Nom</label>
                <input
                  className="form-input"
                  value={categoryForm.name}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Design graphique"
                />
              </div>
              <label className="wizard-check">
                <input
                  checked={categoryForm.isActive}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  type="checkbox"
                />
                Active
              </label>
              <div className="form-group full-width">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={categoryForm.description}
                  onChange={(event) =>
                    setCategoryForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="admin-category-list">
              {categories.map((category) => (
                <button key={category.id} type="button" onClick={() => handleEditCategory(category)}>
                  <FolderKanban size={14} />
                  {category.name}
                  <span className={`badge ${category.isActive ? 'badge-success' : 'badge-warning'}`}>
                    {category.isActive ? 'Active' : 'Inactive'}
                  </span>
                </button>
              ))}
            </div>
            <div className="admin-panel-actions">
              {categoryForm.id && (
                <button className="btn btn-secondary btn-sm" onClick={() => setCategoryForm(categoryInitialState)} type="button">
                  Annuler
                </button>
              )}
              <button className="btn btn-primary btn-sm" disabled={savingCategory} type="submit">
                {savingCategory ? <Loader2 size={14} className="spinner" /> : <Plus size={14} />}
                {categoryForm.id ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-section dashboard-anchor-section" id="admin-users">
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
                {filteredUsers.map((entry) => (
                  <tr key={entry.id}>
                    <td className="td-title">
                      {entry.firstName || entry.lastName ? `${entry.firstName || ''} ${entry.lastName || ''}` : entry.email}
                      <span className="admin-muted-line">{entry.email}</span>
                    </td>
                    <td>{entry.role}</td>
                    <td>{entry.city || '-'}</td>
                    <td>
                      <span className={`badge ${getBadgeClass(entry.status)}`}>{entry.status}</span>
                    </td>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td>
                      {entry.status === 'ACTIVE' ? (
                        <button
                          className="btn btn-sm btn-delete"
                          disabled={suspendingId === entry.id}
                          onClick={() => handleUserStatus(entry.id, 'SUSPENDED')}
                        >
                          {suspendingId === entry.id ? <Loader2 size={14} className="spinner" /> : <Ban size={14} />}
                          Suspendre
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-accept"
                          disabled={suspendingId === entry.id}
                          onClick={() => handleUserStatus(entry.id, 'ACTIVE')}
                        >
                          {suspendingId === entry.id ? <Loader2 size={14} className="spinner" /> : <UserCheck size={14} />}
                          Activer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section dashboard-anchor-section" id="admin-services">
          <div className="admin-section-head">
            <div>
              <span className="admin-kicker">
                <Briefcase size={15} /> Services
              </span>
              <h2>Moderation des annonces</h2>
            </div>
            <select value={serviceStatusFilter} onChange={(event) => setServiceStatusFilter(event.target.value)}>
              <option value="ALL">Tous les statuts</option>
              <option value="PUBLISHED">Publies</option>
              <option value="SUSPENDED">Suspendus</option>
              <option value="DRAFT">Brouillons</option>
              <option value="ARCHIVED">Archives</option>
            </select>
          </div>

          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Freelance</th>
                  <th>Categorie</th>
                  <th>Prix</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => (
                  <tr key={service.id}>
                    <td className="td-title">
                      {service.title}
                      <span className="admin-muted-line">{service.serviceCity || '-'}</span>
                    </td>
                    <td>{service.freelancerEmail}</td>
                    <td>{service.categoryName}</td>
                    <td>{formatMoney(service.price)}</td>
                    <td>
                      <span className={`badge ${getBadgeClass(service.status)}`}>{service.status}</span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className="btn btn-sm btn-accept"
                          disabled={moderatingId === service.id || service.status === 'PUBLISHED'}
                          onClick={() => handleModerateService(service.id, 'PUBLISHED')}
                        >
                          <CheckCircle2 size={14} /> Publier
                        </button>
                        <button
                          className="btn btn-sm btn-delete"
                          disabled={moderatingId === service.id || service.status === 'SUSPENDED'}
                          onClick={() => handleModerateService(service.id, 'SUSPENDED')}
                        >
                          {moderatingId === service.id ? <Loader2 size={14} className="spinner" /> : <Ban size={14} />}
                          Suspendre
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section dashboard-anchor-section" id="admin-orders">
          <div className="admin-section-head">
            <div>
              <span className="admin-kicker">
                <ClipboardList size={15} /> Commandes
              </span>
              <h2>Suivi des missions</h2>
            </div>
            <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)}>
              <option value="ALL">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="IN_PROGRESS">En cours</option>
              <option value="COMPLETED">Terminees</option>
              <option value="CANCELLED">Annulees</option>
            </select>
          </div>

          <div className="dash-table-wrapper">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Commande</th>
                  <th>Client</th>
                  <th>Freelance</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="td-title">
                      #{order.id} {order.serviceTitle}
                    </td>
                    <td>{order.clientEmail}</td>
                    <td>{order.freelancerEmail}</td>
                    <td>{formatMoney(order.amount)}</td>
                    <td>
                      <span className={`badge ${getBadgeClass(order.status)}`}>{order.status}</span>
                    </td>
                    <td>{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section dashboard-anchor-section" id="admin-reports">
          <div className="admin-section-head">
            <div>
              <span className="admin-kicker">
                <AlertTriangle size={15} /> Signalements
              </span>
              <h2>Moderation des abus</h2>
            </div>
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
                  reports.map((entry) => (
                    <tr key={entry.id}>
                      <td className="td-title">
                        {entry.targetType} #{entry.targetId}
                      </td>
                      <td>{entry.reason}</td>
                      <td>
                        <span className={`badge ${getBadgeClass(entry.status)}`}>{entry.status}</span>
                      </td>
                      <td>{formatDate(entry.createdAt)}</td>
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
        </section>
      </div>
    </div>
  );
}
