# User actions

This is the contract for how Retro Pokédex is supposed to behave. A test should follow an action here and expect the outcome written here. If the running app does something else, the app is wrong.

Each item is one thing a player can do, then what should happen. Examples use a specific Pokémon only to make the rule concrete: Alolan Vulpix stands for a regional form, Blue Floette for a variant, Charizard for an ordinary species.

Features that are not built yet are listed at the end. Do not treat them as missing behavior.

## Rules that apply everywhere

**A mark belongs to one save.** The game in the header is the save. Caught and shiny are stored separately for each save. Marking Charizard caught in Scarlet / Violet does not mark it caught in Sword / Shield.

**The button shows that save.** On the dashboard, Pokédex, checklist, and a Pokémon’s page, Normal is on only when the save in the header has that Pokémon caught. Shiny works the same way. Switching the header game updates the buttons to that save. My Collection is the exception: it combines every save, and it is described in its own section.

**You can mark a Pokémon only where you can get it.** A Pokémon can be marked in a save when it can be caught, received, or evolved there without a trade. Alakazam is offered on games where it can be obtained without trading, and left off games where a trade is the only way. When it cannot be obtained in the save in the header, Normal and Shiny are replaced by “Not in {game}” and clicking does nothing.

**Male and Female exist only on a Pokémon’s page, and only for the save in the header.** Female Pikachu on Scarlet / Violet stays off while the header is Sword / Shield. Choosing Male or Female on a save that is not marked yet also marks that Pokémon caught or shiny on that save. Turning Normal off clears Male and Female for that save. Turning Shiny off clears the shiny genders. Other saves keep their own genders.

**A guest and an account are different trackers.** With no account, marks stay in this browser. They are still there after a refresh and after closing the tab. They are not on another browser or another device.

**Signing in makes the account the tracker.** Marks that exist on either side are kept: a guest mark and an account mark for the same Pokémon and save are combined, and a gender set on either side stays on. After that merge, this browser’s guest copy is cleared. Refreshing while signed in shows the account, not an old guest copy. If the account cannot be reached, the marks already on screen stay, and the player sees that the save did not finish.

**Logging out leaves the account on the server.** The next screen is the dashboard, signed out. The guest tracker is empty until the player marks something new. Those new guest marks merge again the next time that person signs in.

**A specimen adds to the mark for its save.** Adding or uploading a specimen records that Pokémon and turns on Normal or Shiny for the save it belongs to, including the gender on the specimen. A mark already stored on that save stays, and so does every other save. A normal female Charizard marked in Red stays female and normal when a shiny male Charizard from Platinum is uploaded; Platinum then shows that shiny male as well, and a normal female already marked in Platinum stays too. Deleting a specimen removes that specimen and only the mark flags that came from it. A mark the player set by hand stays.

**Language follows the player.** EN and ES switch every label the app writes: game names, region names, types, form names, and the page title. The choice is still selected the next time the site opens. A Pokédex overview or entry that has not been written in Spanish stays in English. Names that come from the games stay as returned.

**The last list is remembered.** Opening a Pokémon from the Pokédex, the checklist, or My Collection, then choosing Back, returns to that list, including the generation, region, or form list that was open. Search text and status filters belong to the visit: leaving that list through the header clears them.

**The address is the page.** Refreshing a game, a list, a region, a form list, or a Pokémon opens that same page. Search text and the All / Missing / Shiny filters are not part of the address. An unknown address opens the dashboard. A Pokémon number outside 1–1025 opens that game’s Pokédex. A form that Pokémon does not have opens the base species.

## Navigation

These controls are on every page except where a section says they are hidden. On a narrow screen they live in the menu button instead of the bar. Opening the menu and choosing an item does the same thing as the bar, then closes the menu. Escape, or a click outside the menu, closes it without changing the page.

**Choose the Retro Pokédex logo.** The dashboard opens for the save in the header. Global Collection uses the site address itself. Any other save uses that save’s address.

**Choose Dashboard.** Same as the logo.

**Choose Pokédex.** The Pokédex opens for the save in the header. Coming from the checklist, My Collection, or a Pokémon keeps the open generation or region, and Exclusives is cleared back to All. Coming from anywhere else opens that save’s own generation, with an empty search and All selected. Global Collection has no generation of its own, so it opens the national list.

**Choose My Collection.** The combined collection opens. Search, the status filter, and the region filter reset. The game selector is hidden, because this list is not one save.

