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

export const CHANGELOG: ChangelogRelease[] = [
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
