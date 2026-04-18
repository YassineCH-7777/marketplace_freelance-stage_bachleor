import { Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Services from './pages/Services';
import ServiceDetails from './pages/ServiceDetails';
import FreelancerDashboard from './pages/FreelancerDashboard';
import MyServices from './pages/MyServices';
import FreelancerRequests from './pages/FreelancerRequests';
import FreelancerOrders from './pages/FreelancerOrders';
import FreelancerProfile from './pages/FreelancerProfile';
import FreelancerReviews from './pages/FreelancerReviews';
import ClientDashboard from './pages/ClientDashboard';
import MyOrders from './pages/MyOrders';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';

function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:id" element={<ServiceDetails />} />

          {/* Freelancer */}
          <Route path="/freelancer/dashboard" element={<FreelancerDashboard />} />
          <Route path="/freelancer/services" element={<MyServices />} />
          <Route path="/freelancer/requests" element={<FreelancerRequests />} />
          <Route path="/freelancer/orders" element={<FreelancerOrders />} />
          <Route path="/freelancer/profile" element={<FreelancerProfile />} />
          <Route path="/freelancer/reviews" element={<FreelancerReviews />} />

          {/* Client */}
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/client/orders" element={<MyOrders />} />

          {/* Shared */}
          <Route path="/messages" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
