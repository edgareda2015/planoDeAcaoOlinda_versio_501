import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { VersionProvider } from "./contexts/VersionContext";
// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import Metas from "./pages/Metas";
import Acoes from "./pages/Acoes";
import Admin from "./pages/Admin";
import SectorPage from "./pages/SectorPage";
import DiaADia from "./pages/DiaADia";
import MesAMes from "./pages/MesAMes";
import LinksUteis from "./pages/LinksUteis";
import OutrosSetores from "./pages/OutrosSetores";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import { RoleGuard } from "./components/auth/RoleGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <VersionProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Acoes />} />
                  <Route path="/dashboard" element={<Index />} />
                  <Route path="/outros-setores" element={<OutrosSetores />} />
                  <Route path="/metas" element={<Metas />} />
                  <Route path="/acoes" element={<Acoes />} />
                  <Route 
                    path="/admin" 
                    element={
                      <RoleGuard allowedRoles={['admin', 'diretor_unidade', 'diretor_regional']} fallback={<NotFound />}>
                        <Admin />
                      </RoleGuard>
                    } 
                  />
                  <Route path="/dia-a-dia" element={<DiaADia />} />
                  <Route path="/mes-a-mes" element={<MesAMes />} />
                  <Route path="/links-uteis" element={<LinksUteis />} />
                  <Route path="/setor/:slug" element={<SectorPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </VersionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;