const TWITCH_CHANNEL = "tdfedeportes";

export default function TwitchEmbed() {
  // Twitch exige que "parent" coincida con el dominio real que sirve la
  // página. Usar window.location.hostname en vez de un valor fijo hace que
  // esto funcione igual en localhost, en un dominio de staging o en
  // producción, sin tener que tocar código al cambiar de entorno.
  const parent = window.location.hostname;
  const src = `https://player.twitch.tv/?channel=${TWITCH_CHANNEL}&parent=${parent}&autoplay=false`;

  return (
    <div className="hud-frame bg-black aspect-video w-full overflow-hidden">
      <iframe
        src={src}
        title="TDF e-deportes en vivo"
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}
