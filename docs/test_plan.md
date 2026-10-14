# Test plan

Use cases for Retro Pokédex. Each one is a behavior from [user_actions.md](user_actions.md), written so a test can fail when the app does something else. If a case and that contract disagree, the contract wins and the case should be corrected.

A case is one situation. Related clicks that share a setup stay in one case. A different outcome gets its own case.

## Actors

| Actor | What they have |
| --- | --- |
| Guest | No session. Marks, if any, live only in this browser. |
| New trainer | An account that has never confirmed its email. |
| Trainer | A confirmed email account, signed in. Display name is the part of the email before `@` unless a name was set. |
| Provider trainer | An account that can sign in only with Google or Microsoft. No password. |
| Staff | A confirmed admin or developer. |

Saves used below are the names in the header. Global Collection is the save with no generation of its own. Scarlet / Violet and Sword / Shield are two different saves. Red / Blue and X / Y are used where the contract names them.

Pokémon used as fixtures:

| Pokémon | Stands for |
| --- | --- |
| Charizard | An ordinary species, National Dex 6. |
| Pikachu | A species whose male and female can be marked apart. |
| Alolan Vulpix | A regional form. Origin is Alola, not Kanto. |
| Blue Floette | A variant. |
| Eternal Floette | An alternate form that plays differently from a flower color. |
| Alakazam | A trade evolution, absent from games where a trade is the only way. |
| Magikarp | A species whose only wild method in Red / Blue is a rod. |
| Charizard’s Mega and Gigantamax | Forms that cannot be caught on their own. |

## Cross-cutting

These hold on every screen that shows a mark. Later cases assume them and do not repeat the setup.

### UC-X-01 Marks are stored per save

**Given** a guest on Scarlet / Violet.  
**When** they mark Charizard caught.  
**Then** Charizard is caught on Scarlet / Violet only. Sword / Shield still shows Charizard unmarked.

### UC-X-02 The button shows the header save

**Given** Charizard is caught on Scarlet / Violet and not on Sword / Shield.  
**When** the player views Charizard on the dashboard, the Pokédex, the checklist, and Charizard’s page with Scarlet / Violet selected, then switches the header to Sword / Shield.  
**Then** Normal is on for Scarlet / Violet and off for Sword / Shield on all four screens. Shiny follows the same rule.

### UC-X-03 A Pokémon the save cannot contain cannot be marked

**Given** the header save cannot contain Alakazam except by trade.  
**When** the player opens Alakazam on that save.  
**Then** Normal and Shiny are replaced by “Not in {game}”. Choosing that label stores nothing.

### UC-X-04 Alakazam is offered where it can be obtained without a trade

**Given** a save where Alakazam can be caught, received, or evolved without a trade.  
**When** the player opens the move dialog or the mark buttons.  
**Then** that save is available, and a save where trading is the only way is not.

### UC-X-05 Gender belongs to one save, on the species page only

**Given** Pikachu is marked female on Scarlet / Violet.  
**When** the header is Sword / Shield.  
**Then** the female mark is off. The Pokédex, checklist, dashboard, and My Collection do not show Male or Female buttons. Only Pikachu’s page does.

### UC-X-06 Choosing a gender marks the Pokémon

**Given** Pikachu is not caught on the header save.  
**When** the player chooses Female under Normal.  
**Then** Pikachu is caught on that save, Female is on, and Male is off.

### UC-X-07 Turning a mark off clears its genders only

**Given** Pikachu is caught, female, and shiny on Scarlet / Violet, and female on Sword / Shield.  
**When** the player turns Normal off on Scarlet / Violet.  
**Then** Scarlet / Violet loses caught, Male, and Female. Shiny stays, including shiny genders. Sword / Shield is unchanged.

### UC-X-08 Guest marks stay in this browser

**Given** a guest marks Charizard caught.  
**When** they refresh, close the tab, and open the site again in the same browser.  
**Then** Charizard is still caught. A different browser shows Charizard unmarked.

### UC-X-09 Sign-in merges both trackers, then drops the guest copy

**Given** a guest has Charizard caught on Scarlet / Violet, and the trainer account has Charizard shiny on that same save.  
**When** the guest signs in as that trainer.  
**Then** the account has both caught and shiny. Refreshing shows the account. The guest copy in this browser is gone.

### UC-X-10 A gender on either side survives the merge

**Given** the guest has Pikachu female on Scarlet / Violet, and the account has Pikachu male on that save.  
**When** the guest signs in.  
**Then** both Male and Female are on for that save.

### UC-X-11 A failed signed-in save does not pretend it worked

**Given** a trainer is signed in and the account cannot be reached.  
**When** they toggle Charizard caught.  
**Then** the screen returns to the marks the account still has, and the player is told the save did not finish.

