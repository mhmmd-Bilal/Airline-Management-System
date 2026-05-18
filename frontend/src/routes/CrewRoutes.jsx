import { Route, Routes } from "react-router-dom";
import ProtectedRoutes from "../components/ProtectedRoutes";
import CrewDashboard from "../screens/CrewScreens/CrewDashboard";
import CrewLayout from "../components/crew/CrewLayout";
import CrewFlights from "../screens/CrewScreens/CrewFlights";
import CrewAttendance from "../screens/CrewScreens/CrewAttendance";
import CrewProfile from "../screens/CrewScreens/CrewProfile";
import CrewMedical from "../screens/CrewScreens/CrewMedical";
import CrewSupportPage from "../screens/CrewScreens/CrewSupportPage";
import CrewFlightDetails from "../screens/CrewScreens/CrewFlightDetails";
import NotificationsPage from "../screens/NotificationPage";

export default function CrewRoutes() {
  return (
    <Routes>
      <Route element={<ProtectedRoutes />}>
        <Route element={<CrewLayout />}>
          <Route path="/" element={<CrewDashboard />} />
          <Route path="/flights" element={<CrewFlights />} />
          <Route path="/profile" element={<CrewProfile />} />
          <Route path="/medical" element={<CrewMedical />} />
          <Route path="/attendance" element={<CrewAttendance />} />
          <Route path="/support" element={<CrewSupportPage />} />
          <Route path="/crew/notifications" element={<NotificationsPage />} />
          <Route path="/crew/flights/:id" element={<CrewFlightDetails />} />
        </Route>
      </Route>
    </Routes>
  );
}
