import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Briefcase,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { getAdminCategories, getAdminReports, getAdminStats, getAdminUsers } from '../../api/adminApi';
import { getClientOrders } from '../../api/orderApi';
import { getFreelancerOrders, getIncomingRequests } from '../../api/userApi';
import '../../pages/Dashboard.css';

function getFirstName(user) {
  return user?.firstName || user?.email?.split('@')[0] || 'utilisateur';
}

function buildNavItemClass(item, location) {
  const [path, hash] = item.to.split('#');
  const normalizedHash = hash ? `#${hash}` : '';
  const matchesPath = item.matchPrefix
    ? location.pathname === path || location.pathname.startsWith(`${path}/`)
    : location.pathname === path;
  const active = normalizedHash ? location.pathname === path && location.hash === normalizedHash : matchesPath && !location.hash;

  return active ? 'nav-tab active' : 'nav-tab';
}

function DashboardStat({ stat }) {
  return (
    <div className="dash-stat-card role-dashboard-stat">
      <div className={`dash-stat-icon ${stat.color}`}>{stat.icon}</div>
      <div className="dash-stat-info">
        <span className="dash-stat-value">{stat.value}</span>
        <span className="dash-stat-label">{stat.label}</span>
      </div>
    </div>
  );
}

export default function RoleDashboardBar() {
  const { user } = useAuth();
  const location = useLocation();
  const [freelancerData, setFreelancerData] = useState({ requests: [], orders: [] });
  const [clientOrders, setClientOrders] = useState([]);
  const [adminData, setAdminData] = useState({
    categories: [],
    reports: [],
    stats: null,
    users: [],
  });

  useEffect(() => {
    let isMounted = true;

    if (user?.role === 'FREELANCER') {
      Promise.allSettled([getIncomingRequests(), getFreelancerOrders()]).then(([requestsResult, ordersResult]) => {
        if (!isMounted) return;

        setFreelancerData({
          requests: requestsResult.status === 'fulfilled' ? requestsResult.value.data : [],
          orders: ordersResult.status === 'fulfilled' ? ordersResult.value.data : [],
        });
      });
    }

    if (user?.role === 'CLIENT') {
      getClientOrders()
        .then((response) => {
          if (isMounted) setClientOrders(response.data);
        })
        .catch(() => {
          if (isMounted) setClientOrders([]);
        });
    }

    if (user?.role === 'ADMIN') {
      Promise.allSettled([getAdminStats(), getAdminUsers(), getAdminReports(), getAdminCategories()]).then(
        ([statsResult, usersResult, reportsResult, categoriesResult]) => {
          if (!isMounted) return;

          setAdminData({
            stats: statsResult.status === 'fulfilled' ? statsResult.value.data : null,
            users: usersResult.status === 'fulfilled' ? usersResult.value.data : [],
            reports: reportsResult.status === 'fulfilled' ? reportsResult.value.data : [],
            categories: categoriesResult.status === 'fulfilled' ? categoriesResult.value.data : [],
          });
        },
      );
    }

    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  const config = useMemo(() => {
    const firstName = getFirstName(user);

    if (user?.role === 'FREELANCER') {
      const pendingRequests = freelancerData.requests.filter((request) => request.status === 'PENDING');
      const activeOrders = freelancerData.orders.filter((order) => order.status === 'IN_PROGRESS');

      return {
        title: (
          <>
            Bienvenue, <span className="gradient-text">{firstName}</span> 👋
          </>
        ),
        subtitle: 'Gérez vos services, demandes et commandes depuis votre tableau de bord.',
        stats: [
          {
            color: 'yellow',
            icon: <ClipboardList size={22} />,
            label: 'Demandes en attente',
            value: pendingRequests.length,
          },
          {
            color: 'blue',
            icon: <Package size={22} />,
            label: 'Commandes en cours',
            value: activeOrders.length,
          },
          {
            color: 'purple',
            icon: <Briefcase size={22} />,
            label: 'Total commandes',
            value: freelancerData.orders.length,
          },
          {
            color: 'green',
            icon: <TrendingUp size={22} />,
            label: 'Demandes acceptées',
            value: freelancerData.requests.filter((request) => request.status === 'ACCEPTED').length,
          },
        ],
        navItems: [
          { icon: <Briefcase size={16} />, label: 'Mes Services', to: '/freelancer/services' },
          { icon: <ClipboardList size={16} />, label: 'Demandes Reçues', to: '/freelancer/requests' },
          { icon: <Package size={16} />, label: 'Commandes', to: '/freelancer/orders' },
          { icon: <UserCheck size={16} />, label: 'Mon Profil', to: '/freelancer/profile' },
          { icon: <Star size={16} />, label: 'Avis Reçus', to: '/freelancer/reviews' },
        ],
      };
    }

    if (user?.role === 'CLIENT') {
      const activeOrders = clientOrders.filter((order) => order.status === 'IN_PROGRESS');
      const completedOrders = clientOrders.filter((order) => order.status === 'COMPLETED');

      return {
        title: (
          <>
            Bonjour, <span className="gradient-text">{firstName}</span> 👋
          </>
        ),
        subtitle: 'Explorez les services, suivez vos commandes et communiquez avec vos freelances.',
        stats: [
          {
            color: 'blue',
            icon: <Package size={22} />,
            label: 'Commandes en cours',
            value: activeOrders.length,
          },
          {
            color: 'green',
            icon: <ShoppingBag size={22} />,
            label: 'Commandes terminées',
            value: completedOrders.length,
          },
          {
            color: 'purple',
            icon: <ShoppingBag size={22} />,
            label: 'Total commandes',
            value: clientOrders.length,
          },
        ],
        navItems: [
          { icon: <Search size={16} />, label: 'Explorer les services', matchPrefix: true, to: '/services' },
          { icon: <Package size={16} />, label: 'Mes Commandes', to: '/client/orders' },
          { icon: <MessageSquare size={16} />, label: 'Messages', to: '/messages' },
          { icon: <Bell size={16} />, label: 'Notifications', to: '/notifications' },
        ],
      };
    }

    if (user?.role === 'ADMIN') {
      const openReports = adminData.reports.filter((report) => report.status !== 'RESOLVED');

      return {
        title: 'Pilotage de la plateforme',
        subtitle: "Vue rapide sur l'activité, les utilisateurs, les catégories et les signalements.",
        stats: [
          {
            color: 'purple',
            icon: <Users size={22} />,
            label: 'Utilisateurs',
            value: adminData.stats?.totalUsers ?? adminData.users.length,
          },
          {
            color: 'blue',
            icon: <Briefcase size={22} />,
            label: 'Services actifs',
            value: adminData.stats?.activeServices ?? 0,
          },
          {
            color: 'green',
            icon: <ShieldCheck size={22} />,
            label: 'Commandes',
            value: adminData.stats?.totalOrders ?? 0,
          },
          {
            color: 'yellow',
            icon: <AlertTriangle size={22} />,
            label: 'Signalements ouverts',
            value: openReports.length,
          },
        ],
        navItems: [
          { icon: <LayoutDashboard size={16} />, label: 'Vue admin', to: '/admin' },
          { icon: <FolderKanban size={16} />, label: 'Catégories', to: '/admin#admin-categories' },
          { icon: <Users size={16} />, label: 'Utilisateurs', to: '/admin#admin-users' },
          { icon: <AlertTriangle size={16} />, label: 'Signalements', to: '/admin#admin-reports' },
          { icon: <Bell size={16} />, label: 'Notifications', to: '/notifications' },
        ],
      };
    }

    return null;
  }, [adminData, clientOrders, freelancerData, user]);

  if (!config) {
    return null;
  }

  return (
    <section className="role-dashboard-bar" aria-label="Navigation du tableau de bord">
      <div className="container role-dashboard-inner">
        <div className="role-dashboard-header">
          <h1 className="dashboard-title role-dashboard-title">{config.title}</h1>
          <p className="dashboard-subtitle">{config.subtitle}</p>
        </div>

        <div className="dashboard-stats role-dashboard-stats">
          {config.stats.map((stat) => (
            <DashboardStat key={stat.label} stat={stat} />
          ))}
        </div>

        <nav className="dashboard-nav role-dashboard-nav" aria-label="Pages du tableau de bord">
          {config.navItems.map((item) => (
            <Link className={buildNavItemClass(item, location)} key={item.to} to={item.to}>
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
