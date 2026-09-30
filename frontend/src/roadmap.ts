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
  {
    id: "retro",
    kicker: "Planned",
    title: "The retro calendar",
    intro:
      "From Gold and Silver through Ultra Sun and Ultra Moon, some wild Pokémon follow the date or a radio show. The page works those out before you turn the game on. Nothing is written to the cartridge, the save, or the console. Red, Blue, Yellow, Ruby, Sapphire, Emerald, FireRed, LeafGreen, X, and Y have no encounter of this kind.",
    features: [
      {
        title: "Bug-Catching Contest",
        status: "planned",
        body: "The National Park contest runs on Tuesday, Thursday, and Saturday in Gold, Silver, Crystal, HeartGold, and SoulSilver.",
        points: [
          {
            title: "Gold, Silver, and Crystal",
            body: "Every contest day has Caterpie, Metapod, Butterfree, Weedle, Kakuna, Beedrill, Paras, Venonat, Scyther, and Pinsir. Scyther and Pinsir are caught here and nowhere else in those games.",
          },
          {
            title: "HeartGold and SoulSilver, before the National Pokédex",
            body: "The park keeps that same set of ten.",
          },
          {
            title: "HeartGold and SoulSilver on Tuesday, after the National Pokédex",
            body: "Still Caterpie, Metapod, Butterfree, Weedle, Kakuna, Beedrill, Paras, Venonat, Scyther, and Pinsir.",
          },
          {
            title: "Thursday, after the National Pokédex",
            body: "Wurmple, Silcoon, Dustox, Nincada, Volbeat, Kricketot, Kricketune, Combee, Scyther, and Pinsir.",
          },
          {
            title: "Saturday, after the National Pokédex",
            body: "Wurmple, Cascoon, Beautifly, Nincada, Illumise, Kricketot, Kricketune, Combee, Scyther, and Pinsir.",
          },
        ],
      },
      {
        title: "A Pokémon that waits on a weekday",
        status: "planned",
        body: "These are single Pokémon that show up on a set day, then leave until that day comes again.",
        points: [
          {
            title: "Lapras",
            body: "Every Friday in Union Cave, in Crystal, HeartGold, and SoulSilver. Surf is required.",
          },
          {
            title: "Drifloon",
            body: "Every Friday outside Valley Windworks, in Diamond, Pearl, and Platinum.",
          },
          {
            title: "Mandibuzz and Braviary",
            body: "On Route 4 in Black 2, Mandibuzz waits on Thursday. On Route 4 in White 2, Braviary waits on Monday. Each has its hidden ability.",
          },
          {
            title: "Jellicent",
            body: "In Undella Bay, on Monday in Black 2 and on Thursday in White 2. It is male in Black 2 and female in White 2, and it has its hidden ability.",
          },
        ],
      },
      {
        title: "The day’s swarm",
        status: "planned",
        body: "After the National Pokédex, one swarm is worked out from the date. It is the same swarm for every player of that version.",
        points: [
          {
            title: "Diamond, Pearl, and Platinum",
            body: "Doduo on Route 201, Zigzagoon on Route 202, Cubone on Route 203, Phanpy on Route 207, Dunsparce on Route 208, Snubbull on Route 209, Spoink on Route 214, Drowzee on Route 215, Voltorb on Route 218, Farfetch’d on Route 221, Skitty on Route 222, Natu on Route 224, Makuhita on Route 225, Krabby on Route 226, Spinda on Route 227, Beldum on Route 228, Corsola on Route 230, Electrike at Valley Windworks, and Slakoth in Eterna Forest. Delibird swarms on Route 216 in Diamond and Pearl, and on Route 217 in Platinum.",
          },
          {
            title: "Diamond and Pearl only",
            body: "Nosepass on Route 206, Swinub on Route 217, Absol on Route 213, Pidgey on Route 229, Magnemite at Fuego Ironworks, Lickitung at Lake Valor, Smoochum at Lake Acuity, and Surskit at Lake Verity.",
          },
          {
            title: "Platinum only",
            body: "Larvitar on Route 206 and Pinsir on Route 229.",
          },
          {
            title: "HeartGold and SoulSilver",
            body: "Poochyena on Route 1, Wingull in Vermilion City, Ralts on Route 34, Yanma on Route 35, Snubbull on Route 38, Qwilfish on Route 32, Remoraid on Route 44, Swablu on Route 45, Ditto on Route 47, Marill in Mt. Mortar, Dunsparce in Dark Cave, Chansey on Route 13, Relicanth on Route 12, Clamperl on Route 19, Luvdisc on Route 27, Whiscash in Violet City, Kricketot in Viridian Forest, and Buneary on Route 25. Sableye swarms on Route 9 and Baltoy on Route 3 in HeartGold. Mawile swarms on Route 9 and Gulpin on Route 3 in SoulSilver. Professor Oak’s Pokémon Talk names the day’s swarm.",
          },
          {
            title: "Black and White",
            body: "Farfetch’d on Route 1, Wynaut on Route 2, Hippopotas on Route 4, Smeargle on Route 5, Sentret on Route 7, Croagunk on Route 8, Tyrogue on Route 10, Doduo on Route 12, Shuppet on Route 13, Yanma on Route 14, Mankey on Route 15, Pineco on Route 16, and Exeggcute on Route 18. Black has Volbeat on Route 3, Plusle on Route 6, Houndour on Route 9, and Shroomish on Route 11. White has Illumise, Minun, Poochyena, and Paras in those same places. A gate’s bulletin names the day’s swarm.",
          },
          {
            title: "Black 2 and White 2",
            body: "Farfetch’d on Route 1, Natu on Route 5, Furret on Route 7, Quagsire on Route 8, Swalot on Route 9, Masquerain on Route 11, Doduo on Route 12, Swellow on Route 13, Fearow on Route 15, Pineco on Route 16, Hoppip on Route 18, Hypno in the Dreamyard, Hippowdon in the Desert Resort, Slowpoke at the Abundant Shrine, and Cacturne on Reversal Mountain. Black 2 has Volbeat on Route 3, Plusle on Route 6, Sudowoodo on Route 20, and Ariados on Route 22. White 2 has Illumise, Minun, Mr. Mime, and Ledian in those same places. The two versions do not always share the day’s swarm.",
          },
        ],
      },
      {
        title: "Hoenn Sound and Sinnoh Sound",
        status: "planned",
        body: "In HeartGold and SoulSilver, Pokémon March on the Pokégear becomes Hoenn Sound on Wednesday and Sinnoh Sound on Thursday. While that show is playing, these Pokémon appear in the grass, caves, and forests below. The radio has to be turned back on after each battle.",
        points: [
          {
            title: "Hoenn Sound on Wednesday",
            body: "Zigzagoon and Spinda in Sprout Tower, the Bell Tower, and the Burnt Tower. Linoone and Whismur on Routes 6, 9, 10, 13, 21, 22, 24 through 28, 30 through 32, 35, 42 through 45, and 47, in the Ruins of Alph, and on Mt. Silver. Plusle and Minun on Routes 1 through 5, 7, 8, 11, 14 through 18, 29, 33, 36 through 39, 46, and 48, and in the National Park. Numel and Spoink in Ilex Forest and Viridian Forest. Makuhita and Absol in Slowpoke Well, Union Cave, Mt. Mortar, Dark Cave, the Whirl Islands, Mt. Silver, the Ice Path, the Cliff Cave, Diglett’s Cave, Mt. Moon, Cerulean Cave, Rock Tunnel, the Seafoam Islands, Victory Road, and Tohjo Falls.",
          },
          {
            title: "Sinnoh Sound on Thursday",
            body: "Meditite and Chatot in the three towers. Bidoof and Buizel on the same routes as Linoone, plus the Ruins of Alph and Mt. Silver. Shinx on the same routes as Plusle, and in the National Park. Budew and Carnivine in Ilex Forest and Viridian Forest. Chingling and Bronzor in the same caves as Makuhita.",
          },
        ],
      },
      {
        title: "The Great Marsh",
        status: "planned",
        body: "In Diamond, Pearl, and Platinum, the binoculars above the Great Marsh show which rare Pokémon are in each of the six areas that day. That set is worked out from the date. In Platinum the rare Pokémon are Tangela, Yanma, Tropius, Roselia, Staravia, Skorupi, Croagunk, Carnivine, and, after the National Pokédex, Paras, Exeggcute, Kangaskhan, Shroomish, Gulpin, Kecleon, Drapion, and Toxicroak. Diamond and Pearl use the same list without Drapion, Toxicroak, or Kecleon.",
      },
      {
        title: "Unova’s season",
        status: "planned",
        body: "In Black, White, Black 2, and White 2, the month sets the season. Wild Pokémon change with spring, summer, autumn, and winter on Routes 6, 7, and 8, on Twist Mountain, in Icirrus City, in the Moor of Icirrus, in Dragonspiral Tower, and in Undella Bay. Deerling and Sawsbuck take that season’s form.",
      },
      {
        title: "Island Scan",
        status: "planned",
        body: "In Sun, Moon, Ultra Sun, and Ultra Moon, a full Island Scan gauge reveals one Pokémon for the island you are on. The species is fixed by the weekday. You have one hour to find it, and it does not call for help.",
        points: [
          {
            title: "Sun and Moon",
            body: "Sunday is Cyndaquil on Route 3, Gothita on Route 6, Rhyhorn on Blush Mountain, and Eelektross in Poni Grove. Monday is Totodile in Seaward Cave, Spheal on Route 7, Swinub in Tapu Village, and Conkeldurr on Poni Plains. Tuesday is Deino in Ten Carat Hill, Luxio on Route 8, Duosion on Route 16, and Togekiss in the Poni Gauntlet. Wednesday is Horsea in Kala’e Bay, Honedge on the Akala Outskirts, Roselia in Ula’ula Meadow, and Leavanny in Poni Meadow. Thursday is Klink in Hau’oli City, Venipede on Route 4, Staravia on Route 10, and Serperior on Exeggutor Island. Friday is Chikorita on Route 2, Bellsprout on Route 5, Vigoroth on Route 11, and Samurott in Poni Wilds. Saturday is Litwick in Hau’oli Cemetery, Marill on Brooklet Hill, Axew on Mount Hokulani, and Emboar on Ancient Poni Path.",
          },
          {
            title: "Ultra Sun and Ultra Moon",
            body: "Sunday is Charmander on Route 3, Ralts on Route 6, Rhyhorn on Blush Mountain, and Eelektross in Poni Grove. Monday is Squirtle in Seaward Cave, Spheal on Route 7, Swinub in Tapu Village, and Aggron on Poni Plains. Tuesday is Onix in Ten Carat Hill, Combusken on Route 8, Prinplup on Route 16, and Rotom in the Poni Gauntlet. Wednesday is Horsea in Kala’e Bay, Honedge on the Akala Outskirts, Grotle in Ula’ula Meadow, and Leavanny in Poni Meadow. Thursday is Scatterbug in Hau’oli City, Beedrill on Route 4, Pidgeot on Route 10, and Chesnaught on Exeggutor Island. Friday is Bulbasaur on Route 2, Grovyle on Route 5, Monferno on Route 11, and Greninja in Poni Wilds. Saturday is Litwick in Hau’oli Cemetery, Marshtomp on Brooklet Hill, Axew on Mount Hokulani, and Delphox on Ancient Poni Path.",
          },
        ],
      },
      {
        title: "Mirage spots",
        status: "planned",
        body: "In Omega Ruby and Alpha Sapphire, one Mirage spot appears each day and is worked out from the date. A few legendaries also follow the weekday or the clock. StreetPass can add more spots, and those are not part of the day’s calculation.",
        points: [
          {
            title: "Mirage Caves",
            body: "West of Rustboro City: Boldore, Graveler, Klink, and Tynamo. South of Route 107: Unown. North of Fallarbor Town: Slowpoke and Tynamo. North of Fortree City: Excadrill, Klink, Onix, and Tynamo. North of Route 122: Ditto, Excadrill, and Tynamo. North of Route 124: Boldore, Cofagrigus, Graveler, and Klink. South of Pacifidlog Town: Cofagrigus, Slowpoke, and Tynamo. The southeastern sea: Boldore, Graveler, Onix, and Tynamo.",
          },
          {
            title: "Mirage Forests",
            body: "West of Route 105: Forretress, Graveler, and Happiny. South of Route 109: Audino and Sunkern. North of Route 111: Kricketune and Larvesta. West of Route 114: Petilil, Purugly, Sunkern, and Tangela. North of Lilycove City: Cherrim, Purugly, Sunkern, and Tangela. East of Mossdeep City: Cinccino, Glameow, Sunkern, and Tangela. North of Route 124: Purugly, Sunkern, Tangela, and Vulpix. South of Route 132: Audino, Petilil, and Sunkern.",
          },
          {
            title: "Mirage Islands",
            body: "West of Route 104: Darmanitan, Venomoth, Xatu, and Zebstrika. West of Dewford Town: Tangela, Venomoth, Xatu, and Zebstrika. Next to Route 114: Darmanitan and Larvesta. On Route 124: Persian, Venomoth, Xatu, and Zebstrika. East of Route 125: Porygon and Purugly. South of Pacifidlog Town: Audino, Binacle, Graveler, and Xatu. On Route 132: Ditto and Munna. South of Route 134: Graveler, Maractus, Venomoth, Xatu, and Zebstrika.",
          },
          {
            title: "Mirage Mountains",
            body: "West of Route 104: Donphan, Forretress, Kricketune, and Sawsbuck. North of Lilycove City: Donphan, Forretress, Kricketune, and Rufflet. East of Mossdeep City: Audino, Happiny, and Tangela. North of Shoal Cave: Darmanitan and Magby. South of Route 129: Elekid and Zebstrika. South of Route 131: Donphan, Forretress, Girafarig, and Kricketune. The northeastern sea: Donphan, Forretress, Kricketune, and Vullaby. The southeastern sea: Crustle, Graveler, Munna, Porygon, and Xatu.",
          },
          {
            title: "A legendary on the clock",
            body: "Cresselia can be the day’s spot on Crescent Isle, southeast of Route 129. On the Pathless Plain, south of Route 131, Cobalion appears on Sunday, Wednesday, and Friday, Terrakion on Tuesday and Saturday, and Virizion on Monday and Thursday, if three Pokémon in the party have maximum effort. In the Nameless Cavern near Sootopolis, with three Pokémon at maximum happiness, Uxie appears from 8:00 to 9:00 p.m., Azelf from 4:00 a.m. to 8:00 p.m., and Mesprit from 9:00 p.m. to 4:00 a.m. In the Trackless Forest, east of Petalburg Woods, with Lugia or Ho-Oh in the party, Raikou appears in the first 20 minutes of an hour, Entei in the next 20, and Suicune in the last 20.",
          },
        ],
      },
    ],
  },
];
