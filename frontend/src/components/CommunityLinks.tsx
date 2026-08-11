// Chips de texto en vez de los logos oficiales de Twitch/Discord/7TV — son
// marcas de terceros, más seguro (y más coherente con el resto del sitio)
// armar el mismo lenguaje visual HUD que ya usamos que intentar clonar un
// logo de memoria.
const LINKS = [
  { label: "Twitch", href: "https://www.twitch.tv/tdfedeportes" },
  { label: "Discord", href: "https://discord.gg/t6gkWX6j6M" },
  {
    label: "7TV",
    href: "https://chromewebstore.google.com/detail/7tv/lppmekppnliemjclknbagdhoocikieoi",
  },
];

export default function CommunityLinks({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] uppercase text-gray-400 hover:text-tdf-magenta hover:border-tdf-magenta transition-colors border border-tdf-line px-2 py-1"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