**Choose Checklist.** The checklist opens for the save in the header. Coming from the Pokédex, My Collection, or a Pokémon keeps the open generation or region. Coming from anywhere else opens that save’s own generation, with an empty search and All selected.

**Choose Scan.** The scan page opens for the save in the header.

**Choose a game in the header.** That save becomes the current one, and the page stays the same kind of page. A Pokémon stays on that Pokémon. Scan stays on scan. The Pokédex and checklist drop a region filter and open that save’s own generation. The dashboard opens that save’s dashboard. My Collection does not offer this selector.

**Choose the info button beside the game selector.** A short explanation opens: this selector is the save, and marks, specimens, spawn maps, and learnsets follow it. A click outside, or Escape, closes it.

**Choose Sign in, while signed out.** The create-account page opens.

**Choose Log in, while signed out.** The log-in page opens.

**Choose the name in the header, while signed in.** A menu opens with the trainer name, the email, and the role when the role is not a normal player. Escape or a click outside closes it.

**Choose Log out in that menu.** The session ends. The dashboard opens, signed out, with an empty guest tracker. The account’s marks and specimens remain on the account.

**Choose EN or ES.** The site switches to that language immediately, including the title in the browser tab. The other language’s suggestion is dismissed. On a narrow screen the same two choices are inside the menu.

## Account creation

The create-account page asks for an email and a password. Google and Microsoft appear only when that provider is turned on.

**Submit an email and a password of at least 8 characters.** No session starts. The page says to confirm the email. When mail is being sent, the message says to check the inbox and no link is shown on the page. When mail is not being sent, the page also shows a confirmation link. The account’s display name is the part of the email before @.

**Submit a password shorter than 8 characters.** The account is not created. The form asks for at least 8 characters.

**Submit an email that already has a confirmed account.** The account is not created and the password is not changed. The page says an account with that email already exists.

**Submit an email that was registered but never confirmed.** The password is replaced with the new one. A fresh confirmation is issued. The player is still not signed in.

**Open the confirmation link while it is valid.** The email is confirmed, a session starts, and the dashboard opens signed in.

**Open a confirmation link that is missing, expired, or already used.** The login page opens with “That confirmation link is invalid or expired.” No session starts. The link expires 48 hours after it was issued.

**Choose Google or Microsoft.** The browser leaves for that provider. A successful return opens the dashboard signed in. The account is created on the first success and reused after that. A cancelled or failed return opens the login page with a sign-in failure. No session starts.

**Choose Log in under the form.** The login page opens, and any error on the create-account page is cleared.

**Choose Continue without an account.** The dashboard opens. No account is created and no session starts. Guest marks in this browser are unchanged.

## Log in

**Submit the email and password of a confirmed account.** A session starts and the dashboard opens. The header shows the trainer name.

**Submit a wrong email or password.** The page says the email or password is incorrect. No session starts. The message is the same when the email is unknown and when the password is wrong.

**Submit a correct password for an account that has not confirmed its email.** The page says to confirm the email. A new confirmation is issued, with the same on-page link rule as account creation. No session starts.

**Choose Sign in under the form.** The create-account page opens.

**Choose Continue without an account.** Same as on the create-account page.

**Choose Forgot password with the email field empty.** The page asks for an email. Nothing is sent.

**Choose Forgot password with an email filled in.** The page always says that a reset link was sent if that account exists. A link is actually sent only when that email belongs to a confirmed password account. An unknown email, an unconfirmed account, and a Google-only or Microsoft-only account all show the same sentence and send nothing. The link opens this site’s login page, not the API.

**Open a valid reset link.** The login page becomes a new-password form. The email field is hidden. Google and Microsoft are hidden. The title says this is a password reset.

**Save a new password of at least 8 characters from that form.** The password is replaced, a session starts, and the dashboard opens. The reset link cannot be used again.

**Save a shorter password, or open an expired or used reset link.** The password is not changed. No session starts. The page says the link is invalid or expired, or that the password is too short.

## Dashboard

The dashboard is the home page. It explains what the site does, then offers search, progress, recent catches, regions, form lists, and three shortcuts.

**Search with at least two letters.** Cards appear for species and forms whose names contain those letters. “char” includes Charizard. Fewer than two letters shows nothing.

**Search with a National Dex number.** That species’s card appears. 6 is Charizard. A number with no species shows no results.

**Clear the search.** The results disappear. The rest of the dashboard stays.

