import type { Locale } from "./i18n/runtime";

/** Inbox for privacy and terms requests. Change this in one place. */
export const LEGAL_CONTACT = "contact@webwave.solutions";

export type LegalPageId = "privacy" | "terms";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  kicker: string;
  title: string;
  updatedLabel: string;
  updated: string;
  lead: string;
  sections: LegalSection[];
};

const mail = `mailto:${LEGAL_CONTACT}`;
const contact = `[${LEGAL_CONTACT}](${mail})`;

const privacyEn: LegalDocument = {
  kicker: "Privacy",
  title: "Privacy Policy",
  updatedLabel: "Last updated",
  updated: "October 1, 2026",
  lead: "This Privacy Policy describes how Retro Pokédex (“we,” “us,” or “our”) collects, uses, and shares information when you use the Retro Pokédex website (the “Service”).",
  sections: [
    {
      id: "collect",
      title: "Information We Collect",
      paragraphs: [
        "Information you provide. If you create an account, we collect your email address, the name you provide, and a password. Passwords are stored in hashed form. We also record when the account was created, when you last signed in, and whether your email address has been confirmed.",
        "If you sign in with Google or Microsoft, we receive the name, email address, profile picture address, and account identifier that the provider shares with us. We do not receive your password for those services. Where two sign-in methods use the same confirmed email address, we link them to a single account. We use this information to create and authenticate your account. We do not sell it, and we do not use it for advertising.",
        "Collection information. If you use the Service without an account, caught and shiny marks remain in your browser and are not transmitted to us. If you are signed in, we store the marks you set, including the game, Pokémon, form, gender, and the time you marked them. We also store specimen details you choose to save, which may include a nickname, level, gender, shiny status, ability, nature, held item, Poké Ball, moves, stats, effort values, individual values, met location and date, and original trainer name.",
        "If you upload a PK file, that file is processed in your browser. We receive the specimen information extracted from it. We do not receive the file itself.",
        "Screenshots. If you use the box scanner, the image is transmitted to us and then to Google Gemini so that the Pokémon in the image can be identified. We do not retain the image. We retain a record of the request, including the date and the usage required to apply scan limits. Move suggestions are generated from species and game information and are not associated with your name, email address, or specimens.",
        "Information collected automatically. We use a cookie to keep you signed in. We store preferences in your browser, such as language, list settings, and cached reference data. To suggest English or Spanish, we request a country code for your connection from ipwho.is. That country code remains in your browser for the visit. We do not add it to your account, and we do not store your IP address. We use Google Analytics to understand how the Service is used, which may include pages viewed, device information, and approximate location. Analytics information is not linked to your collection. [Google’s Privacy Policy](https://policies.google.com/privacy) describes Google’s practices.",
      ],
    },
    {
      id: "use",
      title: "How We Use Information",
      paragraphs: [
        "We use the information we collect to provide, maintain, and secure the Service; to create and authenticate accounts; to sync your collection across devices; to process screenshots and display move suggestions; to enforce usage limits; to send account emails, such as confirmation and password-reset messages; to understand how the Service is used; and to comply with law and protect the rights and safety of users and the Service.",
        "Account emails are sent from noreply@retropokedex.com. We do not send marketing messages.",
      ],
    },
    {
      id: "share",
      title: "How We Share Information",
      paragraphs: [
        "We share information with service providers that process it on our behalf: Google, if you use Google sign-in, Google Analytics, or Gemini; Microsoft, if you use Microsoft sign-in; Resend, to deliver account email; ipwho.is, to determine a country for the language prompt; and our hosting and database providers, which store and serve the Service.",
        "PokéAPI and Smogon provide reference information about Pokémon. Requests to those sources identify a Pokémon and a game. They do not include your account information.",
        "We do not sell personal information. We may disclose information if we believe it is required by law, or if it is necessary to protect the Service, our users, or the rights of others.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      paragraphs: [
        "We use a session cookie to keep you signed in. The cookie is limited to the Service, lasts approximately 14 days, and is cleared when you sign out. Your browser also stores preferences and cached reference data. You can remove that data through your browser settings. Google Analytics may set its own cookies, as described in Google’s Privacy Policy.",
      ],
    },
    {
      id: "retention",
      title: "Data Retention",
      paragraphs: [
        "We retain account and collection information for as long as your account is active or as needed to provide the Service. Scan records are retained in order to administer usage limits. Confirmation and password-reset links expire automatically. We may retain copies in backups until those backups are replaced.",
      ],
    },
    {
      id: "choices",
      title: "Your Choices",
      paragraphs: [
        "You may use much of the Service without creating an account. You may delete a specimen in the Service, and you may sign out at any time. You may disconnect Google or Microsoft through the security settings of those accounts.",
        `You may request a copy of the account information we hold, or request deletion of your account and the collection and scan records associated with it, by emailing ${contact}.`,
      ],
    },
    {
      id: "children",
      title: "Children’s Privacy",
      paragraphs: [
        "The Service is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will delete it. If you believe we have done so, please contact us.",
      ],
    },
    {
      id: "changes",
      title: "Changes to This Policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. When we do, we will revise the “Last updated” date at the top of this page. Your continued use of the Service after an update means that you accept the revised policy. Our [Terms of Use](/terms) govern your use of the Service.",
      ],
    },
    {
      id: "contact",
      title: "Contact Us",
      paragraphs: [`Questions about this Privacy Policy may be sent to ${contact}.`],
    },
  ],
};

