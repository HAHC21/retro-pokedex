export type RoadmapStatus = "planned";

export type RoadmapPoint = {
  title: string;
  body: string;
};

export type RoadmapFeature = {
  title: string;
  status: RoadmapStatus;
  body: string;
  points?: RoadmapPoint[];
};

export type RoadmapSection = {
  id: string;
  kicker: string;
  title: string;
  intro?: string;
  features: RoadmapFeature[];
};

export const ROADMAP: RoadmapSection[] = [
  {
    id: "switch",
    kicker: "Planned",
    title: "Switch screenshots",
    intro:
      "Mark a box of Pokémon from a picture, on a Switch, Switch 2, or Pokémon HOME. The site only sees the image you upload.",
    features: [
      {
        title: "A PC box or HOME grid",
        status: "planned",
        body: "Open Scarlet, Violet, Sword, Shield, or Pokémon HOME and leave the 30-slot grid on screen. One screenshot covers one box. Empty slots are skipped, and a shiny sprite is kept separate from the normal one when the artwork differs.",
      },
      {
        title: "From the console to your phone",
        status: "planned",
        body: "Take the shot with the Capture button, then move it off the console before you upload it.",
        points: [
          {
            title: "Nintendo Switch app",
            body: "Album, then Sharing and Editing, then Upload to Smart Device. In the phone app, open Album, select the shot, and save it.",
          },
          {
            title: "QR code, no app",
            body: "Album, then Sharing and Editing, then Send to Smartphone. Send a Batch covers up to ten shots. Scan the first code to join the console’s temporary Wi-Fi, then the second code to open the pictures.",
          },
          {
            title: "Already on your computer",
            body: "A screenshot saved from the console, or a capture-card frame, can be uploaded directly.",
          },
        ],
      },
      {
        title: "Check the box before it is saved",
        status: "planned",
        body: "Upload Screenshot shows a 30-slot preview. You correct anything that looks wrong, then Confirm & Sync to Living Dex marks those Pokémon caught for the game you have selected.",
      },
      {
        title: "A photo of a 3DS, DS, or Game Boy",
        status: "planned",
        body: "A phone photo of a physical screen is tilted, glared, and unevenly lit. You place the four corners of the screen so the grid can be straightened, then you get the same 30-slot preview before anything is saved.",
      },
    ],
  },
  {
    id: "maps",
    kicker: "Planned",
    title: "Region maps still to draw",
    intro:
      "Kanto, Johto, Hoenn, Sinnoh, Unova, and Kalos already light up where a Pokémon appears in the wild. These regions do not have that map yet.",
    features: [
      {
        title: "Alola",
        status: "planned",
        body: "Melemele, Akala, Ula’ula, and Poni, with the routes and landmarks between them, in the same route-and-city style as Kanto through Kalos.",
      },
      {
        title: "Galar",
        status: "planned",
        body: "The numbered routes and cities, plus the Wild Area, the Isle of Armor, and the Crown Tundra. The Wild Area and the DLC zones are open areas, so they will be marked as areas rather than a chain of routes.",
      },
      {
        title: "Hisui",
        status: "planned",
        body: "Obsidian Fieldlands, Crimson Mirelands, Cobalt Coastlands, Coronet Highlands, and Alabaster Icelands. Hisui is explored by area, not by route number, so the map follows those five regions.",
      },
      {
        title: "Paldea",
        status: "planned",
        body: "South, East, West, and North Provinces, and Area Zero, plus Kitakami from The Teal Mask and the Terarium at Blueberry Academy from The Indigo Disk. These are open areas as well.",
      },
    ],
  },
  {
    id: "tera",
    kicker: "Planned",
    title: "Terastallization",
    intro: "Scarlet and Violet give a Pokémon a Tera type that replaces its defensive typing in battle and adds a same-type bonus to moves of that type.",
    features: [
      {
        title: "Tera type on the species page",
        status: "planned",
        body: "With Scarlet or Violet selected, the page shows that Pokémon’s Tera type alongside its normal types.",
      },
      {
        title: "Matchups for the Tera type",
        status: "planned",
        body: "The matchup panel can switch to the Terastallized type, so you see what hits it super-effectively and which of its moves gain the same-type bonus, including Tera Blast.",
      },
      {
        title: "The Tera type on a specimen",
        status: "planned",
        body: "A Pokémon you own can store the Tera type you actually set, separate from the species default.",
      },
      {
        title: "Raids and wild Tera Pokémon",
        status: "planned",
        body: "Tera Raid dens and wild Tera encounters list the species, the star rank, and the Tera type, the way wild spawns already list a route.",
      },
    ],
  },
];