**Choose a search result’s picture, name, or number.** That Pokémon’s page opens. A form result opens that form. Blue Floette opens Blue Floette, not Floette.

**Choose a region box, from Kanto through Paldea.** Global Collection’s Pokédex opens on the species introduced in that region. Search and status filters are cleared. The only scope chip is that region’s name, and choosing it again does not change the list.

**Choose Mega Evolutions, Gigantamax, or Regional Forms.** That form list opens in the Pokédex. A Mega or Gigantamax box shows a count and no catch percentage, because those forms cannot be caught on their own. Regional Forms show how many are marked caught or shiny.

**Choose Resume.** The Pokédex opens on the current save’s own generation.

**Choose the missing shortcut.** The Pokédex opens on the national list with Missing selected: a species is hidden once it is caught or shiny on any save.

**Choose the shinies shortcut.** The Pokédex opens on the national list with Owned Shiny selected.

**Choose a Last caught card.** That species or form opens. The list is the most recently marked Pokémon, not one row per save.

**Hover a grayscale sprite.** It fills in with color.

**See the language suggestion.** When this connection is in a country that uses the other language, a prompt offers to switch. Mexico or Spain can offer Spanish while the site is in English. The prompt stays hidden when the site is already in that language, or when this suggestion was already accepted or declined.

**Accept the suggestion.** The site switches to that language.

**Decline the suggestion.** The language stays, and that suggestion is not offered again.

## Pokédex

The list is the species in the selected scope, for the save in the header. Each card shows the National Dex number, the sprite, the name, the types, the saves where it is marked, and Normal and Shiny when it can be obtained in the header save.

**Choose Regional.** The list is that save’s regional Pokédex. The choice is remembered for that save.

**Choose National.** The list is every species that save can contain. The choice is remembered.

**Choose the generation chip.** The list is the species introduced in that save’s generation. Scarlet / Violet offers Gen IX. Global Collection has no generation chip. The choice is remembered.

**Open a form list from the dashboard.** The scope chips are replaced by that list’s name: Mega Evolutions, Gigantamax, or Regional Forms. Mega and Gigantamax cards show the sprite and the name, and they have no Normal or Shiny buttons. Regional forms that can be caught have their own buttons.

**Type in Search.** The current list narrows to names or National Dex numbers that contain the text. The address does not change. Clearing the box restores the list.

**Choose All.** Every species in the scope is eligible.

**Choose Missing.** A species is hidden if it is caught or shiny on any save.

**Choose Missing Normal.** A species is hidden if it is caught on any save. A shiny-only species stays.

**Choose Missing Shiny.** A species is hidden if it is shiny on any save.

**Choose Owned Normal.** Only species caught on at least one save.

**Choose Owned Shiny.** Only species shiny on at least one save.

**Choose a card’s picture, name, or number.** That Pokémon’s page opens.

**Choose Normal or Shiny on a card.** The mark toggles on the save in the header, following the marking rules. The button’s on state is that save, not the combination of every save.

**Choose a game tag on a card.** The move dialog opens for that save. See Moving a mark.

**Choose the scope info button.** A short explanation of Regional, National, and the generation opens. On a region list, the explanation names that region instead.

A list with nothing left after the filters says there are no results. While the species index or a regional Pokédex is loading, the page says so and shows Pikachu running.

## Checklist

The checklist uses the same scopes, search, and status filters as the Pokédex, plus Exclusives. Each row is one species: number, sprite, name, how to get it in the header save, a Spawns button, and Normal and Shiny.

**Choose Exclusives.** Only species that one version of the selected pair can obtain are listed. Each of those rows names the version, such as exclusive to X or exclusive to Y. While that list is still being worked out, the page says it is finding version exclusives.

**Read the method.** The row says how to get that Pokémon in the header save, such as Wild, Gift, Event, or Pokédex. When the only wild method is a rod or a field move, the row says so. Magikarp in Red and Blue says the Old Rod and the Super Rod. A Pokémon you can also walk into still says a wild encounter. While the method is loading, the row says it is checking.

**Choose Spawns.** That Pokémon’s page opens on Where it spawns.

**Choose the number, sprite, or name.** That Pokémon’s page opens on Home.

**Choose Normal or Shiny.** Same marking rules as the Pokédex. The mark is for the save in the header.

## My Collection

The list is every Pokémon marked caught or shiny on any save, plus any Pokémon that has an uploaded specimen. Mega Evolutions and Gigantamax are left off. The game selector is hidden. An Ultra Ball on a card means a specimen has been uploaded, even when Normal is off.

