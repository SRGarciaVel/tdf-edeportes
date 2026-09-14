import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

/** Hoja deslizable desde abajo — reemplaza al drawer mobile viejo
 * (pedido de Seba, 13-09-2026: tab bar flotante abajo en vez de menú
 * hamburguesa arriba). Un solo componente reusado por los 4 paneles
 * (Jugadores/Actividad/Comunidad/Perfil), cada uno solo cambia el
 * contenido de adentro. */
export default function MobileBottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-tdf-charcoal border-t border-tdf-line rounded-t-2xl max-h-[75vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="w-10 h-1 bg-tdf-line rounded-full mx-auto mt-3 mb-1" />
            <p className="font-mono text-[10px] uppercase text-tdf-muted px-5 pt-2 pb-3 border-b border-tdf-line">
              {title}
            </p>
            <div className="px-5 py-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
