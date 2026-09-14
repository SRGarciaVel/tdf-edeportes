import { AnimatePresence, motion, useDragControls } from "framer-motion";
import type { ReactNode } from "react";

/** Hoja deslizable desde abajo — reemplaza al drawer mobile viejo
 * (pedido de Seba, 13-09-2026: tab bar flotante abajo en vez de menú
 * hamburguesa arriba). Un solo componente reusado por los 4 paneles
 * (Jugadores/Actividad/Comunidad/Perfil), cada uno solo cambia el
 * contenido de adentro.
 *
 * El arrastre para cerrar (bug real encontrado por Seba, 13-09-2026)
 * se dispara SOLO desde la agarradera de arriba (`onPointerDown` +
 * `dragControls`), nunca desde el panel entero — si el `drag="y"`
 * escuchara en cualquier parte del panel, competiría con el scroll
 * normal del contenido (`overflow-y-auto`) y el usuario no podría
 * scrollear una lista larga sin arrastrar el panel entero por
 * accidente. Antes la agarradera era puramente decorativa: al no
 * capturar el gesto, el swipe hacia abajo se filtraba hacia el
 * navegador entero y disparaba el pull-to-refresh nativo del
 * celular en vez de cerrar el panel. */
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
  const dragControls = useDragControls();

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
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) {
                onClose();
              }
            }}
            className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-tdf-charcoal border-t border-tdf-line rounded-t-2xl max-h-[75vh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            {/* área de toque más generosa que la barrita visible —
                una barra de 4px es casi imposible de agarrar bien con
                el dedo, el padding de acá arriba/abajo la hace
                utilizable sin agrandar la barra en sí */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="py-3 -mb-2 touch-none cursor-grab active:cursor-grabbing"
            >
              <div className="w-10 h-1 bg-tdf-line rounded-full mx-auto" />
            </div>
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
