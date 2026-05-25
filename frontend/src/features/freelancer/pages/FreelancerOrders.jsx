import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getFreelancerOrders,
  openFreelancerOrderDispute,
  updateFreelancerMissionMilestone,
  updateFreelancerOrderExecution,
} from '@/api/userApi';
import { createOrderConversation } from '@/api/messageApi';
import { uploadOrderAttachments } from '@/api/attachmentApi';
import MissionExecutionCard from '@/components/orders/MissionExecutionCard';
import MissionUpdateModal from '@/components/orders/MissionUpdateModal';
import { activeMissionStatuses } from '@/utils/orderExecution';
import { AlertTriangle, ClipboardCheck, FileText, Loader2, Package, Rocket, X } from 'lucide-react';
import '@/styles/dashboard.css';

export default function FreelancerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMission, setActiveMission] = useState(null);
  const [disputeModal, setDisputeModal] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [savingMission, setSavingMission] = useState(false);
  const [savingMilestoneId, setSavingMilestoneId] = useState(null);
  const [submittingDispute, setSubmittingDispute] = useState(false);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt),
      ),
    [orders],
  );

  const stats = [
    { icon: <Rocket size={22} />, value: orders.filter((order) => activeMissionStatuses.includes(order.status)).length, label: 'Missions actives', color: 'blue' },
    { icon: <ClipboardCheck size={22} />, value: orders.filter((order) => order.milestones?.length || order.activities?.length).length, label: 'Suivis traces', color: 'purple' },
    { icon: <FileText size={22} />, value: orders.filter((order) => ['DELIVERED', 'COMPLETED'].includes(order.status)).length, label: 'Livraisons envoyees', color: 'green' },
  ];

  const fetchOrders = useCallback((showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }
    return getFreelancerOrders()
      .then((response) => setOrders(response.data))
      .catch(() => {})
      .finally(() => {
        if (showLoader) {
          setLoading(false);
        }
      });
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleMissionUpdate = async (payload) => {
    if (!activeMission) {
      return;
    }

    const { attachmentFiles = [], attachmentType = 'DELIVERY_PROOF', ...missionPayload } = payload;

    setSavingMission(true);
    try {
      const response = await updateFreelancerOrderExecution(activeMission.id, missionPayload);
      let updatedOrder = response.data;

      if (attachmentFiles.length > 0) {
        try {
          const attachmentsResponse = await uploadOrderAttachments(activeMission.id, attachmentFiles, attachmentType);
          updatedOrder = {
            ...updatedOrder,
            attachments: [...(updatedOrder.attachments || []), ...attachmentsResponse.data],
          };
        } catch (uploadError) {
          alert(uploadError.response?.data?.message || 'Suivi mis a jour, mais les fichiers n ont pas pu etre ajoutes.');
        }
      }

      setOrders((currentOrders) =>
        currentOrders.map((entry) => (entry.id === updatedOrder.id ? updatedOrder : entry)),
      );
      setActiveMission(null);
      alert('Suivi de mission mis a jour avec succes !');
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la mise a jour de la mission');
    } finally {
      setSavingMission(false);
    }
  };

  const handleMessageClient = async (order) => {
    try {
      const response = await createOrderConversation(order.id);
      navigate('/messages', { state: { conversationId: response.data.id } });
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la creation de la conversation');
    }
  };

  const handleMilestoneUpdate = async (order, milestone, status) => {
    setSavingMilestoneId(milestone.id);
    try {
      await updateFreelancerMissionMilestone(order.id, milestone.id, { status });
      await fetchOrders(false);
      alert(status === 'COMPLETED' ? 'Phase terminee et avancement mis a jour.' : 'Timer de phase demarre.');
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la mise a jour de la phase');
    } finally {
      setSavingMilestoneId(null);
    }
  };

  const openDisputeModal = (order) => {
    setDisputeModal(order);
    setDisputeReason(order.disputeReason || '');
  };

  const closeDisputeModal = () => {
    setDisputeModal(null);
    setDisputeReason('');
    setSubmittingDispute(false);
  };

  const handleOpenDispute = async (event) => {
    event.preventDefault();
    if (!disputeModal) {
      return;
    }

    setSubmittingDispute(true);
    try {
      const response = await openFreelancerOrderDispute(disputeModal.id, { reason: disputeReason });
      setOrders((currentOrders) =>
        currentOrders.map((entry) => (entry.id === response.data.id ? response.data : entry)),
      );
      alert('Litige ouvert. Un administrateur pourra arbitrer la mission.');
      closeDisputeModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de l ouverture du litige');
      setSubmittingDispute(false);
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
                onMessage={handleMessageClient}
                onMilestoneUpdate={handleMilestoneUpdate}
                onOpenDispute={openDisputeModal}
                savingMilestoneId={savingMilestoneId}
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

        {disputeModal && (
          <div className="modal-overlay" onClick={closeDisputeModal}>
            <div className="modal-content" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Ouvrir un litige</h2>
                <button className="modal-close" onClick={closeDisputeModal}>
                  <X size={20} />
                </button>
              </div>
              <div className="delivery-confirmation-note">
                <strong>{disputeModal.serviceTitle}</strong>
                <p>Decrivez le blocage, les elements deja livres et la decision attendue de l admin.</p>
              </div>

              <form className="modal-form" onSubmit={handleOpenDispute}>
                <div className="form-group">
                  <label className="form-label">Motif du litige</label>
                  <textarea
                    className="form-textarea"
                    value={disputeReason}
                    onChange={(event) => setDisputeReason(event.target.value)}
                    placeholder="Exemple : le client refuse la livraison malgre les corrections demandees et les preuves fournies."
                    rows={5}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeDisputeModal}>
                    Annuler
                  </button>
                  <button type="submit" className="btn btn-refuse" disabled={submittingDispute}>
                    {submittingDispute ? (
                      <>
                        <Loader2 size={16} className="spinner" /> Ouverture...
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} /> Ouvrir le litige
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
