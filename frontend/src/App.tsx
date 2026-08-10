import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./lib/auth";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import CalendarioPage from "./pages/CalendarioPage";
import DashboardPage from "./pages/DashboardPage";
import HomePage from "./pages/HomePage";
import JugadoresPage from "./pages/JugadoresPage";
import NosotrosPage from "./pages/NosotrosPage";
import ObjetivosPage from "./pages/ObjetivosPage";
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
          <Route path="/objetivos" element={<ObjetivosPage />} />
          <Route path="/nosotros" element={<NosotrosPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
