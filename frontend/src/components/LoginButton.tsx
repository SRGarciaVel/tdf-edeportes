import { getTwitchLoginUrl } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function LoginButton() {
  const { user, logout } = useAuth();

  async function handleLogin() {
    const { authorize_url } = await getTwitchLoginUrl();
    window.location.href = authorize_url;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {user.avatar_url && (
          <img
            src={user.avatar_url}
            alt={user.display_name}
            className="w-8 h-8 rounded-full border-2 border-tdf-magenta"
            style={{ boxShadow: "0 0 8px rgba(196,20,122,0.5)" }}
          />
        )}
        <span className="text-sm">{user.display_name}</span>
        {user.is_staff && (
          <span className="text-xs bg-tdf-magenta/20 text-tdf-magenta px-2 py-0.5 rounded">
            Staff
          </span>
        )}
        <button
          onClick={logout}
          className="text-sm text-tdf-muted hover:text-white underline"
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      className="bg-tdf-purple hover:bg-tdf-magenta transition-colors text-white text-sm font-semibold px-4 py-2 rounded"
    >
      Entrar con Twitch
    </button>
  );
}
