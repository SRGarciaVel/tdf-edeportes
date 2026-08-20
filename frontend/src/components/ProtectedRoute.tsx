import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

// No está wireado a ninguna ruta por ahora (el calendario se volvió
// staff-aware en vez de vivir en una página aparte protegida, ver
// lessons.md). Se deja disponible para el próximo caso que sí necesite
// una página exclusiva de staff.
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-tdf-dark text-white flex items-center justify-center">
        <p className="text-tdf-muted font-body">Cargando...</p>
      </main>
    );
  }

  if (!user || !user.is_staff) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