**Choose a region.** The list keeps Pokémon whose origin is that region. Alolan Vulpix counts for Alola, not Kanto. A species with no regional form uses the region it was introduced in. All regions clears the filter.

**Choose All, Normal, Shiny, Alternate Forms, or Variants.** All shows the whole collection. Normal keeps Pokémon marked caught. Shiny keeps Pokémon marked shiny. Alternate Forms are catchable forms with their own identity, such as Alolan Vulpix. Variants are extra appearances, such as Blue Floette. A Pokémon can match more than one filter; each filter shows its own set.

**Search.** Same name and National Dex number match as the Pokédex.

**Choose a card.** That species or form opens.

**Choose Normal or Shiny.** The button shows the combined mark: on when any save has it. Turning it off clears that mark on every save that had it, including the genders for that mark. Turning it on records it on the save that was selected before My Collection was opened, and only if that Pokémon can be obtained there. The game tag updates to match.

**Choose a game tag.** The move dialog opens for that save.

An empty collection says to mark a Pokémon or upload a specimen. Filters that match nothing say there are no results.

## Marking

These rules are what Normal, Shiny, Male, and Female do on the dashboard, Pokédex, checklist, My Collection, and a Pokémon’s page.

**Turn Normal on.** That Pokémon is caught on the save the button writes to. The time is kept. Male and Female stay off until the player chooses one.

**Turn Normal off.** Caught is cleared on that save, and so are Male and Female for the normal mark. Shiny is left as it was.

**Turn Shiny on.** Shiny is set on that save. Caught is not required, and it is not turned on by this button.

**Turn Shiny off.** Shiny is cleared on that save, and so are the shiny genders. Caught is left as it was.

**Turn Male or Female on from a Pokémon’s page.** That gender is set for Normal or for Shiny on the save in the header. If that mark was off, it turns on.

**Turn the same gender off.** Only that gender clears. The caught or shiny mark stays on.

**Mark a form.** Alolan Vulpix, Eternal Floette, and Blue Floette each have their own caught and shiny marks. Marking the form does not mark the base species, and marking the base species does not mark the form.

**Try to mark a Pokémon the save cannot contain.** Nothing is stored. The control reads “Not in {game}”.

**Try to mark a Mega Evolution or a Gigantamax form.** There is no catch control. Those forms are not caught on their own.

A signed-in change is stored on the account. A guest change is stored in this browser. If a signed-in save fails, the screen returns to the marks the account still has.

Sprites follow the marks. A caught or shiny Pokémon is in color. One that is not marked is dimmed on the Pokédex, the checklist, and the dashboard. A species with both male and female marks shows both sprites when the two look different. On a Pokémon’s page the pair follows the save in the header: the normal sprite uses that save’s normal genders, and the shiny sprite uses that save’s shiny genders.

## Moving a mark

**Choose a game tag on a marked card.** A dialog opens named for that Pokémon. It says which save the mark is on now. The games listed are the ones where it can be caught, received, or evolved without a trade, grouped by generation, with Global Collection in its own column. The current save stays in the list even if a later data change would have removed it. Apply stays disabled until a different save is selected.

**Choose another save and Apply.** The mark leaves the old save and joins the new one. Caught, shiny, genders, and the original times all move. If the new save already has a mark, the two combine: a gender or a shiny that was on either side stays on. The old save no longer lists this Pokémon. The dialog closes.

**Choose Cancel, Close, Escape, or the backdrop.** The dialog closes and every mark stays where it was.

**Open the dialog while the obtainability check is still running.** The games are not listed yet. The dialog says it is checking.

**Open the dialog when that check fails.** Every save is listed, and the dialog says the check failed. Apply still moves the mark.

## A Pokémon’s page

The page shows the species or the form in the address, for the save in the header.

**Choose Back.** The previous list opens: Pokédex, checklist, or My Collection. The button is named for that list.

**Choose the previous Pokémon.** The species one National Dex number lower opens, on the same section. On number 1 the control does not go anywhere.

**Choose the next Pokémon.** The species one number higher opens, on the same section. On number 1025 the control does not go anywhere. Previous and next move by species, not by form.

**Choose Home, Where it spawns, Moves, or My Specimens.** That section opens and the address records it. Home has no extra segment. These four tabs are hidden on a Mega Evolution or a Gigantamax page, which stays on the identity only: sprite, types, and form switcher. That page has no Pokédex entry, no abilities, no natures, no wild locations, no moves, and no specimens.