### UC-X-12 Logout keeps the account and clears the guest tracker

**Given** a trainer has Charizard caught, then logs out.  
**When** the dashboard opens.  
**Then** they are signed out and Charizard is unmarked in this browser. Signing in again shows Charizard caught. A new guest mark made after logout merges with the account on the next sign-in.

### UC-X-13 A specimen adds its mark and keeps marks already stored

**Given** Charizard is marked caught, normal, and female in Red / Blue, and also caught, normal, and female in Platinum.  
**When** the trainer uploads a shiny male Charizard from Platinum.  
**Then** Red / Blue still shows the normal female. Platinum shows the normal female and the shiny male.

### UC-X-14 Deleting a specimen removes only that specimen’s mark

**Given** the marks in UC-X-13, including the Platinum specimen.  
**When** they delete the Platinum specimen.  
**Then** the specimen is gone. Platinum no longer shows the shiny male. The normal female stays on Platinum and on Red / Blue.

### UC-X-15 Language persists and translates labels the app writes

**Given** the site is in English.  
**When** the player chooses ES, refreshes, and opens a species whose Spanish overview exists and one whose overview does not.  
**Then** the tab title, game names, regions, types, and form names are Spanish. Sword / Shield reads Espada / Escudo. The written overview follows Spanish when it exists and stays English when it does not. The choice is still ES on the next visit.

### UC-X-16 Back returns to the list that opened the Pokémon

**Given** the player opened Charizard from the checklist on a region list.  
**When** they choose Back.  
**Then** that checklist region list opens, and the button had been named for the checklist. The same is true for the Pokédex and for My Collection, including a form list.

### UC-X-17 Header navigation clears visit filters

**Given** the Pokédex search is “char” and Missing is selected.  
**When** the player leaves through the header and later opens the Pokédex from the dashboard.  
**Then** the search is empty and All is selected. Generation, region, and form list are kept only when the contract says the header action keeps them.

### UC-X-18 The address restores the page, not the filters

**Given** the player is on a game, a generation list, a region list, a form list, or Charizard’s Moves section.  
**When** they refresh.  
**Then** that same page opens. Search text and All / Missing / Shiny are not in the address, so a shared link does not carry them.

### UC-X-19 Bad addresses fall back

**When** the player opens an unknown path, a Pokémon number outside 1–1025, or a form Charizard does not have.  
**Then** an unknown path opens the dashboard. A bad number opens that game’s Pokédex. A missing form opens the base species.

## Navigation

On a narrow screen, every case in this section is also reachable from the menu. Choosing an item closes the menu. Escape, or a click outside, closes the menu and leaves the page unchanged.

### UC-NAV-01 Logo and Dashboard open this save’s home

**Given** Scarlet / Violet is selected.  
**When** the player chooses the logo, and again when they choose Dashboard.  
**Then** the Scarlet / Violet dashboard opens. With Global Collection selected, the address is the site root.

### UC-NAV-02 Pokédex from a list keeps the list context

**Given** the checklist, My Collection, or a Pokémon is open on a generation or region, with Exclusives selected on the checklist.  
**When** the player chooses Pokédex.  
**Then** that generation or region stays open and the status returns to All.

### UC-NAV-03 Pokédex from anywhere else resets to the save’s generation

**Given** the player is on the dashboard or Scan.  
**When** they choose Pokédex.  
**Then** that save’s own generation opens, search empty, All selected. Global Collection opens the national list.

### UC-NAV-04 My Collection resets its own filters and hides the game selector

**Given** a search, a status filter, and a region filter were set on a previous visit.  
**When** the player chooses My Collection.  
**Then** those three reset. The game selector is not on the page.

### UC-NAV-05 Checklist keeps context from a list, and resets from anywhere else

**Given** the Pokédex, My Collection, or a Pokémon is open on a generation or region.  
**When** the player chooses Checklist.  
**Then** that generation or region stays. From the dashboard or Scan, the checklist opens on that save’s own generation with search empty and All selected.

### UC-NAV-06 Scan follows the header save

**When** the player chooses Scan.  
**Then** Scan opens for the save in the header.

### UC-NAV-07 Changing the game keeps the kind of page

**Given** the player is on a Pokémon, on Scan, on the Pokédex or checklist with a region selected, or on the dashboard.  
**When** they choose Sword / Shield.  
**Then** the Pokémon stays that Pokémon. Scan stays Scan. The Pokédex and checklist drop the region and open Sword / Shield’s own generation. The dashboard opens Sword / Shield’s dashboard.

### UC-NAV-08 The game info button explains the save

**When** the player opens the info button beside the game selector.  
**Then** it says this selector is the save, and that marks, specimens, spawn maps, and learnsets follow it. A click outside, or Escape, closes it.