const termsEn: LegalDocument = {
  kicker: "Terms",
  title: "Terms of Use",
  updatedLabel: "Last updated",
  updated: "October 1, 2026",
  lead: "These Terms of Use (“Terms”) govern your access to and use of Retro Pokédex (the “Service”). By accessing or using the Service, you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the Service.",
  sections: [
    {
      id: "service",
      title: "The Service",
      paragraphs: [
        "Retro Pokédex is an unofficial, fan-made collection tracker. It is not affiliated with, endorsed, or sponsored by Nintendo, Game Freak, or The Pokémon Company. Pokémon and Pokédex are trademarks of their respective owners.",
        "The Service lets you look up Pokémon and keep a personal collection. It does not access a game or a console except when you choose to upload a screenshot or a PK file.",
      ],
    },
    {
      id: "eligibility",
      title: "Eligibility and Accounts",
      paragraphs: [
        "You must be at least 13 years old to create an account. You agree to provide accurate account information and to keep your login credentials confidential. You are responsible for activity under your account. An account is optional.",
      ],
    },
    {
      id: "content",
      title: "Your Content",
      paragraphs: [
        "You retain ownership of the collection information and files you submit. You grant us a limited license to host, store, and display that information solely to operate the Service for you, including on other devices after you sign in. We do not sell your content. Move suggestions are generated from species information and are not based on your specimens.",
        "You represent that you have the rights needed to upload any screenshot or PK file you submit, and that your submission does not violate any law or the rights of any third party.",
      ],
    },
    {
      id: "use",
      title: "Acceptable Use",
      paragraphs: [
        "You agree not to use the Service for any unlawful purpose; attempt to gain unauthorized access to the Service or to another user’s account; interfere with or disrupt the Service, including by circumventing usage limits or imposing an unreasonable load; or represent the Service as an official product of Nintendo, Game Freak, or The Pokémon Company.",
        "We reserve the right to suspend or terminate access to the Service if we believe these Terms have been violated.",
      ],
    },
    {
      id: "ip",
      title: "Intellectual Property",
      paragraphs: [
        "Pokémon names, characters, designs, and related trademarks are the property of Nintendo, Game Freak, The Pokémon Company, and their licensors. Species information is provided by PokéAPI. Competitive set information is provided by Smogon. We do not claim ownership of those materials. The Service’s original design and text are owned by us or our licensors.",
        `If you believe material on the Service infringes your rights, contact us at ${contact}.`,
      ],
    },
    {
      id: "third-parties",
      title: "Third-Party Services",
      paragraphs: [
        "The Service depends on third-party services, including those described in our [Privacy Policy](/privacy). Your use of a third-party sign-in or other third-party service is subject to that party’s own terms and privacy policy. We are not responsible for third-party services.",
      ],
    },
    {
      id: "changes-service",
      title: "Changes to the Service",
      paragraphs: [
        "We may modify, suspend, or discontinue the Service, or any part of it, at any time, with or without notice. Information in the Service, including encounter locations, move lists, forms, and counts, may be incomplete or inaccurate. We do not guarantee that the Service or your collection information will be available without interruption.",
      ],
    },
    {
      id: "warranty",
      title: "Disclaimer of Warranties",
      paragraphs: [
        "THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, ERROR-FREE, OR COMPLETE.",
      ],
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      paragraphs: [
        "TO THE FULLEST EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF DATA, PROFITS, USE, OR GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER LEGAL THEORY. THE SERVICE CANNOT MODIFY OR DELETE A SAVE ON A GAME CARTRIDGE OR CONSOLE.",
      ],
    },
    {
      id: "termination",
      title: "Termination",
      paragraphs: [
        "You may stop using the Service at any time. We may suspend or close your account, or discontinue the Service, if you violate these Terms or if we stop offering the Service. Sections that by their nature should survive termination will survive, including intellectual property, disclaimers, and limitations of liability.",
      ],
    },
    {
      id: "changes",
      title: "Changes to These Terms",
      paragraphs: [
        "We may update these Terms from time to time. When we do, we will revise the “Last updated” date at the top of this page. If you continue to use the Service after the updated Terms are posted, you agree to the updated Terms.",
      ],
    },
    {
      id: "contact",
      title: "Contact Us",
      paragraphs: [
        `Questions about these Terms may be sent to ${contact}. Please contact us first so that we can try to resolve a concern informally.`,
      ],
    },
  ],
};

