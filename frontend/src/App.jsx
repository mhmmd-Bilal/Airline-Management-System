import { Route, Routes } from "react-router-dom";
import LoginScreen from "./screens/LoginScreen";
import HomeScreen from "./screens/HomeScreen";
import RegisterScreen from "./screens/RegisterScreen";
import { useSelector } from "react-redux";
import AdminRoutes from "./routes/AdminRoutes";
import CrewRoutes from "./routes/CrewRoutes";
import { ToastContainer } from "react-toastify";

function App() {
  const { userData } = useSelector((state) => state.auth);

  if (userData?.role === "admin") return <AdminRoutes />;
  if (userData?.role === "crew") return <CrewRoutes />;

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
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/" element={<HomeScreen />} />
      </Routes>
    </>
  );
}

export default App;
