const TDF_CHANNEL = "tdfedeportes";

/** Reproductor embebido de Twitch — por default el canal de TDF, pero
 * acepta cualquier otro (usado para destacar a Younghou/Pochoclo23 en
 * Home cuando están en vivo, pedido de Seba 29-08-2026). */
export default function TwitchEmbed({
  channel = TDF_CHANNEL,
  title,
}: {
  channel?: string;
  title?: string;
}) {
  // Twitch exige que "parent" coincida con el dominio real que sirve la
  // página. Usar window.location.hostname en vez de un valor fijo hace que
  // esto funcione igual en localhost, en un dominio de staging o en
  // producción, sin tener que tocar código al cambiar de entorno.
  const parent = window.location.hostname;
  const src = `https://player.twitch.tv/?channel=${channel}&parent=${parent}&autoplay=false`;

  return (
    <div className="hud-frame bg-black aspect-video w-full overflow-hidden">
      <iframe
        src={src}
        title={title ?? `${channel} en vivo`}
        allowFullScreen
        className="w-full h-full"
      />
    </div>
  );
}
