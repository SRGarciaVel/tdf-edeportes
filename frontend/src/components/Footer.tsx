import CommunityLinks from "./CommunityLinks";

export default function Footer() {
  return (
    <footer className="border-t border-tdf-line mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <img
            src="/brand/logo-wordmark.webp"
            alt="TDF"
            className="h-5 w-auto opacity-70"
          />
          <p className="font-mono text-xs text-tdf-muted">
            e-deportes © {new Date().getFullYear()} · Comunidad de Fighting
            Games
          </p>
        </div>
        <CommunityLinks />
      </div>
    </footer>
  );
}
