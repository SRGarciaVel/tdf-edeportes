import { useState } from "react";
import { useFriendsLiveStatus } from "../lib/useFriendsLiveStatus";

const TDF_CHANNEL = "tdfedeportes";

/** Panel de chat de Twitch — con pestañas cuando Younghou y/o
 * Pochoclo23 están en vivo (pedido de Seba, 29-08-2026: "que se pueda
 * seleccionar en pestañas ya establecidas en qué chat entrar"). La
 * pestaña de TDF siempre está; las de los amigos solo aparecen
 * mientras están transmitiendo — no tiene sentido dejar la pestaña de
 * un chat de un stream que ya terminó. */
export default function TwitchChatPanel() {
  const [open, setOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState(TDF_CHANNEL);
  const friendsLive = useFriendsLiveStatus();
  const liveFriendChannels = friendsLive
    .filter((f) => f.is_live)
    .map((f) => f.channel);
  const tabs = [TDF_CHANNEL, ...liveFriendChannels];
  // si la pestaña activa era la de un amigo que dejó de estar en vivo
  // mientras el panel seguía abierto, vuelve sola al chat de TDF en
  // vez de quedar mostrando una pestaña que ya no existe
  const currentChannel = tabs.includes(activeChannel)
    ? activeChannel
    : TDF_CHANNEL;
  // mismo motivo que en TwitchEmbed: el parent tiene que matchear el
  // dominio real que sirve la página, sin importar el entorno
  const parent = window.location.hostname;

  return (
    <>
      {/* pestaña para abrir — SOLO existe mientras el panel está cerrado.
          Antes existía siempre (con "Cerrar" cuando estaba abierto) y
          quedaba flotando encima del iframe (los dos usaban right:0 al
          mismo tiempo) — Twitch bloqueaba el chat con toda razón, estaba
          literalmente tapado. Ahora, al estar abierto, esta pestaña
          directamente no se renderiza — el botón de cerrar vive adentro
          del panel mismo, apilado arriba del iframe, nunca superpuesto.
          Ver lessons.md. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-0 bottom-0 my-auto h-32 right-0 z-50 flex items-center justify-center bg-tdf-magenta hover:bg-tdf-purple transition-colors text-white font-mono text-xs uppercase px-2 [writing-mode:vertical-rl] rotate-180 shadow-[0_0_16px_-4px_rgba(196,20,122,0.8)]"
          aria-label="Abrir chat de Twitch"
        >
          Chat
        </button>
      )}

      {/* Animado con "right", nunca con transform — el navegador marca el
          chat de Twitch como "tapado" (protección anti-clickjacking) si
          algún ancestro del iframe tiene un transform aplicado, aunque
          sea uno que no cambia nada visible. Antes esto usaba
          framer-motion (transform: translateX). Ver lessons.md. */}
      <div
        className="fixed top-24 h-[calc(100%-6rem)] w-full sm:w-[350px] z-40 bg-black border-l border-tdf-line flex flex-col transition-[right] duration-300 ease-out"
        style={{ right: open ? 0 : "-100%" }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-tdf-line shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map((channel) => (
              <button
                key={channel}
                onClick={() => setActiveChannel(channel)}
                className={`font-mono text-[10px] uppercase px-2 py-1 whitespace-nowrap transition-colors ${
                  currentChannel === channel
                    ? "bg-tdf-magenta text-white"
                    : "text-tdf-muted hover:text-white"
                }`}
              >
                {channel === TDF_CHANNEL ? "TDF" : channel}
              </button>
            ))}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="font-mono text-xs uppercase text-tdf-magenta hover:text-white transition-colors shrink-0"
            aria-label="Cerrar chat de Twitch"
          >
            Cerrar ✕
          </button>
        </div>
        {open && (
          <iframe
            key={currentChannel}
            src={`https://www.twitch.tv/embed/${currentChannel}/chat?parent=${parent}&darkpopout`}
            className="w-full flex-1"
            title={`Chat de ${currentChannel} en Twitch`}
          />
        )}
      </div>
    </>
  );
}