const privacyEs: LegalDocument = {
  kicker: "Privacidad",
  title: "Política de privacidad",
  updatedLabel: "Última actualización",
  updated: "1 de octubre de 2026",
  lead: "La presente Política de privacidad describe cómo Retro Pokédex («nosotros») recoge, utiliza y comparte información cuando usted utiliza el sitio web de Retro Pokédex (el «Servicio»).",
  sections: [
    {
      id: "collect",
      title: "Información que recogemos",
      paragraphs: [
        "Información que usted facilita. Si crea una cuenta, recogemos su dirección de correo electrónico, el nombre que indique y una contraseña. Las contraseñas se almacenan únicamente como un hash y no pueden recuperarse. También registramos la fecha de creación de la cuenta, el último inicio de sesión y si el correo electrónico ha sido confirmado.",
        "Si inicia sesión con Google o Microsoft, recibimos el nombre, la dirección de correo electrónico, la dirección de la foto de perfil y el identificador de cuenta que el proveedor comparte con nosotros. No recibimos su contraseña de esos servicios. Cuando dos métodos de acceso usan el mismo correo confirmado, los vinculamos a una sola cuenta. Usamos esta información para crear su cuenta y autenticarle. No la vendemos ni la utilizamos con fines publicitarios.",
        "Información de la colección. Si utiliza el Servicio sin cuenta, las marcas de capturado y variocolor permanecen en su navegador y no se nos transmiten. Si ha iniciado sesión, almacenamos las marcas que indique, incluido el juego, el Pokémon, la forma, el sexo y el momento en que las marcó. También almacenamos los datos de espécimen que decida guardar, que pueden incluir mote, nivel, sexo, variocolor, habilidad, naturaleza, objeto equipado, Poké Ball, movimientos, estadísticas, puntos de esfuerzo, valores individuales, lugar y fecha de encuentro, y nombre del entrenador original.",
        "Si carga un archivo PK, ese archivo se procesa en su navegador. Recibimos la información del espécimen extraída de él. No recibimos el archivo en sí.",
        "Capturas de pantalla. Si utiliza el escáner de cajas, la imagen se nos transmite y, a continuación, a Google Gemini para identificar los Pokémon que aparecen en ella. No conservamos la imagen. Conservamos un registro de la solicitud, incluida la fecha y el uso necesario para aplicar los límites de escaneo. Las sugerencias de movimientos se generan a partir de la información de la especie y del juego, y no se asocian a su nombre, su correo electrónico ni sus especímenes.",
        "Información recogida de forma automática. Utilizamos una cookie para mantener su sesión. Almacenamos preferencias en su navegador, como el idioma, la configuración de las listas y datos de referencia en caché. Para sugerir inglés o español, solicitamos a ipwho.is un código de país de su conexión. Ese código permanece en su navegador durante la visita. No lo añadimos a su cuenta y no almacenamos su dirección IP. Utilizamos Google Analytics para comprender cómo se usa el Servicio, lo que puede incluir las páginas visitadas, información del dispositivo y una ubicación aproximada. La información de analítica no se vincula a su colección. La [Política de privacidad de Google](https://policies.google.com/privacy) describe las prácticas de Google.",
      ],
    },
    {
      id: "use",
      title: "Cómo utilizamos la información",
      paragraphs: [
        "Utilizamos la información que recogemos para prestar, mantener y proteger el Servicio; crear y autenticar cuentas; sincronizar su colección entre dispositivos; procesar capturas y mostrar sugerencias de movimientos; aplicar límites de uso; enviar correos de la cuenta, como la confirmación y el restablecimiento de contraseña; comprender cómo se usa el Servicio; y cumplir la ley y proteger los derechos y la seguridad de los usuarios y del Servicio.",
        "Los correos de la cuenta se envían desde noreply@retropokedex.com. No enviamos mensajes comerciales.",
      ],
    },
    {
      id: "share",
      title: "Cómo compartimos la información",
      paragraphs: [
        "Compartimos información con proveedores que la tratan por nuestra cuenta: Google, si utiliza el inicio de sesión de Google, Google Analytics o Gemini; Microsoft, si utiliza el inicio de sesión de Microsoft; Resend, para entregar el correo de la cuenta; ipwho.is, para determinar un país para el aviso de idioma; y nuestros proveedores de alojamiento y de bases de datos, que almacenan y sirven el Servicio.",
        "PokéAPI y Smogon facilitan información de referencia sobre Pokémon. Las solicitudes a esas fuentes identifican un Pokémon y un juego. No incluyen la información de su cuenta.",
        "No vendemos información personal. Podemos divulgar información si consideramos que la ley lo exige, o si es necesario para proteger el Servicio, a nuestros usuarios o los derechos de terceros.",
      ],
    },
    {
      id: "cookies",
      title: "Cookies",
      paragraphs: [
        "Utilizamos una cookie de sesión para mantener su inicio de sesión. La cookie se limita al Servicio, dura aproximadamente 14 días y se elimina al cerrar la sesión. Su navegador también almacena preferencias y datos de referencia en caché. Puede eliminarlos desde la configuración del navegador. Google Analytics puede instalar sus propias cookies, según se describe en la Política de privacidad de Google.",
      ],
    },
    {
      id: "retention",
      title: "Conservación de los datos",
      paragraphs: [
        "Conservamos la información de la cuenta y de la colección mientras su cuenta esté activa o mientras sea necesario para prestar el Servicio. Los registros de escaneo se conservan para administrar los límites de uso. Los enlaces de confirmación y de restablecimiento de contraseña caducan de forma automática. Podemos conservar copias en copias de seguridad hasta que estas se sustituyan.",
      ],
    },
    {
      id: "choices",
      title: "Sus opciones",
      paragraphs: [
        "Puede utilizar gran parte del Servicio sin crear una cuenta. Puede eliminar un espécimen en el Servicio y cerrar la sesión en cualquier momento. Puede desvincular Google o Microsoft desde la configuración de seguridad de esas cuentas.",
        `Puede solicitar una copia de la información de cuenta que conservamos, o solicitar la eliminación de su cuenta y de los registros de colección y de escaneo asociados, escribiendo a ${contact}.`,
      ],
    },
    {
      id: "children",
      title: "Privacidad de los menores",
      paragraphs: [
        "El Servicio no está dirigido a menores de 13 años y no recogemos a sabiendas información personal de menores de 13 años. Si tenemos conocimiento de que hemos recogido información personal de un menor de 13 años, la eliminaremos. Si cree que ha ocurrido, póngase en contacto con nosotros.",
      ],
    },
    {
      id: "changes",
      title: "Cambios de esta política",
      paragraphs: [
        "Podemos actualizar esta Política de privacidad en cualquier momento. Cuando lo hagamos, revisaremos la fecha de «Última actualización» que figura al inicio de esta página. El uso continuado del Servicio después de una actualización supone la aceptación de la política revisada. Nuestros [Términos de uso](/terms) rigen el uso del Servicio.",
      ],
    },
    {
      id: "contact",
      title: "Contacto",
      paragraphs: [`Las consultas sobre esta Política de privacidad pueden enviarse a ${contact}.`],
    },
  ],
};

