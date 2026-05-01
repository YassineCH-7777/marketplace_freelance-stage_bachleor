import { useState } from 'react';
import { Bell, Loader2, Megaphone } from 'lucide-react';
import { sendAdminSystemNotification } from '@/api/adminApi';
import { notificationInitialState } from '@/utils/adminMeta';
import '@/styles/dashboard.css';

export default function AdminNotifications() {
  const [notificationForm, setNotificationForm] = useState(notificationInitialState);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');

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

  return (
    <div className="dashboard-page">
      <div className="container">
        <div className="dashboard-header animate-fade-in-up">
          <h1 className="dashboard-title">
            <Bell size={28} style={{ display: 'inline', verticalAlign: 'middle' }} /> Notifications systeme
          </h1>
          <p className="dashboard-subtitle">Envoyez une alerte aux utilisateurs de la plateforme.</p>
        </div>

        <section className="admin-section">
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
        </section>
      </div>
    </div>
  );
}
