import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import CalendarioPage from "./pages/CalendarioPage";
import HomePage from "./pages/HomePage";
import JugadoresPage from "./pages/JugadoresPage";
import NosotrosPage from "./pages/NosotrosPage";
import ObjetivosPage from "./pages/ObjetivosPage";
import PerfilPage from "./pages/PerfilPage";
import PlayerProfilePage from "./pages/PlayerProfilePage";
import AdminPage from "./pages/AdminPage";
import FodaPage from "./pages/FodaPage";
import PuntosPage from "./pages/PuntosPage";
import RecopilacionesPage from "./pages/RecopilacionesPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Sf6MetaPage from "./pages/Sf6MetaPage";
import Sf6PatchNotesPage from "./pages/Sf6PatchNotesPage";
import StaffCfnPage from "./pages/StaffCfnPage";
import TierListGalleryPage from "./pages/TierListGalleryPage";
import TierListPage from "./pages/TierListPage";
import TierListSharedPage from "./pages/TierListSharedPage";
import TorneosPage from "./pages/TorneosPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/calendario" element={<CalendarioPage />} />
          <Route path="/torneos" element={<TorneosPage />} />
          <Route path="/jugadores" element={<JugadoresPage />} />
          <Route path="/jugadores/:cfnId" element={<PlayerProfilePage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/sf6/meta" element={<Sf6MetaPage />} />
          <Route path="/sf6/patch-notes" element={<Sf6PatchNotesPage />} />
          <Route
            path="/staff/cfn"
            element={
              <ProtectedRoute>
                <StaffCfnPage />
              </ProtectedRoute>
            }
          />
          <Route path="/objetivos" element={<ObjetivosPage />} />
          <Route path="/nosotros" element={<NosotrosPage />} />
          <Route path="/puntos" element={<PuntosPage />} />
          <Route path="/recopilaciones" element={<RecopilacionesPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/foda" element={<FodaPage />} />
          <Route path="/tierlist" element={<TierListPage />} />
          <Route path="/tierlist/comunidad" element={<TierListGalleryPage />} />
          <Route path="/tierlist/:id" element={<TierListSharedPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          {/* el dashboard se fusionó con /calendario (ver lessons.md) —
              esto es solo para no romper un link viejo guardado */}
          <Route
            path="/dashboard"
            element={<Navigate to="/calendario" replace />}
          />
        </Routes>
      </BrowserRouter>
      {/* no renderiza nada visible, manda un ping de pagina vista a
          Vercel Analytics en cada navegacion. Sin costo, capa gratis
          soporta hasta 50.000 eventos/mes (verificado contra la doc de
          Vercel, agosto 2026) */}
      <Analytics />
    </AuthProvider>
  );
}
