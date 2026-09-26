export type ChangelogFeature = {
  title: string;
  body: string;
};

export type ChangelogRelease = {
  version: string;
  date: string;
  title: string;
  intro?: string;
  features: ChangelogFeature[];
};

/** Newest release first. That version is the shipped UI id, unless VITE_APP_VERSION is set at build time. */
export const CHANGELOG: ChangelogRelease[] = [
  {
    version: "0.7.6",
    date: "Sep 25, 2026",
    title: "Variants and recorded games",
    intro: "Looks that share a species can be tracked on their own, and a mark can move to another game without leaving the card.",
    features: [
      {
        title: "Variants beside alternate forms",
        body: "Flower colors such as Blue Floette are Variants. Forms that play differently, such as Eternal Floette, Mega Floette, and Rotom’s appliances, stay under Alternate forms. Each one you can catch is marked on its own.",
      },
      {
        title: "A Poké Ball when that form is caught",
        body: "The evolution line and each catchable form show a colored Poké Ball once you have marked it caught.",
      },
      {
        title: "Games for the form you are viewing",
        body: "The Games box lists where that form can be found. Each game shows how you get it, such as Wild, Gift, Event, or Pokédex. Expansions such as the Teal Mask, the Indigo Disk, the Isle of Armor, the Crown Tundra, Legends: Z-A, and Mega Dimension are listed on their own. Mega Evolution and Gigantamax list only the games where that mechanic exists for the species.",
      },
      {
        title: "Move a mark to another game",
        body: "On a Pokédex card, click the game tag and choose a different save. Apply moves that mark, including shiny and gender, without changing the game selector.",
      },
      {
        title: "Last caught keeps the form",
        body: "A variant such as Blue Floette shows its name and sprite in Last caught, and opens that form’s page.",
      },
      {
        title: "Search from the dashboard",
        body: "Type at least two characters of a name or a National Dex number. Matching species, alternate forms, and variants show up as cards you can open or mark.",
      },
    ],
  },
  {
    version: "0.7.5",
    date: "Sep 25, 2026",
    title: "Roadmap",
    features: [
      {
        title: "A page for what’s next",
        body: "The roadmap lists Switch box screenshots, the region maps still to draw, and Terastallization. Open it from the footer.",
      },
    ],
  },
  {
    version: "0.7.4",
    date: "Sep 24, 2026",
    title: "Rarity labels",
    features: [
      {
        title: "Bronze fossils and gray starters",
        body: "Fossil Pokémon have a bronze border, and starters have a gray one. The name and Pokédex number use that same color.",
      },
      {
        title: "A whole pseudo-legendary line",
        body: "Violet covers every stage of a pseudo-legendary line, from the first Pokémon through the final one.",
      },
      {
        title: "A label on the species page",
        body: "The identity card shows the rarity between the Pokédex number and the types. An info button explains what that rarity means.",
      },
    ],
  },
  {
    version: "0.7.3",
    date: "Sep 24, 2026",
    title: "Rarity borders",
    features: [
      {
        title: "Gold for legendaries",
        body: "Legendary Pokémon have a gold border on Pokédex cards, checklist rows, and the species page.",
      },
      {
        title: "Dark red for mythicals",
        body: "Mythical Pokémon have a dark red border in those same places.",
      },
      {
        title: "Violet for pseudo-legendaries",
        body: "Pseudo-legendaries, such as Dragonite and Tyranitar, have a violet border.",
      },
    ],
  },
  {
    version: "0.7.2",
    date: "Sep 24, 2026",
    title: "Mega and Gigantamax lists",
    features: [
      {
        title: "Form lists on the dashboard",
        body: "Mega Evolutions, Gigantamax, and Regional Forms each have a box on the dashboard. Open one to browse that list in the Pokédex.",
      },
      {
        title: "No catch marks on temporary forms",
        body: "Mega Evolutions and Gigantamax show their colored sprite and no catch marks, since they cannot be caught on their own.",
      },
      {
        title: "A shorter page for Mega and Gigantamax",
        body: "Those pages leave out the Pokédex entry, abilities and natures, wild locations, moves, and your specimens.",
      },
    ],
  },
  {
    version: "0.7.1",
    date: "Sep 24, 2026",
    title: "Changelog and gender marks",
    features: [
      {
        title: "A page for what’s new",
        body: "The changelog lists what changed in each release. Open it from the footer.",
      },
      {
        title: "Gender marks on the species page",
        body: "Male and Female buttons appear only on a Pokémon’s page, after you mark Normal or Shiny.",
      },
    ],
  },
  {
    version: "0.7.0",
    date: "Sep 24, 2026",
    title: "Alternate forms",
    intro: "Mega Evolutions, regional forms, and Gigantamax now stand on their own, and sprites can show which gender you are looking at.",
    features: [
      {
        title: "A page for each form",
        body: "Mega Evolutions, regional forms, Gigantamax, and similar forms each have their own details, instead of sharing one entry with the base Pokémon.",
      },
      {
        title: "Switch forms as you browse",
        body: "Change form in the Pokédex, the checklist, a Pokémon’s page, and your collection.",
      },
      {
        title: "Gender sprites",
        body: "When the male and female look different, the sprite matches the gender you are viewing.",
      },
    ],
  },
  {
    version: "0.6.9",
    date: "Sep 23, 2026",
    title: "Browse by region",
    features: [
      {
        title: "Kanto through Paldea",
        body: "The homepage lists regions on their own. A region is no longer tied to the generation a Pokémon was introduced in.",
      },
    ],
  },
  {
    version: "0.6.8.4",
    date: "Sep 23, 2026",
    title: "A simpler dashboard",
    features: [
      {
        title: "Progress in one place",
        body: "The dashboard no longer lists progress game by game.",
      },
    ],
  },
  {
    version: "0.6.8.1",
    date: "Sep 23, 2026",
    title: "Sign-in links",
    features: [
      {
        title: "Links that open the live site",
        body: "Sign-in and password-reset links now land on the live site instead of a local address.",
      },
    ],
  },
  {
    version: "0.6.8",
    date: "Sep 23, 2026",
    title: "Pokémon sprites",
    features: [
      {
        title: "Sprites in the lists",
        body: "Pokémon sprites appear in the Pokédex, the checklist, and on each Pokémon’s page, including shinies.",
      },
      {
        title: "Color on hover",
        body: "A card shows a grayscale sprite until you hover it, then the color fills in.",
      },
    ],
  },
  {
    version: "0.6.7",
    date: "Sep 23, 2026",
    title: "Browse a generation",
    features: [
      {
        title: "Open a generation from home",
        body: "From the homepage you can open a generation and browse it inside your Global Collection. The checklist uses the same filters.",
      },
    ],
  },
  {
    version: "0.6.5",
    date: "Sep 22, 2026",
    title: "Faster pages",
    features: [
      {
        title: "Details open sooner",
        body: "Names, types, evolutions, wild locations, and how-to-obtain notes load faster.",
      },
    ],
  },
  {
    version: "0.6.4.1",
    date: "Sep 22, 2026",
    title: "Global Collection",
    features: [
      {
        title: "One name for every game",
        body: "The save that tracks catches across every game is now called Global Collection.",
      },
    ],
  },
  {
    version: "0.6.4",
    date: "Sep 22, 2026",
    title: "Help on the page",
    features: [
      {
        title: "Info buttons",
        body: "Small info buttons on the dashboard and Pokédex explain what a control does. Tap or click to read them.",
      },
      {
        title: "Faster locations",
        body: "“Where to find it” loads faster across the National Pokédex.",
      },
    ],
  },
  {
    version: "0.6.3.6",
    date: "Sep 22, 2026",
    title: "The live site",
    features: [
      {
        title: "Retro Pokédex is online",
        body: "The app is available on the public site, so you can sign in and keep your collection from any browser.",
      },
    ],
  },
  {
    version: "0.6.3.2",
    date: "Sep 22, 2026",
    title: "Import gender",
    features: [
      {
        title: "The gender on the file",
        body: "Importing a Pokémon file keeps the gender stored on that file.",
      },
    ],
  },
  {
    version: "0.6.3.1",
    date: "Sep 22, 2026",
    title: "Email sign-in",
    features: [
      {
        title: "Sign in with email",
        body: "Google and Microsoft sign-in are turned off for now. Email sign-in stays available.",
      },
    ],
  },
  {
    version: "0.6.3",
    date: "Sep 21, 2026",
    title: "Kalos and version exclusives",
    features: [
      {
        title: "Kalos map",
        body: "Kalos has a region map, in the same style as the earlier regions.",
      },
      {
        title: "Version exclusives",
        body: "On the checklist, a Pokémon exclusive to one version is labeled for the game you have selected, such as X versus Y.",
      },
    ],
  },
  {
    version: "0.6.2",
    date: "Sep 21, 2026",
    title: "The checklist",
    intro: "A list built for tracking a game, with filters and a short note on how to get each Pokémon.",
    features: [
      {
        title: "Caught and missing",
        body: "The checklist shows what you have caught and what is still missing.",
      },
      {
        title: "Search and filters",
        body: "Search by name, filter by status, and switch between the National Pokédex, a regional Pokédex, and the game you are playing.",
      },
      {
        title: "Mark from the list",
        body: "Mark a Pokémon caught or shiny without leaving the checklist.",
      },
      {
        title: "How to get it",
        body: "Each entry can show a short note on how to get that Pokémon in the selected game.",
      },
    ],
  },
  {
    version: "0.6.1",
    date: "Sep 21, 2026",
    title: "Clearer region maps",
    features: [
      {
        title: "One scale for every region",
        body: "Routes, cities, and labels use the same size on every region map.",
      },
      {
        title: "Cities you have not reached",
        body: "Cities that are still ahead are easier to see on the map.",
      },
    ],
  },
  {
    version: "0.6",
    date: "Sep 21, 2026",
    title: "Your own Pokémon",
    intro: "Track the individual Pokémon you own, not only whether a species is caught.",
    features: [
      {
        title: "Specimens",
        body: "Save the Pokémon you actually own: level, nature, ability, moves, stats, ball, and where you caught it.",
      },
      {
        title: "Import a file",
        body: "Import one Pokémon file or a batch, then edit or remove those entries.",
      },
      {
        title: "Marks stay with the game",
        body: "Caught and shiny marks are kept per game, separate from the individual Pokémon you import.",
      },
      {
        title: "Movesets and overviews",
        body: "Each species can show competitive movesets, suggested moves limited to what it can learn in the selected game, and a short overview.",
      },
      {
        title: "Password reset",
        body: "Reset your password from a link sent to your email.",
      },
    ],
  },
  {
    version: "0.5",
    date: "Sep 20, 2026",
    title: "First release",
    intro: "Retro Pokédex opens as a collection tracker and a National Pokédex for the main-series games.",
    features: [
      {
        title: "Your collection",
        body: "Sign in and keep your own caught and shiny progress.",
      },
      {
        title: "National Pokédex",
        body: "Browse every species and open a page for its stats, types, abilities, and moves.",
      },
      {
        title: "Matchups and wild locations",
        body: "See type matchups and where a Pokémon appears in the wild.",
      },
      {
        title: "Region maps",
        body: "Kanto, Johto, Hoenn, Sinnoh, and Unova each have a map, including a route between locations.",
      },
      {
        title: "Progress",
        body: "The dashboard shows how much of your collection you have caught.",
      },
    ],
  },
];
