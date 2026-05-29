import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Loader from '@/components/common/Loader';
import ProtectedRoute from './ProtectedRoute';
import ClientRoute from './ClientRoute';
import FreelanceRoute from './FreelanceRoute';
import AdminRoute from './AdminRoute';

const AdminCategories = lazy(() => import('@/features/admin/pages/AdminCategories'));
const AdminDashboard = lazy(() => import('@/features/admin/pages/AdminDashboard'));
const AdminNotifications = lazy(() => import('@/features/admin/pages/AdminNotifications'));
const AdminOrders = lazy(() => import('@/features/admin/pages/AdminOrders'));
const AdminReports = lazy(() => import('@/features/admin/pages/AdminReports'));
const AdminServices = lazy(() => import('@/features/admin/pages/AdminServices'));
const AdminUsers = lazy(() => import('@/features/admin/pages/AdminUsers'));
const Login = lazy(() => import('@/features/auth/pages/Login'));
const Register = lazy(() => import('@/features/auth/pages/Register'));
const ForgotPassword = lazy(() => import('@/features/auth/pages/ForgotPassword'));
const ClientDashboard = lazy(() => import('@/features/client/pages/ClientDashboard'));
const MyFavorites = lazy(() => import('@/features/client/pages/MyFavorites'));
const ClientProfile = lazy(() => import('@/features/client/pages/ClientProfile'));
const MyOrders = lazy(() => import('@/features/client/pages/MyOrders'));
const FreelancerDashboard = lazy(() => import('@/features/freelancer/pages/FreelancerDashboard'));
const FreelancerOrders = lazy(() => import('@/features/freelancer/pages/FreelancerOrders'));
const FreelancerProfile = lazy(() => import('@/features/freelancer/pages/FreelancerProfile'));
const FreelancerPublicProfile = lazy(() => import('@/features/freelancer/pages/FreelancerPublicProfile'));
const FreelancerRequests = lazy(() => import('@/features/freelancer/pages/FreelancerRequests'));
const FreelancerReviews = lazy(() => import('@/features/freelancer/pages/FreelancerReviews'));
const MyServices = lazy(() => import('@/features/freelancer/pages/MyServices'));
const Home = lazy(() => import('@/features/home/pages/Home'));
const Messages = lazy(() => import('@/features/messaging/pages/Messages'));
const Notifications = lazy(() => import('@/features/notifications/pages/Notifications'));
const ServiceDetails = lazy(() => import('@/features/services/pages/ServiceDetails'));
const Services = lazy(() => import('@/features/services/pages/Services'));
const ServiceRequests = lazy(() => import('@/features/requests/pages/ServiceRequests'));
const ServiceRequestDetail = lazy(() => import('@/features/requests/pages/ServiceRequestDetail'));
const CreateServiceRequest = lazy(() => import('@/features/requests/pages/CreateServiceRequest'));
const MyServiceRequests = lazy(() => import('@/features/requests/pages/MyServiceRequests'));
const MyProposals = lazy(() => import('@/features/requests/pages/MyProposals'));
const NotFound = lazy(() => import('@/features/system/pages/NotFound'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loader label="Chargement de la page..." />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
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
    </Suspense>
  );
}
