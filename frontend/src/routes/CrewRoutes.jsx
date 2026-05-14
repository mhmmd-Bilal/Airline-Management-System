import { Route, Routes } from "react-router-dom";
import ProtectedRoutes from "../components/ProtectedRoutes";
import CrewDashboard from "../screens/CrewScreens/CrewDashboard";
import CrewLayout from "../components/crew/CrewLayout";
import CrewFlights from "../screens/CrewScreens/CrewFlights";
import CrewAttendance from "../screens/CrewScreens/CrewAttendance";
import CrewProfile from "../screens/CrewScreens/CrewProfile";
import CrewMedical from "../screens/CrewScreens/CrewMedical";

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
        </Route>
      </Route>
    </Routes>
  );
}
