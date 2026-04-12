import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Layout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col md:pl-64">
        <Header />
        <main className="flex flex-1 flex-col p-4 md:p-8">
          <div className="flex-grow">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};

export default Layout;