### UC-NAV-09 Signed-out account buttons

**Given** a guest.  
**When** they choose Sign in, then Log in.  
**Then** Sign in opens account creation. Log in opens the login page.

### UC-NAV-10 The signed-in name menu

**Given** a trainer, and again a staff user.  
**When** they open the name in the header.  
**Then** the menu shows the trainer name and email. Staff also see the role. A normal trainer does not see a role. Escape or a click outside closes the menu.

### UC-NAV-11 Log out

**Given** a trainer with marks on the account.  
**When** they choose Log out.  
**Then** UC-X-12 holds. The dashboard is the next screen.

### UC-NAV-12 Language buttons dismiss the other suggestion

**Given** a language suggestion is pending.  
**When** the player chooses EN or ES, including from the narrow-screen menu.  
**Then** the site switches immediately, the tab title changes, and that suggestion is not offered again.

## Account creation

Google and Microsoft are absent unless that provider is turned on. Mail-on and mail-off are two configurations of the same cases.

### UC-ACC-01 A valid email and password create an unconfirmed account

**Given** a new email and a password of at least 8 characters.  
**When** the player submits the form.  
**Then** no session starts. The page says to confirm the email. With mail on, no link is shown. With mail off, a confirmation link is shown. The display name is the part before `@`.

### UC-ACC-02 A short password is rejected

**When** the player submits a password shorter than 8 characters.  
**Then** no account is created, and the form asks for at least 8 characters.

### UC-ACC-03 A confirmed email cannot register again

**Given** a trainer already uses that email.  
**When** someone submits it again.  
**Then** no account is created, the password is unchanged, and the page says an account with that email already exists.

### UC-ACC-04 An unconfirmed email can be retried

**Given** a new trainer never confirmed the email.  
**When** they submit the same email with a new password.  
**Then** the password is replaced, a fresh confirmation is issued, and they are still signed out.

### UC-ACC-05 A valid confirmation link signs the trainer in

**Given** a confirmation link younger than 48 hours.  
**When** the player opens it.  
**Then** the email is confirmed, a session starts, and the dashboard opens signed in.

### UC-ACC-06 A bad confirmation link does not sign anyone in

**When** the player opens a missing, expired, or already used link.  
**Then** the login page opens with “That confirmation link is invalid or expired.” No session starts.

### UC-ACC-07 Google or Microsoft, first time and again

**Given** that provider is turned on.  
**When** the player completes it the first time, and later a second time.  
**Then** the first success creates the account and opens the dashboard signed in. The second success reuses that account. Cancelling or failing opens login with a sign-in failure and no session.

### UC-ACC-08 Switch to login, or skip

**Given** the create-account page is showing an error, and this browser has a guest mark.  
**When** the player chooses Log in.  
**Then** the login page opens and the error is gone.  
**When** they instead choose Continue without an account.  
**Then** the dashboard opens, no account is created, and the guest mark is unchanged.

## Log in and password reset

### UC-LOG-01 A confirmed trainer can log in

**When** they submit their email and password.  
**Then** a session starts, the dashboard opens, and the header shows the trainer name.

### UC-LOG-02 A wrong password and an unknown email look the same

**When** the player submits a wrong password, and when they submit an unknown email.  
**Then** both say the email or password is incorrect. No session starts.

### UC-LOG-03 An unconfirmed account cannot log in

**Given** a new trainer with the right password.  
**When** they submit it.  
**Then** the page says to confirm the email, a new confirmation is issued under the same mail-on / mail-off rule as UC-ACC-01, and no session starts.

### UC-LOG-04 Switch to account creation, or skip

**When** the player chooses Sign in, or Continue without an account.  
**Then** Sign in opens account creation. Continue opens the dashboard with no session.

### UC-LOG-05 Forgot password requires an email

**When** the player chooses Forgot password with the email empty.  
**Then** the page asks for an email and nothing is sent.

### UC-LOG-06 Forgot password does not reveal who has an account

**When** the player submits a confirmed trainer, an unknown email, a new trainer, and a provider trainer.  
**Then** every one of them sees that a reset link was sent if the account exists. A link is sent only for the confirmed trainer. The link opens this site’s login page.

### UC-LOG-07 A reset link becomes a new-password form

**When** the player opens a valid reset link.  
**Then** the email field, Google, and Microsoft are hidden. The title says this is a password reset.

### UC-LOG-08 Saving a new password signs the trainer in

**When** they save a password of at least 8 characters.  
**Then** the password is replaced, a session starts, the dashboard opens, and the link cannot be used again.

### UC-LOG-09 A short password or a dead link changes nothing

**When** they save a shorter password, or open an expired or used link.  
**Then** the password is unchanged, no session starts, and the page says the password is too short or the link is invalid or expired.

