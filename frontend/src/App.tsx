import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import CalendarioPage from "./pages/CalendarioPage";
import HomePage from "./pages/HomePage";
import JugadoresPage from "./pages/JugadoresPage";
import NosotrosPage from "./pages/NosotrosPage";
import ObjetivosPage from "./pages/ObjetivosPage";
import PuntosPage from "./pages/PuntosPage";
import ProtectedRoute from "./components/ProtectedRoute";
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
