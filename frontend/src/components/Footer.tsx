export default function Footer() {
  return (
    <footer className="border-t border-tdf-line mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-mono text-xs text-gray-500">
          TDF e-deportes © {new Date().getFullYear()} · Comunidad de Fighting Games
        </p>
        <div className="flex gap-4 font-mono text-xs uppercase text-gray-500">
          <a
            href="https://www.twitch.tv/tdfedeportes"
            target="_blank"
            rel="noreferrer"
            className="hover:text-tdf-magenta transition-colors"
          >
            Twitch
          </a>
          <a
            href="https://discord.gg/t6gkWX6j6M"
            target="_blank"
            rel="noreferrer"
            className="hover:text-tdf-magenta transition-colors"
          >
            Discord
          </a>
        </div>
      </div>
    </footer>
  );
}