## Dashboard

### UC-DSH-01 Name search

**When** the player types “char”, and when they type a single letter.  
**Then** “char” shows Charizard. One letter shows nothing.

### UC-DSH-02 Number search

**When** the player searches 6, and when they search a number with no species.  
**Then** 6 shows Charizard. The unknown number shows no results.

### UC-DSH-03 Clearing search restores the dashboard

**Given** results are showing.  
**When** the player clears the box.  
**Then** the results disappear and the rest of the dashboard stays.

### UC-DSH-04 A result opens that Pokémon, including a form

**When** the player opens Charizard’s card, and when they open a Blue Floette result.  
**Then** Charizard’s page opens. Blue Floette opens Blue Floette, not Floette.

### UC-DSH-05 A region box opens that region on Global Collection

**When** the player chooses a region from Kanto through Paldea.  
**Then** Global Collection’s Pokédex lists species introduced in that region. Search and status are cleared. The only scope chip is the region name, and choosing it again does not change the list.

### UC-DSH-06 Form boxes

**When** the player looks at Mega Evolutions, Gigantamax, and Regional Forms, then opens each.  
**Then** Mega and Gigantamax show a count and no catch percentage. Regional Forms show how many are marked caught or shiny. Each box opens that list in the Pokédex.

### UC-DSH-07 Resume, missing, and shinies

**When** the player chooses Resume, the missing shortcut, and the shinies shortcut.  
**Then** Resume opens the current save’s own generation. Missing opens the national list with Missing selected, hiding a species that is caught or shiny on any save. Shinies opens the national list with Owned Shiny selected.

### UC-DSH-08 Last caught opens the latest species or form

**Given** the player marked Blue Floette more recently than Charizard.  
**When** they look at Last caught and open Blue Floette.  
**Then** the list is one row per Pokémon, not one row per save, and Blue Floette’s page opens.

### UC-DSH-09 An unmarked sprite is dim until hover

**Given** Charizard is not marked.  
**When** the player hovers the sprite on the dashboard.  
**Then** it was grayscale and fills in with color.

### UC-DSH-10 The language suggestion follows the country and is asked once

**Given** the site is English and the connection is in Mexico or Spain.  
**When** the dashboard loads.  
**Then** it offers Spanish. It stays hidden if the site is already Spanish, or if this suggestion was already accepted or declined. Accept switches to Spanish. Decline keeps English and does not ask again.

## Pokédex

### UC-DEX-01 Regional, national, and generation scopes

**Given** Scarlet / Violet is selected.  
**When** the player chooses Regional, National, and the generation chip.  
**Then** Regional is that save’s regional Pokédex. National is every species that save can contain. The generation chip is Gen IX, the species introduced in that generation. Each choice is still selected for Scarlet / Violet on the next visit. Global Collection has no generation chip.

### UC-DEX-02 A form list replaces the scope chips

**When** the player opens Mega Evolutions, Gigantamax, or Regional Forms.  
**Then** the scope chips are replaced by that list’s name. Mega and Gigantamax cards have a sprite and a name and no Normal or Shiny. A catchable regional form has its own buttons.

### UC-DEX-03 Search filters in place

**When** the player types a name or a National Dex number.  
**Then** the current list narrows to matches. The address does not change. Clearing the box restores the list.

### UC-DEX-04 Status filters use every save

**Given** Charizard is caught only on Sword / Shield, and another species is shiny only.  
**When** the player selects each status on Scarlet / Violet.  
**Then** All shows the scope. Missing hides a species caught or shiny on any save. Missing Normal hides a caught species and keeps a shiny-only species. Missing Shiny hides a shiny species. Owned Normal keeps species caught on at least one save. Owned Shiny keeps species shiny on at least one save. A filter that matches nothing says there are no results.

### UC-DEX-05 Opening a card

**When** the player chooses the picture, the name, or the number.  
**Then** that Pokémon’s page opens.

### UC-DEX-06 Normal and Shiny write the header save

**Given** Charizard is caught on Sword / Shield and the header is Scarlet / Violet, where Charizard can be obtained.  
**When** the player turns Normal on.  
**Then** the button turns on for Scarlet / Violet. It was off before the click even though Sword / Shield already had the mark.

### UC-DEX-07 A game tag opens the move dialog

**When** the player chooses a game tag on a marked card.  
**Then** the move dialog opens for that save. The move cases below apply.

### UC-DEX-08 Scope help

**When** the player opens the scope info button on a normal list, and on a region list.  
**Then** the normal list explains Regional, National, and the generation. The region list names that region.

### UC-DEX-09 The list tells the player it is loading

**When** the species index or a regional Pokédex is still loading.  
**Then** the page says so and Pikachu runs.

## Checklist

