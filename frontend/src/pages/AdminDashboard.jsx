import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Briefcase,
  ClipboardList,
  FolderKanban,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  getAdminCategories,
  getAdminOrders,
  getAdminReports,
  getAdminServices,
  getAdminStats,
  getAdminUsers,
} from '../api/adminApi';
import './Dashboard.css';

const emptyAdminData = {
  categories: [],
  orders: [],
  reports: [],
  services: [],
  stats: null,
  users: [],
};

export default function AdminDashboard() {
  const [adminData, setAdminData] = useState(emptyAdminData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      getAdminStats(),
      getAdminUsers(),
      getAdminReports(),
      getAdminCategories(),
      getAdminServices(),
      getAdminOrders(),
    ])
      .then(([statsResult, usersResult, reportsResult, categoriesResult, servicesResult, ordersResult]) => {
        if (!isMounted) return;

        setAdminData({
          stats: statsResult.status === 'fulfilled' ? statsResult.value.data : null,
          users: usersResult.status === 'fulfilled' ? usersResult.value.data : [],
          reports: reportsResult.status === 'fulfilled' ? reportsResult.value.data : [],
          categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value.data : [],
          services: servicesResult.status === 'fulfilled' ? servicesResult.value.data : [],
          orders: ordersResult.status === 'fulfilled' ? ordersResult.value.data : [],
        });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const openReports = useMemo(
    () => adminData.reports.filter((report) => report.status !== 'RESOLVED'),
    [adminData.reports],
  );

  const dashboardCards = [
    {
      color: 'blue',
      description: 'Envoyer une alerte systeme aux clients, freelances ou a toute la plateforme.',
      icon: <Bell size={22} />,
      label: 'Notification systeme',
      meta: 'Broadcast',
      to: '/admin/notifications',
    },
    {
      color: 'purple',
      description: 'Ajouter, modifier et activer les categories visibles dans le catalogue.',
      icon: <FolderKanban size={22} />,
      label: 'Categories',
      meta: `${adminData.categories.length} categories`,
      to: '/admin/categories',
    },
    {
      color: 'purple',
      description: 'Rechercher les comptes, filtrer les roles et suspendre ou reactiver un profil.',
      icon: <Users size={22} />,
      label: 'Utilisateurs',
      meta: `${adminData.stats?.totalUsers ?? adminData.users.length} comptes`,
      to: '/admin/users',
    },
    {
      color: 'blue',
      description: 'Moderation des annonces publiees, brouillons, archives ou suspendues.',
      icon: <Briefcase size={22} />,
      label: 'Services',
      meta: `${adminData.stats?.activeServices ?? adminData.services.length} actifs`,
      to: '/admin/services',
    },
    {
      color: 'green',
      description: 'Suivi des missions et des statuts de commandes entre clients et freelances.',
      icon: <ClipboardList size={22} />,
      label: 'Commandes',
      meta: `${adminData.stats?.totalOrders ?? adminData.orders.length} commandes`,
      to: '/admin/orders',
    },
    {
      color: 'yellow',
      description: 'Consulter les abus signales et marquer les dossiers traites.',
      icon: <AlertTriangle size={22} />,
      label: 'Signalements',
      meta: `${adminData.stats?.openReports ?? openReports.length} ouverts`,
      to: '/admin/reports',
    },
  ];

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
            <ShieldCheck size={30} style={{ display: 'inline', verticalAlign: 'middle' }} /> Vue admin
          </h1>
          <p className="dashboard-subtitle">
            Selectionnez une rubrique pour administrer la plateforme depuis une page dediee.
          </p>
        </div>

        <section className="admin-overview-grid">
          {dashboardCards.map((card) => (
            <Link className="card admin-overview-card" key={card.to} to={card.to}>
              <div className={`dash-stat-icon ${card.color}`}>{card.icon}</div>
              <div>
                <span className="admin-overview-meta">{card.meta}</span>
                <h2>{card.label}</h2>
                <p>{card.description}</p>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
