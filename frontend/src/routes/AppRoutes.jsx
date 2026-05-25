import { Navigate, Route, Routes } from 'react-router-dom';
import AdminCategories from '@/features/admin/pages/AdminCategories';
import AdminDashboard from '@/features/admin/pages/AdminDashboard';
import AdminNotifications from '@/features/admin/pages/AdminNotifications';
import AdminOrders from '@/features/admin/pages/AdminOrders';
import AdminReports from '@/features/admin/pages/AdminReports';
import AdminServices from '@/features/admin/pages/AdminServices';
import AdminUsers from '@/features/admin/pages/AdminUsers';
import Login from '@/features/auth/pages/Login';
import Register from '@/features/auth/pages/Register';
import ClientDashboard from '@/features/client/pages/ClientDashboard';
import MyFavorites from '@/features/client/pages/MyFavorites';
import ClientProfile from '@/features/client/pages/ClientProfile';
import MyOrders from '@/features/client/pages/MyOrders';
import FreelancerDashboard from '@/features/freelancer/pages/FreelancerDashboard';
import FreelancerOrders from '@/features/freelancer/pages/FreelancerOrders';
import FreelancerProfile from '@/features/freelancer/pages/FreelancerProfile';
import FreelancerPublicProfile from '@/features/freelancer/pages/FreelancerPublicProfile';
import FreelancerRequests from '@/features/freelancer/pages/FreelancerRequests';
import FreelancerReviews from '@/features/freelancer/pages/FreelancerReviews';
import MyServices from '@/features/freelancer/pages/MyServices';
import Home from '@/features/home/pages/Home';
import Messages from '@/features/messaging/pages/Messages';
import Notifications from '@/features/notifications/pages/Notifications';
import ServiceDetails from '@/features/services/pages/ServiceDetails';
import Services from '@/features/services/pages/Services';
import ServiceRequests from '@/features/requests/pages/ServiceRequests';
import ServiceRequestDetail from '@/features/requests/pages/ServiceRequestDetail';
import CreateServiceRequest from '@/features/requests/pages/CreateServiceRequest';
import MyServiceRequests from '@/features/requests/pages/MyServiceRequests';
import MyProposals from '@/features/requests/pages/MyProposals';
import NotFound from '@/features/system/pages/NotFound';
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
      <Route path="/requests" element={<ServiceRequests />} />
      <Route path="/requests/:id" element={<ServiceRequestDetail />} />

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
        <Route path="/freelancer/proposals" element={<MyProposals />} />
      </Route>

      <Route element={<ClientRoute />}>
        <Route path="/client/dashboard" element={<ClientDashboard />} />
        <Route path="/client/orders" element={<MyOrders />} />
        <Route path="/client/favorites" element={<MyFavorites />} />
        <Route path="/client/profile" element={<ClientProfile />} />
        <Route path="/client/requests" element={<MyServiceRequests />} />
        <Route path="/client/requests/new" element={<CreateServiceRequest />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<Navigate replace to="/admin/dashboard" />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
        <Route path="/admin/categories" element={<AdminCategories />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/services" element={<AdminServices />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/reports" element={<AdminReports />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