**Choose a form.** That form’s page opens. Alternate forms and variants are grouped. Blue Floette is under Variants. Eternal Floette and Alolan Vulpix are under Alternate forms. The base species is in the group you came from, so you can get back to it. A colored Poké Ball sits on a form you have marked caught.

**Choose a member of the evolution line.** That species opens. The line states the requirement, including a method that is not a level. Sylveon includes high friendship and a Fairy-type move. Malamar includes holding the console upside down. Escavalier includes the trade for Karrablast. A caught member shows a Poké Ball.

**Read Games.** The box lists where the form on screen can be obtained, and the method, such as Wild, Gift, Event, or Pokédex. The Teal Mask, the Indigo Disk, the Isle of Armor, and the Crown Tundra are their own lines, not folded into the base game.

**Choose the rarity info button.** A short explanation of that rarity opens: legendary, mythical, pseudo-legendary, fossil, or starter. The border color matches the rarity on the card, the checklist row, and this page. Pseudo-legendary violet covers the whole evolutionary line.

**Choose Normal, Shiny, Male, or Female.** The marking rules apply to this form and to the save in the header. Under the buttons, the page lists every save where this form is caught or shiny. With none, it says it is not recorded.

**Read the overview and the Pokédex entry.** They follow the site language when a translation exists. The entry is the one for the save in the header. If that save has none, the page says so.

**Read abilities and natures.** Abilities name the hidden one. An ability or nature that appears on a saved specimen for this species is marked collected.

**Read the stats.** The stat name, the bar, and the number share one row. The names use one width, and the number stays on the right.

**Read matchups.** Defensive and offensive type matchups are shown for the types on screen. Nothing on this block is a control.

### Where it spawns

The section is the wild encounters for the save in the header.

**Choose a region on the map.** That region’s map is the one on screen. The table under the map still lists every region, not only the selected one. A town or route where this Pokémon appears stays a red Poké Ball. The others are gray.

**Open a region that has no map yet.** The page says an interactive map is not available for that region and points to the table. Alola and Paldea do this. Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, and Galar draw a map. Galar’s Wild Area is still a gap in the middle.

**Read a row in the table.** It names the place, the games, and the rate. While encounters are loading, Pikachu runs. If this save has no wild encounters, the page says so.

### Moves

**Read the Smogon sets.** Recommended sets load for this Pokémon. The credit link opens Smogon in a new tab. If Smogon has nothing, the page says so.

**Read the Gemini sets.** Suggested sets load, limited to moves this Pokémon can learn in the save in the header. A normal player cannot refresh them.

**Read the learnset.** Moves are grouped by how they are learned, for the save in the header. Global Collection shows the learnset across games. If the Pokémon is not in the header save, the learnset says it is not available there instead of listing moves.

### My Specimens

This section is the individual Pokémon saved for this species. It requires an account.

**Open it while signed out.** The page says to sign in. There is no add button and no upload button.

**Choose Add, while signed in.** A form opens for the save in the header. The player sets normal or shiny, gender, a nickname of at most 40 characters, a level from 1 to 100, an ability, a nature, IVs from 0 to 31, and EVs from 0 to 252. Empty nickname, level, and stats are allowed.

**Save that form.** The specimen is stored on the account, under this species and the header save. The form closes. The specimen appears in the list, grouped by save. That save’s mark gains Normal or Shiny and the gender from the specimen. Marks already on that save, and marks on other saves, stay. Cancel, Close, Escape, or the backdrop closes the form and stores nothing.

**Choose Upload.** A file picker accepts a Pokémon file (`.pk1` through `.pk9`, or `.pb7`).

**Pick a file for this species.** A preview shows the parsed Pokémon, including its gender and the save it was met in. Save stores that specimen. The list refreshes.

**Pick a file for a different species.** The file is rejected and nothing is stored. The message names both the file’s species and the page’s species.

**Pick a file that cannot be read.** Nothing is stored. The page says the file could not be read.

**Choose Remove on a specimen.** That specimen is deleted. Mark flags that came only from it are cleared. Other specimens and any hand-set catch marks stay, on this save and on every other save. If the delete fails, the specimen stays and the page says so.

## Scan

Scan reads one screenshot of a 30-slot PC box. It is in the header. The player must be signed in.

**Open Scan while signed out.** The box tools are hidden. The page says a login is required and offers Sign in and Log in. Those open the create-account and login pages.