Scopes, search, and the status filters behave as in the Pokédex cases. These cases cover what the checklist adds.

### UC-CHK-01 Exclusives names the version

**Given** X / Y is selected.  
**When** the player chooses Exclusives.  
**Then** only species one version can obtain are listed, and each row names that version. While the list is still being worked out, the page says it is finding version exclusives.

### UC-CHK-02 The method names a rod when that is the only wild way

**Given** Red / Blue is selected.  
**When** Magikarp’s row loads, and a species that can be walked into loads.  
**Then** Magikarp names the Old Rod and the Super Rod. The walked-into species says a wild encounter. While a method is loading, the row says it is checking. Gift, Event, and Pokédex appear when that is the method.

### UC-CHK-03 Spawns and the row open different sections

**When** the player chooses Spawns, and when they choose the number, sprite, or name.  
**Then** Spawns opens Where it spawns. The number, sprite, and name open Home.

### UC-CHK-04 Marks write the header save

**When** the player toggles Normal or Shiny on a row.  
**Then** UC-DEX-06 holds for the checklist.

## My Collection

### UC-COL-01 The list is every save, plus specimens, without Mega or Gigantamax

**Given** Charizard is caught on one save, Blue Floette is shiny on another, and a third species has a specimen but no mark. A Mega form is also marked somewhere.  
**When** the player opens My Collection.  
**Then** the three species are listed. The specimen species shows an Ultra Ball while Normal is off. The Mega form is absent. The game selector is hidden.

### UC-COL-02 Origin region

**Given** Alolan Vulpix and Kanto Vulpix are both in the collection.  
**When** the player chooses Alola, then Kanto, then All regions.  
**Then** Alolan Vulpix is in Alola and not in Kanto. Kanto Vulpix is in Kanto. A species with no regional form uses the region it was introduced in. All regions restores the full list.

### UC-COL-03 Status filters

**When** the player chooses All, Normal, Shiny, Alternate Forms, and Variants.  
**Then** All is the whole collection. Normal keeps caught Pokémon. Shiny keeps shiny Pokémon. Alternate Forms includes Alolan Vulpix. Variants includes Blue Floette. A Pokémon that matches more than one filter appears in each of those sets.

### UC-COL-04 Search and open

**When** the player searches by name or National Dex number and opens a card.  
**Then** the match rules are the same as the Pokédex, and that species or form opens.

### UC-COL-05 Turning a combined mark off clears every save

**Given** Pikachu is caught and female on two saves.  
**When** the player turns Normal off on the collection card.  
**Then** both saves lose caught and the normal genders. Shiny is untouched. The button is on beforehand because any save had the mark.

### UC-COL-06 Turning a combined mark on writes the save from before the collection

**Given** the player had Scarlet / Violet selected, then opened My Collection, and Charizard can be obtained there.  
**When** they turn Normal on.  
**Then** Charizard is caught on Scarlet / Violet and the game tag includes that save.  
**When** the Pokémon cannot be obtained on that save.  
**Then** the click stores nothing and the button stays off.

### UC-COL-07 Empty and no-result copy

**Given** the collection is empty, and again a collection that the current filter excludes.  
**Then** an empty collection says to mark a Pokémon or upload a specimen. A filter with no rows says there are no results.

## Marking

Run UC-X-01 through UC-X-07 as well. These cases are the button rules on the dashboard, Pokédex, checklist, and a Pokémon’s page. My Collection follows UC-COL-05 and UC-COL-06 instead.

### UC-MRK-01 Normal on keeps the time and does not pick a gender

**When** the player turns Normal on.  
**Then** the Pokémon is caught on the save that button writes to, a time is stored, and Male and Female stay off.

### UC-MRK-02 Shiny does not imply caught

**Given** the Pokémon is not caught.  
**When** the player turns Shiny on, then turns Shiny off.  
**Then** Shiny comes on without turning Caught on. Turning Shiny off clears Shiny and the shiny genders, and leaves Caught as it was.

### UC-MRK-03 A gender can be cleared without clearing the mark

**Given** Pikachu is caught and female.  
**When** the player turns Female off.  
**Then** Female is off and caught stays on.

### UC-MRK-04 A form is marked apart from its species

**When** the player marks Alolan Vulpix, Eternal Floette, and Blue Floette, and does not mark the base species.  
**Then** each form has its own caught and shiny state. The base species stays unmarked. Marking the base species does not mark the forms.

### UC-MRK-05 Mega and Gigantamax have no catch control

**When** the player opens Mega Charizard or Gigantamax Charizard.  
**Then** there is no Normal or Shiny control.

### UC-MRK-06 Guest and account storage

**When** a guest toggles a mark, and when a trainer toggles a mark.  
**Then** the guest change is in this browser. The trainer change is on the account and still there in another browser after refresh.

