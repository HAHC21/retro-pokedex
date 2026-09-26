import type { ChangelogRelease } from "../changelog";
import type { RoadmapSection } from "../roadmap";
import { CHANGELOG } from "../changelog";
import { ROADMAP } from "../roadmap";
import type { Locale } from "./runtime";

type FeatureCopy = {
  title: string;
  body: string;
  points?: Array<{ title: string; body: string }>;
};

type ReleaseCopy = {
  title: string;
  intro?: string;
  features: FeatureCopy[];
};

const CHANGELOG_ES: Record<string, ReleaseCopy> = {
  "0.7.9": {
    title: "Mi colección",
    intro: "Una cuadrícula de cada Pokémon que has marcado, de todas las partidas, con filtros de región y de forma.",
    features: [
      {
        title: "Mi colección en la cabecera",
        body: "Mi colección está en la cabecera, entre Pokédex y Lista de chequeo. Lista cada Pokémon que hayas marcado capturado o variocolor, de todas las partidas. Las megaevoluciones y Gigamax no salen. El selector de juego se oculta aquí.",
      },
      {
        title: "Filtrar por origen",
        body: "La lista de regiones filtra por origen. Vulpix de Alola cuenta para Alola, no para Kanto. Busca por nombre o número de la Pokédex Nacional.",
      },
      {
        title: "Normal, Variocolor, formas y variantes",
        body: "Filtra Todos, Normal, Variocolor, Formas alternativas o Variantes. Vulpix de Alola es una forma alternativa. Floette azul es una variante.",
      },
      {
        title: "Una Ultraball por un espécimen",
        body: "Una Ultraball en una carta significa que se ha subido un espécimen de ese Pokémon. Un espécimen subido puede aparecer aunque no lo hayas marcado capturado.",
      },
      {
        title: "Sin etiquetas en la esquina",
        body: "Las cartas de la Pokédex ya no muestran NORMAL o VARIOCOLOR en la esquina. Los botones de capturado y variocolor siguen ahí.",
      },
      {
        title: "La colección sale de la hoja de ruta",
        body: "La hoja de ruta ya no lista Tu colección.",
      },
    ],
  },
  "0.7.8": {
    title: "Inglés y español",
    intro: "El sitio puede mostrarse en español. Las etiquetas, los juegos y la página de un Pokémon siguen el idioma que elijas.",
    features: [
      {
        title: "EN y ES en la cabecera",
        body: "Cambia entre inglés y español con EN y ES en la cabecera. La elección sigue ahí la próxima vez que abras el sitio. En el teléfono, ambos idiomas están en el menú.",
      },
      {
        title: "Una oferta según el país",
        body: "El inicio ofrece cambiar cuando la conexión está en un país que usa el otro idioma. México o España pueden ofrecer español. Puedes quedarte en el idioma que ya tienes.",
      },
      {
        title: "Etiquetas en el idioma elegido",
        body: "Espada / Escudo, Teselia, el tipo Fuego, Vulpix de Alola y Charizard Gigamax usan el nombre en español.",
      },
      {
        title: "La página de un Pokémon en ese idioma",
        body: "El nombre, la entrada de la Pokédex y el resumen siguen el idioma. Si el resumen en español aún no está escrito, se queda el párrafo en inglés.",
      },
      {
        title: "Una disposición más estrecha",
        body: "En una pantalla estrecha, Últimos capturados es una lista. Los filtros de la Pokédex se apilan, y en la lista de chequeo los botones de captura van en su propia línea. Las etiquetas de juego en la página de un Pokémon ocupan todo el ancho.",
      },
    ],
  },
  "0.7.7": {
    title: "Mejoras en la lista de chequeo",
    intro: "El diálogo de mover, la lista de chequeo y las líneas evolutivas dicen cómo se obtiene de verdad un Pokémon.",
    features: [
      {
        title: "Juegos en los que se puede conseguir",
        body: "El diálogo de mover solo lista los juegos en los que ese Pokémon se puede capturar, recibir o evolucionar sin un intercambio. La Colección global se queda. Clawitzer ofrece X / Y, Ultrasol / Ultraluna, Espada / Escudo y Escarlata / Púrpura. Una evolución por intercambio, como Alakazam, no aparece en los juegos donde intercambiar es la única vía.",
      },
      {
        title: "Etiquetas que caben en el nombre",
        body: "Los juegos de ese diálogo usan las mismas etiquetas que la ficha. Un nombre largo, como Rubí Omega / Zafiro Alfa, se queda en una sola línea.",
      },
      {
        title: "Cañas y movimientos de campo en la lista de chequeo",
        body: "Si la única forma de encontrar un Pokémon salvaje es una caña o un movimiento de campo, la lista de chequeo lo dice. Magikarp en Rojo y Azul se pesca con una Caña Vieja y una Supercaña. Shuckle en Oro y Plata se obtiene con Golpe Roca. Un Pokémon al que también puedes acercarte caminando sigue diciendo Encuentro salvaje.",
      },
      {
        title: "Cada requisito de evolución",
        body: "Una línea evolutiva indica todos los requisitos. Sylveon sube de nivel con mucha amistad y conociendo un movimiento de tipo Hada. Espeon añade de día, y Umbreon de noche.",
      },
    ],
  },
  "0.7.6": {
    title: "Variantes y juegos registrados",
    intro: "Las apariencias que comparten especie se pueden registrar por separado, y una marca puede pasar a otro juego sin salir de la ficha.",
    features: [
      {
        title: "Variantes junto a las formas alternativas",
        body: "Los colores de flor, como Floette azul, son Variantes. Las formas que se juegan distinto, como Floette eterna, Mega-Floette y los electrodomésticos de Rotom, siguen en Formas alternativas. Cada una que se puede capturar se marca por su cuenta.",
      },
      {
        title: "Una Poké Ball cuando esa forma está capturada",
        body: "La línea evolutiva y cada forma capturable muestran una Poké Ball de color cuando la marcas como capturada.",
      },
      {
        title: "Juegos de la forma que estás viendo",
        body: "El recuadro Juegos indica dónde se encuentra esa forma. Cada juego muestra cómo se obtiene: salvaje, regalo, evento o Pokédex. Las expansiones, como La máscara turquesa, El disco índigo, Isla de la Armadura, Las nieves de la Corona, Leyendas: Z-A y Mega Dimensión, van aparte. Megaevolución y Gigamax solo listan los juegos en los que esa mecánica existe para la especie.",
      },
      {
        title: "Mover una marca a otro juego",
        body: "En una ficha de la Pokédex, pulsa la etiqueta del juego y elige otra partida. Aplicar mueve esa marca, incluido variocolor y sexo, sin cambiar el selector de juego.",
      },
      {
        title: "Últimos capturados conserva la forma",
        body: "Una variante como Floette azul muestra su nombre y su sprite en Últimos capturados, y abre la página de esa forma.",
      },
      {
        title: "Buscar desde el inicio",
        body: "Escribe al menos dos caracteres de un nombre o un número de la Pokédex Nacional. Las especies, formas alternativas y variantes que coinciden aparecen como fichas que puedes abrir o marcar.",
      },
    ],
  },
  "0.7.5": {
    title: "Hoja de ruta",
    features: [
      {
        title: "Una página de lo que viene",
        body: "La hoja de ruta lista las capturas de cajas de Switch, los mapas de región que faltan por dibujar y la teracristalización. Se abre desde el pie.",
      },
    ],
  },
  "0.7.4": {
    title: "Etiquetas de rareza",
    features: [
      {
        title: "Fósiles en bronce e iniciales en gris",
        body: "Los Pokémon fósil tienen un borde bronce y los iniciales uno gris. El nombre y el número de la Pokédex usan ese mismo color.",
      },
      {
        title: "Toda la línea pseudolegendaria",
        body: "El violeta cubre cada fase de una línea pseudolegendaria, desde el primer Pokémon hasta el último.",
      },
      {
        title: "Una etiqueta en la ficha",
        body: "La ficha muestra la rareza entre el número de la Pokédex y los tipos. Un botón de información explica qué significa.",
      },
    ],
  },
  "0.7.3": {
    title: "Bordes de rareza",
    features: [
      {
        title: "Oro para legendarios",
        body: "Los Pokémon legendarios tienen un borde dorado en las fichas, las filas de la lista de chequeo y la página de la especie.",
      },
      {
        title: "Rojo oscuro para singulares",
        body: "Los Pokémon singulares tienen un borde rojo oscuro en esos mismos sitios.",
      },
      {
        title: "Violeta para pseudolegendarios",
        body: "Los pseudolegendarios, como Dragonite y Tyranitar, tienen un borde violeta.",
      },
    ],
  },
  "0.7.2": {
    title: "Listas Mega y Gigamax",
    features: [
      {
        title: "Listas de formas en el inicio",
        body: "Megaevoluciones, Gigamax y formas regionales tienen cada una un recuadro en el inicio. Ábrelo para ver esa lista en la Pokédex.",
      },
      {
        title: "Sin marcas de captura en formas temporales",
        body: "Las megaevoluciones y Gigamax muestran su sprite a color y no tienen marcas de captura, porque no se pueden capturar por sí solas.",
      },
      {
        title: "Una página más corta para Mega y Gigamax",
        body: "Esas páginas omiten la entrada de la Pokédex, las habilidades y naturalezas, los lugares salvajes, los movimientos y tus especímenes.",
      },
    ],
  },
  "0.7.1": {
    title: "Novedades y marcas de sexo",
    features: [
      {
        title: "Una página de lo nuevo",
        body: "Novedades lista lo que cambió en cada versión. Se abre desde el pie.",
      },
      {
        title: "Marcas de sexo en la ficha",
        body: "Los botones Macho y Hembra solo aparecen en la página de un Pokémon, después de marcar Normal o Variocolor.",
      },
    ],
  },
  "0.7.0": {
    title: "Formas alternativas",
    intro: "Las megaevoluciones, las formas regionales y Gigamax tienen página propia, y los sprites pueden mostrar el sexo que estás viendo.",
    features: [
      {
        title: "Una página para cada forma",
        body: "Las megaevoluciones, las formas regionales, Gigamax y formas parecidas tienen sus propios datos, en lugar de compartir una ficha con el Pokémon base.",
      },
      {
        title: "Cambiar de forma al recorrer",
        body: "Cambia de forma en la Pokédex, la lista de chequeo, la página de un Pokémon y tu colección.",
      },
      {
        title: "Sprites por sexo",
        body: "Cuando el macho y la hembra se ven distintos, el sprite coincide con el sexo que estás viendo.",
      },
    ],
  },
  "0.6.9": {
    title: "Recorrer por región",
    features: [
      {
        title: "De Kanto a Paldea",
        body: "El inicio lista las regiones por separado. Una región ya no depende de la generación en la que debutó un Pokémon.",
      },
    ],
  },
  "0.6.8.4": {
    title: "Un inicio más simple",
    features: [
      {
        title: "El progreso en un solo sitio",
        body: "El inicio ya no lista el progreso juego por juego.",
      },
    ],
  },
  "0.6.8.1": {
    title: "Enlaces de acceso",
    features: [
      {
        title: "Enlaces que abren el sitio publicado",
        body: "Los enlaces de acceso y de restablecer contraseña llegan al sitio publicado, no a una dirección local.",
      },
    ],
  },
  "0.6.8": {
    title: "Sprites de Pokémon",
    features: [
      {
        title: "Sprites en las listas",
        body: "Los sprites aparecen en la Pokédex, la lista de chequeo y la página de cada Pokémon, incluidos los variocolor.",
      },
      {
        title: "Color al pasar el cursor",
        body: "Una ficha muestra un sprite en escala de grises hasta que pasas el cursor, y entonces se llena de color.",
      },
    ],
  },
  "0.6.7": {
    title: "Recorrer una generación",
    features: [
      {
        title: "Abrir una generación desde el inicio",
        body: "Desde el inicio puedes abrir una generación y recorrerla dentro de la Colección global. La lista de chequeo usa los mismos filtros.",
      },
    ],
  },
  "0.6.5": {
    title: "Páginas más rápidas",
    features: [
      {
        title: "Los detalles abren antes",
        body: "Los nombres, tipos, evoluciones, lugares salvajes y notas de obtención cargan más rápido.",
      },
    ],
  },
  "0.6.4.1": {
    title: "Colección global",
    features: [
      {
        title: "Un nombre para todos los juegos",
        body: "La partida que registra capturas de todos los juegos ahora se llama Colección global.",
      },
    ],
  },
  "0.6.4": {
    title: "Ayuda en la página",
    features: [
      {
        title: "Botones de información",
        body: "Unos botones pequeños en el inicio y la Pokédex explican qué hace un control. Púlsalos para leerlos.",
      },
      {
        title: "Lugares más rápidos",
        body: "«Dónde encontrarlo» carga más rápido en toda la Pokédex Nacional.",
      },
    ],
  },
  "0.6.3.6": {
    title: "El sitio publicado",
    features: [
      {
        title: "Retro Pokédex está en línea",
        body: "La aplicación está en el sitio público, así que puedes entrar y conservar tu colección desde cualquier navegador.",
      },
    ],
  },
  "0.6.3.2": {
    title: "Importar el sexo",
    features: [
      {
        title: "El sexo del archivo",
        body: "Al importar un archivo de Pokémon se conserva el sexo guardado en ese archivo.",
      },
    ],
  },
  "0.6.3.1": {
    title: "Acceso por correo",
    features: [
      {
        title: "Entrar con correo",
        body: "El acceso con Google y Microsoft está desactivado por ahora. El acceso por correo sigue disponible.",
      },
    ],
  },
  "0.6.3": {
    title: "Kalos y exclusivos de versión",
    features: [
      {
        title: "Mapa de Kalos",
        body: "Kalos tiene un mapa de región, con el mismo estilo que las regiones anteriores.",
      },
      {
        title: "Exclusivos de versión",
        body: "En la lista de chequeo, un Pokémon exclusivo de una versión se etiqueta para el juego que tienes seleccionado, por ejemplo X frente a Y.",
      },
    ],
  },
  "0.6.2": {
    title: "La lista de chequeo",
    intro: "Una lista de chequeo pensada para seguir un juego, con filtros y una nota breve de cómo conseguir cada Pokémon.",
    features: [
      {
        title: "Capturados y faltantes",
        body: "La lista de chequeo muestra lo que has capturado y lo que todavía falta.",
      },
      {
        title: "Búsqueda y filtros",
        body: "Busca por nombre, filtra por estado y cambia entre la Pokédex Nacional, una Pokédex regional y el juego que estás jugando.",
      },
      {
        title: "Marcar desde la lista de chequeo",
        body: "Marca un Pokémon como capturado o variocolor sin salir de la lista de chequeo.",
      },
      {
        title: "Cómo conseguirlo",
        body: "Cada entrada puede mostrar una nota breve de cómo conseguir ese Pokémon en el juego seleccionado.",
      },
    ],
  },
  "0.6.1": {
    title: "Mapas de región más claros",
    features: [
      {
        title: "Una escala para cada región",
        body: "Las rutas, las ciudades y las etiquetas usan el mismo tamaño en todos los mapas de región.",
      },
      {
        title: "Ciudades a las que aún no llegas",
        body: "Las ciudades que todavía quedan por delante se ven mejor en el mapa.",
      },
    ],
  },
  "0.6": {
    title: "Tus propios Pokémon",
    intro: "Registra los Pokémon concretos que tienes, no solo si una especie está capturada.",
    features: [
      {
        title: "Especímenes",
        body: "Guarda los Pokémon que tienes de verdad: nivel, naturaleza, habilidad, movimientos, estadísticas, bola y dónde lo capturaste.",
      },
      {
        title: "Importar un archivo",
        body: "Importa un archivo de Pokémon o un lote, y luego edita o quita esas entradas.",
      },
      {
        title: "Las marcas se quedan con el juego",
        body: "Las marcas de capturado y variocolor se guardan por juego, aparte de los Pokémon que importas.",
      },
      {
        title: "Equipos y resúmenes",
        body: "Cada especie puede mostrar equipos competitivos, movimientos sugeridos limitados a lo que puede aprender en el juego seleccionado y un resumen breve.",
      },
      {
        title: "Restablecer contraseña",
        body: "Restablece tu contraseña desde un enlace enviado a tu correo.",
      },
    ],
  },
  "0.5": {
    title: "Primera versión",
    intro: "Retro Pokédex se abre como registro de colección y Pokédex Nacional de los juegos principales.",
    features: [
      {
        title: "Tu colección",
        body: "Entra y conserva tu propio progreso de capturados y variocolor.",
      },
      {
        title: "Pokédex Nacional",
        body: "Recorre cada especie y abre una página con sus estadísticas, tipos, habilidades y movimientos.",
      },
      {
        title: "Eficacia y lugares salvajes",
        body: "Consulta la eficacia de tipos y dónde aparece un Pokémon en estado salvaje.",
      },
      {
        title: "Mapas de región",
        body: "Kanto, Johto, Hoenn, Sinnoh y Teselia tienen un mapa, con una ruta entre lugares.",
      },
      {
        title: "Progreso",
        body: "El inicio muestra cuánto de tu colección has capturado.",
      },
    ],
  },
};

