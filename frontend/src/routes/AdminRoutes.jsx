import { Route, Routes } from "react-router-dom";
import ProtectedRoutes from "../components/ProtectedRoutes";
import AdminLayout from "../components/admin/AdminLayout";
import AdminDashboard from "../screens/AdminScreens/AdminDashboard";
import FlightsPage from "../screens/AdminScreens/FlightsPage";
import FleetPage from "../screens/AdminScreens/FleetPage";
import CrewPage from "../screens/AdminScreens/CrewPage";
import RevenuePage from "../screens/AdminScreens/RevenuePage";
import SupportPage from "../screens/AdminScreens/AdminSupportPage";
import SettingsPage from "../screens/AdminScreens/SettingsPage";
import { ToastContainer } from "react-toastify";
import FlightDetailPage from "../screens/AdminScreens/FlightDetailPage";
import NotificationsPage from "../screens/NotificationPage";

const adminPages = [
  { path: "/", element: <AdminDashboard /> },
  { path: "flights", element: <FlightsPage /> },
  { path: "fleet", element: <FleetPage /> },
  { path: "crew", element: <CrewPage /> },
  { path: "revenue", element: <RevenuePage /> },
  { path: "support", element: <SupportPage /> },
  { path: "settings", element: <SettingsPage /> },
];

export default function AdminRoutes() {
  return (
    <>
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Routes>
        <Route element={<ProtectedRoutes />}>
          <Route element={<AdminLayout />}>
            {adminPages.map(({ path, element }) => (
              <Route key={path} path={path} element={element} />
            ))}
            <Route path="/admin/notifications" element={<NotificationsPage />} />
            <Route path="/flights/:id" element={<FlightDetailPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