**Open Scan while signed in.** The player can pick a source and upload. The page states which save the marks will be written to, and that the header game should be changed first if the box belongs to another save. It also explains how to get the picture off the console: the Nintendo Switch app, the console’s QR codes, or a file already on this computer.

**Choose a source.** One of Pokémon HOME, Pokémon Bank, Scarlet / Violet, Sword / Shield, Switch 2, or Switch. The 30 slots are cut from the screenshot using that layout. A tall Pokémon HOME image is treated as the phone layout. Pokémon Bank is experimental. The choice stays until the player changes it.

**Choose Upload with scans remaining.** A file picker opens for a PNG, JPEG, WEBP, or GIF.

**Choose a file that is not an image.** Nothing is uploaded. The page asks for an image of the box.

**Choose an image.** The page says it is checking each Pokémon. Each slot is then shown as the crop beside the matched sprite, with a confidence of Clear, Check, or Look. Nothing is written to the collection yet.

**Choose a slot.** That slot opens. The player can pick one of the suggested species, search by name or number and assign a species, mark the slot empty, or mark it occupied again. Shiny toggles only when a species is selected. Search with a number jumps to that species. Search with fewer than two letters and no number shows no list. A name search shows up to ten matches.

**Choose Cancel, Close, Escape, or the backdrop during the check or the review.** The screenshot is discarded. No marks change.

**Choose Mark when at least one slot has a species.** Each occupied, identified slot is marked caught on the save in the header. A slot flagged shiny is also marked shiny. An Alolan, Galarian, Hisuian, or Paldean match is stored as that regional form. A slot that is empty or still unidentified is skipped. Marks for Pokémon that were not in the box stay as they were. Gender marks stay as they were. The review closes and the page says how many were marked, and in which save.

**Choose the button when every slot is empty or unidentified.** The button says there is nothing to mark, and it does nothing.

**Fail to save.** The review stays open and says the marks could not be saved. The collection is unchanged.

**Fail to read the image.** The review does not open. The page says the screenshot could not be read.

**Use the allowance.** A new account may scan once. The next scan is offered 48 hours after the account was created. After that, the account may scan 2 screenshots every 24 hours. The page shows how many are left, and the time when the next one is available. Upload is disabled at zero. A scan that fails before a reading is returned does not spend the allowance. A scan that returns a review does.

**Hit the shared daily budget.** Upload is disabled for every non-staff account. The page says the global daily limit is reached and to try again tomorrow.

## Changelog, roadmap, privacy, and terms

The footer on every page links to these. The game selector is hidden on all four. The language switch stays.

**Choose Changelog.** A page lists player-visible changes, newest release first.

**Choose Roadmap.** A page lists what is still planned. Shipped work is not repeated here.

**Choose Privacy or Terms.** That document opens in the site language. Links inside it open the named page. An external link opens in a new tab. The page starts at the top.

**Choose PokéAPI in the footer.** The PokéAPI site opens in a new tab.

## Staff

A normal player never sees these. An admin or a developer does.

**Import Pokémon files from the dashboard.** The tool accepts many files or a folder of `.pk1` through `.pk9` and `.pb7` files. Each readable file becomes a specimen on the save it was met in, including another copy of the same filename and size. An unreadable file is skipped and the other files are still saved. The page reports how many were saved and how many were skipped. My Collection and Last caught include the new specimens after the import finishes.

**Choose Refresh on Gemini movesets.** That Pokémon’s suggested sets are generated again for the save in the header and replace the ones on screen. A failure leaves the old sets and shows the error.

**Scan as staff.** The personal once-per-new-account limit, the 2-per-day limit, and the shared daily budget do not block an admin or a developer.

## What the site does without a click

**A new version is published.** An open tab reloads once so it runs the new page and the new API. It does not reload in a loop.

**The species list is already in this browser.** The Pokédex uses that copy and does not wait on a full reload. If the copy is missing, it downloads the list and then shows it.

**Signed-in marks and guest marks both exist at the moment of sign-in.** They merge under the rules at the top, then the guest copy is removed.

## Not part of this app

These are not actions, and a test should not expect them. A public share link, an export file, a PC-box grid of the collection, progress by evolution family, Unown or Vivillon pattern lists, ball and ribbon goals, Alpha or size marks, a shiny-hunt counter, an event-distribution checklist, a breeding guide, search that starts from a move or a route, and a damage calculator.
