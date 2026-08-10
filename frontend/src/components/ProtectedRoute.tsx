import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-tdf-dark text-white flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </main>
    );
  }

  if (!user || !user.is_staff) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