### UC-MRK-07 Sprites follow the marks

**Given** one species is unmarked, one is caught, and Pikachu is both male and female where the sprites differ.  
**When** the player views the Pokédex, the checklist, and the dashboard.  
**Then** the unmarked sprite is dim, the caught sprite is in color, and Pikachu shows both sprites. On Pikachu’s page, the normal pair uses the header save’s normal genders and the shiny pair uses that save’s shiny genders.

## Moving a mark

### UC-MOV-01 The dialog lists obtainable saves and blocks a no-op

**Given** Charizard is caught on Scarlet / Violet.  
**When** the player opens that game tag.  
**Then** the dialog is named for Charizard, says the mark is on Scarlet / Violet, groups games by generation, puts Global Collection in its own column, and keeps Scarlet / Violet in the list. Apply is disabled until a different save is selected.

### UC-MOV-02 Apply moves the whole mark

**Given** Pikachu is caught, female, and shiny on Scarlet / Violet, with times stored.  
**When** the player applies a move to Sword / Shield.  
**Then** Sword / Shield has caught, female, shiny, and the original times. Scarlet / Violet no longer lists Pikachu. The dialog closes.

### UC-MOV-03 A destination that already has a mark combines

**Given** Scarlet / Violet has Pikachu female, and Sword / Shield has Pikachu shiny.  
**When** the player moves Scarlet / Violet onto Sword / Shield.  
**Then** Sword / Shield has both female and shiny. Scarlet / Violet no longer has the mark.

### UC-MOV-04 Dismissing the dialog changes nothing

**When** the player chooses Cancel, Close, Escape, or the backdrop.  
**Then** the dialog closes and every mark stays where it was.

### UC-MOV-05 The list waits for the obtainability check

**When** the dialog opens before the check finishes.  
**Then** no games are listed yet and the dialog says it is checking.

### UC-MOV-06 A failed check lists every save and still allows the move

**When** the obtainability check fails.  
**Then** every save is listed, the dialog says the check failed, and Apply still moves the mark.

## A Pokémon’s page

### UC-MON-01 Back is named for the list

**When** the player arrives from the Pokédex, the checklist, or My Collection and reads Back.  
**Then** the button names that list, and choosing it returns there as in UC-X-16.

### UC-MON-02 Previous and next stop at the ends and ignore forms

**Given** the player is on Blue Floette’s Moves section.  
**When** they choose previous, and when they are on number 1 or number 1025.  
**Then** previous and next open the neighboring species on Moves, not another Floette form. Number 1 does not go lower. Number 1025 does not go higher.

### UC-MON-03 Sections are addressable, and a temporary form has none

**When** the player chooses Home, Where it spawns, Moves, and My Specimens.  
**Then** that section opens. Home has no extra segment in the address. The other three do.  
**When** they open Mega Charizard or Gigantamax Charizard.  
**Then** those tabs are hidden. The page shows the sprite, the types, and the form switcher, and it has no Pokédex entry, abilities, natures, wild locations, moves, or specimens.

### UC-MON-04 Forms are grouped, and a caught form shows a Poké Ball

**When** the player opens Floette’s forms and Vulpix’s forms.  
**Then** Blue Floette is under Variants. Eternal Floette and Alolan Vulpix are under Alternate forms. The base species is in the group they came from. A form marked caught shows a colored Poké Ball. Choosing a form opens that form.

### UC-MON-05 The evolution line states the requirement

**When** the player reads Sylveon, Malamar, and Escavalier, and opens one of them.  
**Then** Sylveon includes high friendship and a Fairy-type move. Malamar includes holding the console upside down. Escavalier includes the trade for Karrablast. The chosen species opens. A caught member shows a Poké Ball.

### UC-MON-06 Games lists the form on screen, including expansions

**When** the player reads Games for a form, including one found in the Teal Mask, the Indigo Disk, the Isle of Armor, or the Crown Tundra.  
**Then** the methods include Wild, Gift, Event, or Pokédex where those apply. Each expansion is its own line.

### UC-MON-07 Rarity is explained and colors the whole line of a pseudo-legendary

**When** the player opens the rarity note on a legendary, a mythical, a pseudo-legendary, a fossil, and a starter.  
**Then** the note matches that rarity. The border color matches the Pokédex card, the checklist row, and this page. A pseudo-legendary’s whole evolutionary line uses violet.

### UC-MON-08 Recorded saves

**Given** this form is caught on two saves and unmarked on the header save.  
**When** the player reads under the mark buttons.  
**Then** both saves are named. With no saves, the page says it is not recorded. The buttons themselves follow the marking cases for the header save and this form.

### UC-MON-09 Overview, entry, abilities, natures, and stats

