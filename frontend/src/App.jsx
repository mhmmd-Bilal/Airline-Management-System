import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import RegisterScreen from "./screens/RegisterScreen";
import { useSelector } from "react-redux";
import AdminRoutes from "./routes/AdminRoutes";
import CrewRoutes from "./routes/CrewRoutes";
import { ToastContainer } from "react-toastify";
import SearchResults from "./screens/UserScreens/SearchResults";
import FlightDetail from "./screens/UserScreens/FlightDetail";
import BookingSuccess from "./screens/UserScreens/BookingSuccess";
import MyBookings from "./screens/UserScreens/MyBookings";
import UserProfile from "./screens/UserScreens/UserProfile";
import DealsPage from "./screens/UserScreens/DealsPage";
import LoyaltyScreen from "./screens/UserScreens/LoyaltyScreen";
import SupportPage from "./screens/UserScreens/SupportPage";
import BookingDetails from "./screens/UserScreens/BookingDetails";
import NotificationsPage from "./screens/NotificationPage";
import { getSocket, disconnectSocket } from "./services/socketService";

function SocketManager() {
  const { userData } = useSelector((s) => s.auth);

  useEffect(() => {
    if (!userData) {
      disconnectSocket();
      return;
    }
    getSocket();
  }, [userData]);

  return null;
}

function App() {
  const { userData } = useSelector((state) => state.auth);

  if (userData?.role === "admin") return <AdminRoutes />;
  if (userData?.role === "crew") return <CrewRoutes />;

  return (
    <>
      <SocketManager />
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
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/" element={<HomeScreen />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/flights/:id" element={<FlightDetail />} />
        <Route path="/booking-success/:id" element={<BookingSuccess />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/bookings/:id" element={<BookingDetails />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/loyalty" element={<LoyaltyScreen />} />
        <Route path="/support" element={<SupportPage />} />
        <Route
          path="/notifications"
          element={<NotificationsPage notifPath="/notifications" />}
        />
      </Routes>
    </>
  );
}

export default App;
