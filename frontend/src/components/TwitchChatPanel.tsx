import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

const TWITCH_CHANNEL = "tdfedeportes";

export default function TwitchChatPanel() {
  const [open, setOpen] = useState(false);
  // mismo motivo que en TwitchEmbed: el parent tiene que matchear el
  // dominio real que sirve la página, sin importar el entorno
  const parent = window.location.hostname;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed top-1/2 right-0 -translate-y-1/2 z-50 bg-tdf-magenta hover:bg-tdf-purple transition-colors text-white font-mono text-xs uppercase px-2 py-5 [writing-mode:vertical-rl] rotate-180 shadow-[0_0_16px_-4px_rgba(196,20,122,0.8)]"
        aria-label={open ? "Cerrar chat de Twitch" : "Abrir chat de Twitch"}
      >
        {open ? "Cerrar" : "Chat"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
            className="fixed top-0 right-0 h-full w-full sm:w-[350px] z-40 bg-black border-l border-tdf-line"
          >
            <iframe
              src={`https://www.twitch.tv/embed/${TWITCH_CHANNEL}/chat?parent=${parent}&darkpopout`}
              className="w-full h-full"
              title="Chat de TDF e-deportes en Twitch"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
