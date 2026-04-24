import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Services from '../pages/Services';
import ServiceDetails from '../pages/ServiceDetails';
import FreelancerPublicProfile from '../pages/FreelancerPublicProfile';
import FreelancerDashboard from '../pages/FreelancerDashboard';
import MyServices from '../pages/MyServices';
import FreelancerRequests from '../pages/FreelancerRequests';
import FreelancerOrders from '../pages/FreelancerOrders';
import FreelancerProfile from '../pages/FreelancerProfile';
import FreelancerReviews from '../pages/FreelancerReviews';
import ClientDashboard from '../pages/ClientDashboard';
import MyOrders from '../pages/MyOrders';
import Messages from '../pages/Messages';
import Notifications from '../pages/Notifications';
import AdminDashboard from '../pages/AdminDashboard';
import NotFound from '../pages/NotFound';
import ProtectedRoute from './ProtectedRoute';
import ClientRoute from './ClientRoute';
import FreelanceRoute from './FreelanceRoute';
import AdminRoute from './AdminRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/services" element={<Services />} />
      <Route path="/services/:id" element={<ServiceDetails />} />
      <Route path="/freelancers/:id" element={<FreelancerPublicProfile />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>

      <Route element={<FreelanceRoute />}>
        <Route path="/freelancer/dashboard" element={<FreelancerDashboard />} />
        <Route path="/freelancer/services" element={<MyServices />} />
        <Route path="/freelancer/requests" element={<FreelancerRequests />} />
        <Route path="/freelancer/orders" element={<FreelancerOrders />} />
        <Route path="/freelancer/profile" element={<FreelancerProfile />} />
        <Route path="/freelancer/reviews" element={<FreelancerReviews />} />
      </Route>

      <Route element={<ClientRoute />}>
        <Route path="/client/dashboard" element={<ClientDashboard />} />
        <Route path="/client/orders" element={<MyOrders />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
