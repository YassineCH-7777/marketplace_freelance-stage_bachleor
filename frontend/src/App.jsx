import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import RoleDashboardBar from './components/dashboard/RoleDashboardBar';
import useAuth from './hooks/useAuth';
import AppRoutes from './routes/AppRoutes';
import { shouldShowDashboardBar } from './utils/dashboardBar';

function App() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const showDashboardBar = isAuthenticated && shouldShowDashboardBar(user?.role, location.pathname);

  useEffect(() => {
    if (location.hash) {
      const targetId = decodeURIComponent(location.hash.slice(1));
      let retryTimeout;
      let attempts = 0;

      const scrollToTarget = () => {
        const target = document.getElementById(targetId);

        if (target || attempts >= 20) {
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        attempts += 1;
        retryTimeout = window.setTimeout(scrollToTarget, 50);
      };

      const animationFrame = requestAnimationFrame(() => {
        scrollToTarget();
      });

      return () => {
        cancelAnimationFrame(animationFrame);
        window.clearTimeout(retryTimeout);
      };
    }

    if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, location.hash]);

  return (
    <>
      <Navbar />
      <main className={showDashboardBar ? 'app-main-with-dashboard-bar' : undefined}>
        {showDashboardBar && <RoleDashboardBar />}
        <AppRoutes />
      </main>
      {location.pathname !== '/' && <Footer />}
    </>
  );
}

export default App;