const termsEs: LegalDocument = {
  kicker: "Términos",
  title: "Términos de uso",
  updatedLabel: "Última actualización",
  updated: "1 de octubre de 2026",
  lead: "Los presentes Términos de uso (los «Términos») rigen el acceso y la utilización de Retro Pokédex (el «Servicio»). Al acceder al Servicio o utilizarlo, usted acepta estos Términos y nuestra Política de privacidad. Si no está de acuerdo, no utilice el Servicio.",
  sections: [
    {
      id: "service",
      title: "El Servicio",
      paragraphs: [
        "Retro Pokédex es un registro de colección no oficial realizado por aficionados. No está afiliado, respaldado ni patrocinado por Nintendo, Game Freak ni The Pokémon Company. Pokémon y Pokédex son marcas de sus respectivos titulares.",
        "El Servicio le permite consultar Pokémon y llevar una colección personal. No accede a un juego ni a una consola, salvo cuando usted decide cargar una captura de pantalla o un archivo PK.",
      ],
    },
    {
      id: "eligibility",
      title: "Requisitos y cuentas",
      paragraphs: [
        "Debe tener al menos 13 años para crear una cuenta. Usted se compromete a facilitar información veraz y a mantener la confidencialidad de sus credenciales de acceso. Usted es responsable de la actividad realizada con su cuenta. La cuenta es opcional.",
      ],
    },
    {
      id: "content",
      title: "Su contenido",
      paragraphs: [
        "Usted conserva la titularidad de la información de colección y de los archivos que envíe. Nos otorga una licencia limitada para alojar, almacenar y mostrar esa información únicamente con el fin de prestarle el Servicio, incluso en otros dispositivos después de iniciar sesión. No vendemos su contenido. Las sugerencias de movimientos se generan a partir de la información de la especie y no se basan en sus especímenes.",
        "Usted declara que dispone de los derechos necesarios para cargar cualquier captura o archivo PK que envíe, y que dicho envío no infringe ninguna ley ni los derechos de terceros.",
      ],
    },
    {
      id: "use",
      title: "Uso aceptable",
      paragraphs: [
        "Usted se compromete a no utilizar el Servicio con fines ilícitos; a no intentar acceder sin autorización al Servicio o a la cuenta de otro usuario; a no interferir en el Servicio ni alterar su funcionamiento, incluso eludiendo los límites de uso o imponiendo una carga excesiva; y a no presentar el Servicio como un producto oficial de Nintendo, Game Freak o The Pokémon Company.",
        "Nos reservamos el derecho de suspender o cancelar el acceso al Servicio si consideramos que se han infringido estos Términos.",
      ],
    },
    {
      id: "ip",
      title: "Propiedad intelectual",
      paragraphs: [
        "Los nombres, personajes, diseños y marcas relacionadas con Pokémon son propiedad de Nintendo, Game Freak, The Pokémon Company y sus licenciantes. La información de especies la facilita PokéAPI. La información de equipos competitivos la facilita Smogon. No reclamamos la titularidad de esos materiales. El diseño y los textos originales del Servicio son de nuestra propiedad o de la de nuestros licenciantes.",
        `Si considera que algún material del Servicio vulnera sus derechos, póngase en contacto con nosotros en ${contact}.`,
      ],
    },
    {
      id: "third-parties",
      title: "Servicios de terceros",
      paragraphs: [
        "El Servicio depende de servicios de terceros, incluidos los descritos en nuestra [Política de privacidad](/privacy). El uso de un inicio de sesión de terceros, o de otro servicio de terceros, se rige por los términos y la política de privacidad de ese tercero. No somos responsables de los servicios de terceros.",
      ],
    },
    {
      id: "changes-service",
      title: "Cambios del Servicio",
      paragraphs: [
        "Podemos modificar, suspender o interrumpir el Servicio, o cualquier parte del mismo, en cualquier momento, con o sin previo aviso. La información del Servicio, incluidas las localizaciones, las listas de movimientos, las formas y los recuentos, puede ser incompleta o inexacta. No garantizamos que el Servicio o la información de su colección estén disponibles de forma ininterrumpida.",
      ],
    },
    {
      id: "warranty",
      title: "Exclusión de garantías",
      paragraphs: [
        "EL SERVICIO SE OFRECE «TAL CUAL» Y «SEGÚN DISPONIBILIDAD», SIN GARANTÍAS DE NINGÚN TIPO, YA SEAN EXPRESAS O IMPLÍCITAS, INCLUIDAS LAS GARANTÍAS IMPLÍCITAS DE COMERCIABILIDAD, IDONEIDAD PARA UN FIN DETERMINADO Y NO INFRACCIÓN. NO GARANTIZAMOS QUE EL SERVICIO SEA ININTERRUMPIDO, SEGURO, EXENTO DE ERRORES O COMPLETO.",
      ],
    },
    {
      id: "liability",
      title: "Limitación de responsabilidad",
      paragraphs: [
        "EN LA MEDIDA MÁXIMA PERMITIDA POR LA LEY, NO SEREMOS RESPONSABLES DE DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENTES O PUNITIVOS, NI DE NINGUNA PÉRDIDA DE DATOS, BENEFICIOS, USO O REPUTACIÓN, QUE SE DERIVEN DE SU USO DEL SERVICIO O GUARDEN RELACIÓN CON ÉL, YA SE BASEN EN GARANTÍA, CONTRATO, RESPONSABILIDAD EXTRACONTRACTUAL O CUALQUIER OTRA TEORÍA JURÍDICA. EL SERVICIO NO PUEDE MODIFICAR NI ELIMINAR UNA PARTIDA GUARDADA EN UN CARTUCHO O UNA CONSOLA.",
      ],
    },
    {
      id: "termination",
      title: "Terminación",
      paragraphs: [
        "Puede dejar de utilizar el Servicio en cualquier momento. Podemos suspender o cerrar su cuenta, o interrumpir el Servicio, si incumple estos Términos o si dejamos de ofrecer el Servicio. Las cláusulas que por su naturaleza deban sobrevivir a la terminación permanecerán en vigor, incluidas las relativas a la propiedad intelectual, las exclusiones de garantía y las limitaciones de responsabilidad.",
      ],
    },
    {
      id: "changes",
      title: "Cambios de estos Términos",
      paragraphs: [
        "Podemos actualizar estos Términos en cualquier momento. Cuando lo hagamos, revisaremos la fecha de «Última actualización» que figura al inicio de esta página. Si continúa utilizando el Servicio después de la publicación de los Términos actualizados, acepta dichos Términos.",
      ],
    },
    {
      id: "contact",
      title: "Contacto",
      paragraphs: [
        `Las consultas sobre estos Términos pueden enviarse a ${contact}. Le rogamos que se ponga en contacto con nosotros en primer lugar para que podamos intentar resolver la cuestión de manera informal.`,
      ],
    },
  ],
};

const documents: Record<LegalPageId, Record<Locale, LegalDocument>> = {
  privacy: { en: privacyEn, es: privacyEs },
  terms: { en: termsEn, es: termsEs },
};

export function legalDocument(page: LegalPageId, locale: Locale): LegalDocument {
  return documents[page][locale];
}
