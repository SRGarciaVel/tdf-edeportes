import { SiDiscord, SiTwitch } from "react-icons/si";

// Logo real de 7TV, sacado del outerHTML del <svg> en 7tv.app (inspeccionado
// a mano, no de un sitio de "descarga logos" de dudosa procedencia). Se le
// sacaron las clases de Svelte (scoped, no significan nada fuera de su app)
// y se cambió fill="none" -> fill="currentColor" para que se comporte igual
// que los íconos de Twitch/Discord: toma el color del texto y responde al
// hover sin necesidad de CSS aparte.
function SevenTvIcon({ size = 18 }: { size?: number }) {
  const height = Math.round(size * (20 / 28));
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 28 20"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.7465 5.48825L21.9799 3.33745L22.646 2.20024L21.4125 0.0494437V0H14.8259L17.2928 4.3016L17.9836 5.48825H20.7465Z" />
      <path d="M7.15395 19.9258L14.5546 7.02104L15.4673 5.43884L13.0004 1.13724L12.3097 0.0247596H1.8995L0.666057 2.17556L0 3.31276L1.23344 5.46356V5.51301H9.12745L2.96025 16.267L2.09685 17.7998L3.33029 19.9506V20H7.15395" />
      <path d="M17.4655 19.9257H21.2398L26.1736 11.3225L27.037 9.83924L25.8036 7.68844V7.63899H22.0046L19.5377 11.9406L19.365 12.262L16.8981 7.96038L16.7255 7.63899L14.2586 11.9406L13.5679 13.1272L17.2682 19.5796L17.4655 19.9257Z" />
    </svg>
  );
}

const ICON_LINKS = [
  { label: "Twitch", href: "https://www.twitch.tv/tdfedeportes", Icon: SiTwitch },
  { label: "Discord", href: "https://discord.gg/t6gkWX6j6M", Icon: SiDiscord },
  {
    label: "7TV",
    href: "https://chromewebstore.google.com/detail/7tv/lppmekppnliemjclknbagdhoocikieoi",
    Icon: SevenTvIcon,
  },
];

export default function CommunityLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {ICON_LINKS.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          className="text-gray-400 hover:text-tdf-magenta transition-colors"
        >
          <Icon size={18} />
        </a>
      ))}
    </div>
  );
}