const ROADMAP_ES: Record<string, ReleaseCopy & { kicker?: string }> = {
  switch: {
    title: "Capturas de Switch",
    intro: "Marca una caja de Pokémon a partir de una imagen, en Switch, Switch 2 o Pokémon HOME. El sitio solo ve la imagen que subes.",
    features: [
      {
        title: "Una caja del PC o una cuadrícula de HOME",
        body: "Abre Escarlata, Púrpura, Espada, Escudo o Pokémon HOME y deja la cuadrícula de 30 huecos en pantalla. Una captura cubre una caja. Los huecos vacíos se omiten, y un sprite variocolor se separa del normal cuando el dibujo es distinto.",
      },
      {
        title: "De la consola al teléfono",
        body: "Haz la foto con el botón de captura y sácala de la consola antes de subirla.",
        points: [
          {
            title: "Aplicación de Nintendo Switch",
            body: "Álbum, luego Compartir y editar, luego Enviar a dispositivo inteligente. En la aplicación del teléfono, abre Álbum, elige la foto y guárdala.",
          },
          {
            title: "Código QR, sin aplicación",
            body: "Álbum, luego Compartir y editar, luego Enviar al teléfono inteligente. Enviar un lote cubre hasta diez fotos. Escanea el primer código para unirte a la red temporal de la consola y el segundo para abrir las imágenes.",
          },
          {
            title: "Ya está en el ordenador",
            body: "Una captura guardada desde la consola, o un fotograma de una capturadora, se puede subir directamente.",
          },
        ],
      },
      {
        title: "Revisar la caja antes de guardarla",
        body: "Subir captura muestra una vista previa de 30 huecos. Corriges lo que se vea mal y luego Confirmar y sincronizar marca esos Pokémon como capturados en el juego que tienes seleccionado.",
      },
      {
        title: "Una foto de 3DS, DS o Game Boy",
        body: "Una foto del teléfono a una pantalla física sale inclinada, con reflejos y luz irregular. Colocas las cuatro esquinas de la pantalla para enderezar la cuadrícula y obtienes la misma vista previa de 30 huecos antes de guardar nada.",
      },
    ],
  },
  maps: {
    title: "Mapas de región que faltan por dibujar",
    intro: "Kanto, Johto, Hoenn, Sinnoh, Teselia y Kalos ya iluminan dónde aparece un Pokémon en estado salvaje. Estas regiones todavía no tienen ese mapa.",
    features: [
      {
        title: "Alola",
        body: "Melemele, Akala, Ula-Ula y Poni, con las rutas y los puntos de referencia entre ellas, con el mismo estilo de rutas y ciudades que de Kanto a Kalos.",
      },
      {
        title: "Galar",
        body: "Las rutas numeradas y las ciudades, más el Área Silvestre, Isla de la Armadura y Las nieves de la Corona. El Área Silvestre y las zonas de las expansiones son áreas abiertas, así que se marcarán como áreas y no como una cadena de rutas.",
      },
      {
        title: "Hisui",
        body: "Pradera Obsidiana, Pantanal Carmesí, Costa Cobalto, Ladera Corona y Tundra Alba. Hisui se explora por área, no por número de ruta, así que el mapa sigue esas cinco zonas.",
      },
      {
        title: "Paldea",
        body: "Provincias Sur, Este, Oeste y Norte, y el Área Cero, más Kitakami de La máscara turquesa y el Terrario de la Academia Arándano de El disco índigo. También son áreas abiertas.",
      },
    ],
  },
  tera: {
    title: "Teracristalización",
    intro: "Escarlata y Púrpura dan a un Pokémon un teratipo que sustituye su tipo defensivo en combate y añade un bonus del mismo tipo a los movimientos de ese tipo.",
    features: [
      {
        title: "Teratipo en la ficha",
        body: "Con Escarlata o Púrpura seleccionado, la página muestra el teratipo de ese Pokémon junto a sus tipos normales.",
      },
      {
        title: "Eficacia del teratipo",
        body: "El panel de eficacia puede cambiar al tipo teracristalizado, para ver qué le hace mucho daño y qué movimientos ganan el bonus del mismo tipo, incluido Teraexplosión.",
      },
      {
        title: "El teratipo de un espécimen",
        body: "Un Pokémon que tienes puede guardar el teratipo que configuraste, aparte del valor por defecto de la especie.",
      },
      {
        title: "Incursiones y Pokémon teracristalizados salvajes",
        body: "Las guaridas de incursión Tera y los encuentros salvajes teracristalizados listan la especie, las estrellas y el teratipo, igual que las apariciones salvajes ya listan una ruta.",
      },
    ],
  },
  retro: {
    title: "El calendario retro",
    intro: "De Oro y Plata hasta Ultrasol y Ultraluna, algunos Pokémon salvajes dependen de la fecha o de un programa de radio. La página lo calcula antes de que enciendas el juego. No se escribe nada en el cartucho, la partida ni la consola. Rojo, Azul, Amarillo, Rubí, Zafiro, Esmeralda, Rojo Fuego, Verde Hoja, X e Y no tienen encuentros de este tipo.",
    features: [],
  },
};

