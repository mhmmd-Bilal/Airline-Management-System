// src/components/admin/AdminLayout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { userInfo } = useSelector((state) => state.auth);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"
      />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');
        * { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      <div className="flex min-h-screen bg-[#EAF4FB]">
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          user={userInfo}
        />

        <div className="flex-1 flex flex-col min-h-screen md:ml-[220px]">
          <AdminTopbar
            onMenuClick={() => setSidebarOpen(true)}
            user={userInfo}
          />
          <main className="flex-1 p-5 md:p-7">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}