**When** the player reads the page in Spanish and in English, with and without a translation, on a save that has a Pokédex entry and on one that does not.  
**Then** the overview and entry follow the language when a translation exists. The entry is for the header save, or the page says that save has none. The hidden ability is named. An ability or nature present on a specimen of this species is marked collected. Each stat’s name, bar, and number share one row, the names share one width, and the number stays on the right.

### UC-MON-10 Matchups are not controls

**When** the player reads defensive and offensive matchups.  
**Then** they reflect the types on screen, and nothing in that block navigates or stores a mark.

### UC-MON-11 The spawn map and the table are independent

**Given** the Pokémon appears in more than one region, including one with a drawn map and Alola or Paldea.  
**When** the player selects a drawn region.  
**Then** that map is on screen, a place where it appears is a red Poké Ball, and other places are gray. The table still lists every region, with place, games, and rate.  
**When** they select Alola or Paldea.  
**Then** the page says an interactive map is not available and points to the table. Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, and Galar draw a map. Galar’s Wild Area remains a gap. While encounters load, Pikachu runs. A save with no wild encounters says so.

### UC-MON-12 Moves

**When** a normal player opens Moves for a Pokémon Smogon covers, one it does not, and one the header save cannot contain.  
**Then** Smogon sets load or the page says there are none, and the credit opens Smogon in a new tab. Gemini sets only include moves learnable in the header save, and a normal player has no refresh control. The learnset is grouped by method. Global Collection shows the learnset across games. A Pokémon the header save cannot contain says it is not available instead of listing moves.

## Specimens

### UC-SPC-01 Signed out

**When** a guest opens My Specimens.  
**Then** the page says to sign in. Add and Upload are absent.

### UC-SPC-02 Add stores a specimen and not a mark

**Given** a trainer on Scarlet / Violet has not marked this species.  
**When** they add a specimen with normal or shiny, a gender, a nickname of at most 40 characters, a level from 1 to 100, an ability, a nature, IVs from 0 to 31, and EVs from 0 to 252. Empty nickname, level, and stats are left empty.  
**Then** the form closes and the specimen appears under Scarlet / Violet. That save’s mark gains Normal or Shiny and the gender they entered. A mark already on that save, and marks on other saves, stay. Cancel, Close, Escape, or the backdrop stores nothing.

### UC-SPC-03 Upload accepts this species and rejects another

**When** the player picks a `.pk1` through `.pk9` or `.pb7` file for this species, a file for a different species, and a file that cannot be read.  
**Then** this species previews gender and the save it was met in, and Save stores it and refreshes the list. The other species is rejected, the message names both species, and nothing is stored. An unreadable file stores nothing and says it could not be read.

### UC-SPC-04 Remove deletes one specimen

**Given** two specimens, and a hand-set catch mark.  
**When** the player removes one, and when the delete fails.  
**Then** a success removes only that specimen and the mark flags that came only from it. The other specimen and every hand-set catch mark stay. A failure leaves the specimen and says so.

## Scan

### UC-SCN-01 A guest cannot scan

**When** a guest opens Scan.  
**Then** the box tools are hidden, the page says a login is required, and Sign in and Log in open account creation and login.

### UC-SCN-02 A trainer sees the destination save and the transfer steps

**When** a trainer opens Scan.  
**Then** the page names the header save as the place marks will be written, tells them to change the header first if the box belongs elsewhere, and explains the Nintendo Switch app, the console QR codes, and a file already on this computer.

### UC-SCN-03 Source chooses the layout

**When** the player chooses Pokémon HOME, Pokémon Bank, Scarlet / Violet, Sword / Shield, Switch 2, and Switch.  
**Then** each stays selected until they choose another. A tall HOME image uses the phone layout. Bank is marked experimental. The 30 slots are cut with that source’s layout.

### UC-SCN-04 A non-image is rejected

**When** the player chooses a file that is not a PNG, JPEG, WEBP, or GIF.  
**Then** nothing is uploaded and the page asks for an image of the box.

### UC-SCN-05 A successful read opens a review and writes nothing yet

**When** the player uploads a box image while scans remain.  
**Then** the page says it is checking each Pokémon. Each slot then shows the crop beside the matched sprite, labeled Clear, Check, or Look. The collection is unchanged.

### UC-SCN-06 A slot can be corrected before confirm

**When** the player opens a slot, picks a suggestion, searches a National Dex number, searches a name, searches fewer than two letters, marks the slot empty, marks it occupied, and toggles Shiny.  
**Then** the suggestion and the search assign that species. A number jumps to that species. A name shows at most ten matches. Fewer than two letters shows no list. Shiny can be toggled only after a species is selected. Empty and occupied update that slot only.

### UC-SCN-07 Cancelling discards the screenshot

