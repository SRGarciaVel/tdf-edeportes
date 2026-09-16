/** Retratos de selección de personaje para el test de personalidad SF
 * — arte oficial estilo "select screen", fondo neutro (pedido de
 * Seba, 14-09-2026, confirmado viable por fair use tras consultarlo
 * aparte). Los 82 personajes del roster ya tienen su ruta acá, aunque
 * el archivo todavía no exista para la mayoría — el `<img>` que use
 * esta ruta simplemente falla a cargar y el resultado muestra el
 * respaldo con el logo de TDF en su lugar, nunca se rompe.
 *
 * Los archivos van en /public/characters/, así que la ruta es
 * relativa a la raíz del sitio, no a este archivo. Cuando Seba suba
 * la imagen de un personaje nuevo con el nombre de archivo exacto que
 * ya está acá, empieza a mostrarse sola — no hace falta tocar este
 * archivo de nuevo. */
export const CHARACTER_IMAGES: Record<string, string> = {
  "Ryu (Alpha-SF5)": "/characters/ryu-alpha-sf5.webp",
  "Ryu (SF6)": "/characters/ryu-sf6.webp",
  "Ken (Alpha-SFV)": "/characters/ken-alpha-sfv.webp",
  "Ken (SF6)": "/characters/ken-sf6.webp",
  "Chun-Li (SF2-Alpha)": "/characters/chun-li-sf2-alpha.webp",
  "Chun-Li (SF4-SF6)": "/characters/chun-li-sf4-sf6.webp",
  "Sagat (SF1-Alpha)": "/characters/sagat-sf1-alpha.webp",
  "Sagat (SF5-SF6)": "/characters/sagat-sf5-sf6.webp",
  "Karin (Alpha 3)": "/characters/karin-alpha3.webp",
  "Karin (SFV)": "/characters/karin-sfv.webp",
  Guile: "/characters/guile.webp",
  Blanka: "/characters/blanka.webp",
  Dhalsim: "/characters/dhalsim.webp",
  Zangief: "/characters/zangief.webp",
  Juri: "/characters/juri.webp",
  Jamie: "/characters/jamie.webp",
  JP: "/characters/jp.webp",
  Kimberly: "/characters/kimberly.webp",
  Manon: "/characters/manon.webp",
  "Dan Hibiki": "/characters/dan-hibiki.webp",
  // --- resto del roster (62), agregados 15-09-2026 -- rutas listas
  // de antes de tener los archivos, para no tener que tocar este
  // mapeo de nuevo cada vez que Seba suba una imagen mas ---
  Gouken: "/characters/gouken.webp",
  Oro: "/characters/oro.webp",
  Rose: "/characters/rose.webp",
  Gen: "/characters/gen.webp",
  Guy: "/characters/guy.webp",
  Yun: "/characters/yun.webp",
  Yang: "/characters/yang.webp",
  Necalli: "/characters/necalli.webp",
  "E. Honda": "/characters/e-honda.webp",
  Akuma: "/characters/akuma.webp",
  Sean: "/characters/sean.webp",
  Alex: "/characters/alex.webp",
  Necro: "/characters/necro.webp",
  G: "/characters/g.webp",
  Falke: "/characters/falke.webp",
  Rolento: "/characters/rolento.webp",
  Ibuki: "/characters/ibuki.webp",
  Makoto: "/characters/makoto.webp",
  Elena: "/characters/elena.webp",
  Laura: "/characters/laura.webp",
  Abel: "/characters/abel.webp",
  Rufus: "/characters/rufus.webp",
  "T. Hawk": "/characters/t-hawk.webp",
  Dudley: "/characters/dudley.webp",
  Q: "/characters/q.webp",
  "C. Viper": "/characters/c-viper.webp",
  Luke: "/characters/luke.webp",
  "M. Bison": "/characters/m-bison.webp",
  Vega: "/characters/vega.webp",
  Balrog: "/characters/balrog.webp",
  Seth: "/characters/seth.webp",
  "F.A.N.G": "/characters/fang.webp",
  Urien: "/characters/urien.webp",
  Gill: "/characters/gill.webp",
  Abigail: "/characters/abigail.webp",
  "A.K.I.": "/characters/aki.webp",
  Ed: "/characters/ed.webp",
  Lily: "/characters/lily.webp",
  Marisa: "/characters/marisa.webp",
  Terry: "/characters/terry.webp",
  Mai: "/characters/mai.webp",
  Yasmine: "/characters/yasmine.webp",
  "R. Mika": "/characters/r-mika.webp",
  Hakan: "/characters/hakan.webp",
  "El Fuerte": "/characters/el-fuerte.webp",
  Poison: "/characters/poison.webp",
  Hugo: "/characters/hugo.webp",
  Sodom: "/characters/sodom.webp",
  Maki: "/characters/maki.webp",
  Ingrid: "/characters/ingrid.webp",
  Rashid: "/characters/rashid.webp",
  Birdie: "/characters/birdie.webp",
  Cody: "/characters/cody.webp",
  Zeku: "/characters/zeku.webp",
  Menat: "/characters/menat.webp",
  Kolin: "/characters/kolin.webp",
  Eagle: "/characters/eagle.webp",
  Juli: "/characters/juli.webp",
  Juni: "/characters/juni.webp",
  Remy: "/characters/remy.webp",
  Decapre: "/characters/decapre.webp",
};

export function getCharacterImage(characterName: string): string | null {
  return CHARACTER_IMAGES[characterName] ?? null;
}
