import { useLocation } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import AppRoutes from './routes/AppRoutes';

function App() {
  const location = useLocation();

  return (
    <>
      <Navbar />
      <main>
        <AppRoutes />
      </main>
      {location.pathname !== '/' && <Footer />}
    </>
  );
}

export default App;