**When** the player chooses Cancel, Close, Escape, or the backdrop during the check or the review.  
**Then** no marks change.

### UC-SCN-08 Confirm marks identified slots only

**Given** the review has a normal Charizard, a shiny Charizard, an Alolan Vulpix, an empty slot, and an unidentified slot. Sword / Shield already has a different species caught, and Pikachu on the header save already has a gender. The header save is Scarlet / Violet.  
**When** the player confirms.  
**Then** Charizard is caught, the shiny one is caught and shiny, and Alolan Vulpix is stored as that regional form, all on Scarlet / Violet. The empty and unidentified slots change nothing. The Sword / Shield mark stays. Pikachu’s gender stays. The review closes and the page says how many were marked and names Scarlet / Violet.

### UC-SCN-09 Nothing to mark does nothing

**Given** every slot is empty or unidentified.  
**When** the player looks at the confirm button.  
**Then** it says there is nothing to mark and choosing it does not write marks.

### UC-SCN-10 A failed save keeps the review

**When** confirm cannot reach the account.  
**Then** the review stays open, says the marks could not be saved, and the collection is unchanged.

### UC-SCN-11 A failed read spends nothing

**When** the image cannot be read.  
**Then** the review does not open, the page says the screenshot could not be read, and the allowance is unchanged.

### UC-SCN-12 Allowance

**Given** a trainer account created less than 48 hours ago, and later an older account.  
**When** they scan.  
**Then** the new account may scan once, then sees when the next scan is available 48 hours after creation. The older account may scan 2 screenshots every 24 hours and sees how many remain. Upload is disabled at zero. A scan that returns a review spends one. A scan that fails before a reading does not.

### UC-SCN-13 The shared daily budget stops everyone who is not staff

**Given** the shared budget is spent.  
**When** a trainer opens Scan, and when a staff user opens Scan.  
**Then** the trainer’s upload is disabled and the page says the global daily limit is reached and to try again tomorrow. The staff user is covered by UC-STF-03.

## Footer pages

### UC-FT-01 Changelog and roadmap

**When** the player opens Changelog and Roadmap from the footer.  
**Then** Changelog lists player-visible changes, newest first. Roadmap lists planned work and does not repeat shipped work. Both hide the game selector and keep the language switch.

### UC-FT-02 Privacy and terms follow the language

**When** the player opens Privacy and Terms in each language.  
**Then** the document matches the language, starts at the top, in-site links open the named page, and an external link opens in a new tab. The game selector is hidden.

### UC-FT-03 PokéAPI leaves the site

**When** the player chooses PokéAPI in the footer.  
**Then** that site opens in a new tab.

## Staff

A trainer in these cases does not see the control.

### UC-STF-01 Bulk import reports saved and skipped

**Given** a staff user and a folder of `.pk1` through `.pk9` and `.pb7` files, including two copies of the same filename and size and one unreadable file.  
**When** they import the files, and when they import a folder.  
**Then** each readable file becomes a specimen on the save it was met in, including the repeated copy. The unreadable file is skipped and the other files are still saved. The page reports how many were saved and how many were skipped. My Collection and Last caught include the new specimens. A normal trainer does not see the tool.

### UC-STF-02 Refresh replaces Gemini sets for this save

**Given** a staff user on a Pokémon’s Moves section.  
**When** they refresh, and when the refresh fails.  
**Then** a success replaces the suggested sets for the header save. A failure leaves the old sets and shows the error. A normal trainer has no refresh button.

### UC-STF-03 Staff scan past the limits

**Given** a staff account that is new, has used 2 scans today, or is scanning while the shared budget is spent.  
**When** they upload.  
**Then** none of those three limits blocks the upload.

## Without a click

### UC-AUTO-01 A published version reloads an open tab once

**Given** a tab is open and a new page or API version is published.  
**When** the tab notices.  
**Then** it reloads once and does not reload again for that same version.

### UC-AUTO-02 A stored species list is reused

**Given** this browser already has the species list, and again a browser that does not.  
**When** the player opens the Pokédex.  
**Then** the stored list appears without a full download. The empty browser downloads the list and then shows it.

### UC-AUTO-03 Sign-in merge runs at the moment of sign-in

**Given** both a guest copy and an account copy exist.  
**When** the session starts.  
**Then** UC-X-09 and UC-X-10 hold, and the guest copy is removed.

## Out of scope

Do not write cases for these. The app is not supposed to offer them: a public share link, an export file, a PC-box grid of the collection, progress by evolution family, Unown or Vivillon pattern lists, ball, language, or ribbon goals, Alpha, Jumbo, or Tiny marks, a shiny-hunt counter, an event-distribution checklist, a breeding guide, search that starts from a move or a route, and a damage calculator.
