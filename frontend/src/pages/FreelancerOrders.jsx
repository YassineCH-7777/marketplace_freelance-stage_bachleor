import { useEffect, useMemo, useState } from 'react';
import { getFreelancerOrders, updateFreelancerOrderExecution } from '../api/userApi';
import MissionExecutionCard from '../components/orders/MissionExecutionCard';
import MissionUpdateModal from '../components/orders/MissionUpdateModal';
import { ClipboardCheck, FileText, Loader2, Package, Rocket } from 'lucide-react';
import './Dashboard.css';

export default function FreelancerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMission, setActiveMission] = useState(null);
  const [savingMission, setSavingMission] = useState(false);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt),
      ),
    [orders],
  );

  const stats = [
    { icon: <Rocket size={22} />, value: orders.filter((order) => order.status === 'IN_PROGRESS').length, label: 'Missions en cours', color: 'blue' },
    { icon: <ClipboardCheck size={22} />, value: orders.filter((order) => order.notes).length, label: 'Etapes renseignees', color: 'purple' },
    { icon: <FileText size={22} />, value: orders.filter((order) => order.status === 'COMPLETED').length, label: 'Livraisons cloturees', color: 'green' },
  ];

  const fetchOrders = () => {
    setLoading(true);
    getFreelancerOrders()
      .then((response) => setOrders(response.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleMissionUpdate = async (payload) => {
    if (!activeMission) {
      return;
    }

    setSavingMission(true);
    try {
      const response = await updateFreelancerOrderExecution(activeMission.id, payload);
      setOrders((currentOrders) =>
        currentOrders.map((entry) => (entry.id === response.data.id ? response.data : entry)),
      );
      setActiveMission(null);
      alert('Suivi de mission mis a jour avec succes !');
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la mise a jour de la mission');
    } finally {
      setSavingMission(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <Package size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Pilotage des Missions
          </h1>
          <p className="dashboard-subtitle">
            Tenez le suivi a jour, partagez une preuve de livraison et produisez un compte-rendu final simple.
          </p>
        </div>

        {!loading && orders.length > 0 && (
          <div className="dashboard-stats stagger">
            {stats.map((stat, index) => (
              <div className="dash-stat-card animate-fade-in-up" key={index}>
                <div className={`dash-stat-icon ${stat.color}`}>{stat.icon}</div>
                <div className="dash-stat-info">
                  <span className="dash-stat-value">{stat.value}</span>
                  <span className="dash-stat-label">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <Loader2 size={32} className="spinner" />
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state animate-fade-in-up">
            <div className="empty-state-icon">
              <Package size={48} />
            </div>
            <h3 className="empty-state-title">Aucune mission</h3>
            <p className="empty-state-desc">
              Des que vous acceptez une demande, vous pourrez suivre ici chaque mission avec ses validations et ses livrables.
            </p>
          </div>
        ) : (
          <div className="mission-grid stagger">
            {sortedOrders.map((order) => (
              <MissionExecutionCard
                key={order.id}
                order={order}
                role="freelancer"
                onManage={setActiveMission}
              />
            ))}
          </div>
        )}

        {activeMission && (
          <MissionUpdateModal
            key={activeMission.id}
            order={activeMission}
            onClose={() => setActiveMission(null)}
            onSubmit={handleMissionUpdate}
            submitting={savingMission}
          />
        )}
      </div>
    </div>
  );
}
