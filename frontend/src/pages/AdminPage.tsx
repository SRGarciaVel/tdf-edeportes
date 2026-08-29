import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import InitialsAvatar from "../components/InitialsAvatar";
import Layout from "../components/Layout";
import SectionLabel from "../components/SectionLabel";
import Skeleton from "../components/Skeleton";
import {
  assignRole,
  createAdminRole,
  deleteAdminRole,
  getAdminDashboard,
  listAdminRoles,
  listAdminUsers,
  setUserStaff,
  unassignRole,
} from "../lib/api";
import { useAuth } from "../lib/auth";
import type { AdminUserRead, DashboardStats, RoleRead } from "../lib/types";

function formatDate(iso: string | null): string {
  if (!iso) return "nunca";
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Panel de Administración — nivel por encima de Staff, solo para
 * AckermanFG (programador) y bazthyfreeman (CEO), pedido explícito de
 * Seba (29-08-2026). La protección real vive en el backend
 * (require_admin, 403 para cualquier otra cuenta incluido Staff) —
 * este chequeo de acá es solo para no mostrar la UI a quien no
 * corresponde, no es la barrera de seguridad de verdad. */
export default function AdminPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUserRead[]>([]);
  const [roles, setRoles] = useState<RoleRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user?.is_admin) {
      setLoading(false);
      return;
    }
    Promise.all([
      getAdminDashboard(token),
      listAdminUsers(token),
      listAdminRoles(token),
    ])
      .then(([s, u, r]) => {
        setStats(s);
        setUsers(u);
        setRoles(r);
      })
      .catch(() => setError("No se pudo cargar el panel."))
      .finally(() => setLoading(false));
  }, [token, user?.is_admin]);

  async function handleToggleStaff(targetUser: AdminUserRead) {
    if (!token) return;
    const updated = await setUserStaff(
      token,
      targetUser.id,
      !targetUser.is_staff,
    );
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  async function handleAddRole() {
    if (!token) return;
    const name = newRoleName.trim();
    if (!name) return;
    try {
      const role = await createAdminRole(token, name);
      setRoles((prev) =>
        [...prev, role].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewRoleName("");
    } catch {
      setError("Ese rol ya existe, o no se pudo crear.");
    }
  }

  async function handleDeleteRole(role: RoleRead) {
    if (!token) return;
    if (
      !confirm(
        `¿Borrar "${role.name}" del catálogo? Se le va a sacar a cualquiera que lo tenga asignado.`,
      )
    )
      return;
    await deleteAdminRole(token, role.id);
    setRoles((prev) => prev.filter((r) => r.id !== role.id));
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        roles: u.roles.filter((r) => r.id !== role.id),
      })),
    );
  }

  async function handleAssignRole(targetUser: AdminUserRead, roleId: string) {
    if (!token || !roleId) return;
    await assignRole(token, targetUser.id, roleId);
    const role = roles.find((r) => r.id === roleId);
    if (!role) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUser.id ? { ...u, roles: [...u.roles, role] } : u,
      ),
    );
  }

  async function handleUnassignRole(targetUser: AdminUserRead, roleId: string) {
    if (!token) return;
    await unassignRole(token, targetUser.id, roleId);
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetUser.id
          ? { ...u, roles: u.roles.filter((r) => r.id !== roleId) }
          : u,
      ),
    );
  }

  if (!user?.is_admin) {
    return (
      <Layout>
        <SectionLabel index="01">Administración</SectionLabel>
        <p className="text-tdf-muted font-body text-sm">
          No tienes acceso a esta página.
        </p>
      </Layout>
    );
  }

  return (
    <Layout>
      <SectionLabel index="01">Administración</SectionLabel>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-sm font-body mb-4">{error}</p>}

      {!loading && stats && (
        <div className="mb-10">
          <p className="font-mono text-[10px] uppercase text-tdf-muted mb-3">
            Estado del sitio · entorno: {stats.environment}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Usuarios", value: stats.total_users },
              { label: "Staff", value: stats.staff_count },
              { label: "Admins", value: stats.admin_count },
              { label: "Jugadores aprobados", value: stats.approved_players },
              {
                label: "Registros pendientes",
                value: stats.pending_registrations,
              },
              {
                label: "Registros rechazados",
                value: stats.rejected_registrations,
              },
              { label: "Comentarios de perfil", value: stats.total_comments },
              {
                label: "Notificaciones enviadas",
                value: stats.total_notifications_sent,
              },
              { label: "Tier lists", value: stats.total_tier_lists },
              {
                label: "Recopilaciones de IG",
                value: stats.total_instagram_highlights,
              },
            ].map((tile) => (
              <div
                key={tile.label}
                className="hud-frame bg-tdf-charcoal px-4 py-3"
              >
                <p className="font-mono text-[9px] uppercase text-tdf-muted">
                  {tile.label}
                </p>
                <p className="text-2xl font-display font-bold">{tile.value}</p>
              </div>
            ))}
            <div className="hud-frame bg-tdf-charcoal px-4 py-3 col-span-2">
              <p className="font-mono text-[9px] uppercase text-tdf-muted">
                Último refresh de CFN
              </p>
              <p className="text-sm font-body mt-1">
                {formatDate(stats.last_cfn_refresh)}
              </p>
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="mb-10">
          <p className="font-mono text-[10px] uppercase text-tdf-muted mb-3">
            Catálogo de roles
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {roles.map((role) => (
              <span
                key={role.id}
                className="flex items-center gap-1.5 bg-tdf-dark border border-tdf-line px-2.5 py-1 text-xs font-body"
              >
                {role.name}
                <button
                  onClick={() => handleDeleteRole(role)}
                  aria-label={`Borrar rol ${role.name}`}
                  className="text-tdf-muted hover:text-red-400"
                >
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Nombre del rol nuevo"
              className="flex-1 bg-tdf-dark border border-tdf-line focus:border-tdf-magenta outline-none px-3 py-1.5 text-sm font-body"
            />
            <button
              onClick={handleAddRole}
              disabled={newRoleName.trim().length === 0}
              className="font-body text-xs px-3 py-1.5 bg-tdf-magenta hover:bg-tdf-purple transition-colors disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        </div>
      )}

      {!loading && (
        <div>
          <p className="font-mono text-[10px] uppercase text-tdf-muted mb-3">
            Usuarios ({users.length})
          </p>
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="hud-frame bg-tdf-charcoal px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-tdf-dark">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <InitialsAvatar seed={u.display_name} size={9} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {u.display_name}
                    {u.is_admin && (
                      <span className="ml-2 text-[10px] bg-tdf-magenta/20 text-tdf-magenta px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-[10px] text-tdf-muted">
                    @{u.twitch_username}
                  </p>
                </div>

                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-tdf-muted shrink-0">
                  <input
                    type="checkbox"
                    checked={u.is_staff}
                    disabled={u.is_admin}
                    onChange={() => handleToggleStaff(u)}
                    className="accent-tdf-magenta"
                  />
                  Staff
                </label>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {u.roles.map((role) => (
                    <span
                      key={role.id}
                      className="flex items-center gap-1 bg-tdf-dark border border-tdf-line px-1.5 py-0.5 text-[10px] font-body"
                    >
                      {role.name}
                      <button
                        onClick={() => handleUnassignRole(u, role.id)}
                        aria-label={`Sacar rol ${role.name}`}
                        className="text-tdf-muted hover:text-red-400"
                      >
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => handleAssignRole(u, e.target.value)}
                    className="bg-tdf-dark border border-tdf-line text-[10px] font-mono px-1 py-0.5"
                  >
                    <option value="">+ rol</option>
                    {roles
                      .filter((r) => !u.roles.some((ur) => ur.id === r.id))
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}