function applyFeatures<T extends { title: string; body: string; points?: Array<{ title: string; body: string }> }>(
  source: T[],
  copy: FeatureCopy[] | undefined,
): T[] {
  if (!copy?.length) {
    return source;
  }
  return source.map((feature, index) => {
    const next = copy[index];
    if (!next) {
      return feature;
    }
    return {
      ...feature,
      title: next.title,
      body: next.body,
      points: feature.points?.map((point, pointIndex) => ({
        ...point,
        title: next.points?.[pointIndex]?.title ?? point.title,
        body: next.points?.[pointIndex]?.body ?? point.body,
      })),
    };
  });
}

export function localizedChangelog(locale: Locale): ChangelogRelease[] {
  if (locale !== "es") {
    return CHANGELOG;
  }
  return CHANGELOG.map((release) => {
    const copy = CHANGELOG_ES[release.version];
    if (!copy) {
      return release;
    }
    return {
      ...release,
      title: copy.title,
      intro: copy.intro,
      features: applyFeatures(release.features, copy.features),
    };
  });
}

export function localizedRoadmap(locale: Locale): RoadmapSection[] {
  if (locale !== "es") {
    return ROADMAP;
  }
  return ROADMAP.map((section) => {
    const copy = ROADMAP_ES[section.id];
    if (!copy) {
      return section;
    }
    return {
      ...section,
      title: copy.title,
      intro: copy.intro ?? section.intro,
      features: copy.features.length ? applyFeatures(section.features, copy.features) : section.features,
    };
  });
}
