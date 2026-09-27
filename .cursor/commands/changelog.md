# Changelog

Sync this repo’s changelogs from the version commits. Do the analysis from the diffs. Do not write entries from memory or from a commit subject alone.

If this message names a version (for example `0.7.7`), update only that version. Otherwise update every release that is missing or incomplete.

Do not commit. Do not run `scripts.generate_overviews` or `scripts.set_capture`.

## Releases

A release commit has a subject that is `v` plus a version, such as `v0.7.6` or `v0.7.6.1`. List them from `git log` (hash, commit date, subject). Compare versions as integer tuples so `0.7.6.1` is newer than `0.7.6`.

For each release in scope, diff that commit against its parent (`git show --stat` and `git diff parent commit`). Ignore edits to the changelog files when deciding what changed. Read those edits only to see which bullets already exist.

Commits after the latest release, and uncommitted work, are not a new version. Say what they contain and stop, unless this message names the version they belong to.

## Files

Update the files a release actually affects. Do not renumber or rewrite bullets that are already accurate. Add what the diff shows and the file does not already say. If a player-visible change was already filed under a different version, leave it there and do not repeat it.

`CHANGELOG.md` — one section per release commit, newest first. Date is the commit date, `YYYY-MM-DD`. Use `### Added`, `### Changed`, and `### Fixed`. Include internal work: scripts, API routes, Docker, docs, migrations. Name modules and scripts here.

`CHANGELOG.public.md` — player-visible changes only, newest first. Date is `September 25, 2026`. One short bullet per change. Skip a release that only changed hosting, listings, mail delivery, or internal data.

`frontend/src/changelog.ts` — the same player-visible changes as the public file, newest first. Each release has `version`, `date` (`Sep 25, 2026`), a short `title`, an optional `intro`, and `features` of `{ title, body }`. Keep the existing shape. A release that is not player-visible stays out of this file.

## Versions

Open tabs reload when the UI id or the API id changes. After the changelog edits, look at the same diff again and ignore the changelog files.

- If any path starts with `frontend/`, write that release version as the only line of `frontend/VERSION`. Vite serves it as the UI id (`/version.json` and the running page). Do this even when the release stays off the public changelog.
- If any path starts with `backend/`, write that release version as the only line of `backend/app/VERSION`. `GET /api/version` returns it when `APP_VERSION` is unset.
- If that tree did not change, leave its version file alone.

Do not add a bugfix to the public changelog just to change an id.

## What a player can see

Include a change when it shows up in the app: a new control, page, list, label, sprite, mark, or game. A backend change counts when it changes that screen (the Games box listing a new way to obtain a Pokémon is visible; a migration script is not).

Leave out of the public file and `changelog.ts`: scripts, index migrations, Docker ports, docs, generated copy, and dependency or typecheck fixes.

Write those two files in plain sentences a player would recognize. Use a Pokémon as the example when it makes the change concrete, the way `Blue Floette` stands for a variant. No file paths, script names, or API routes. Short titles. One behavior per feature.

## Check

After the file edits, from `frontend/`, run `npm run build`. That is `tsc -b && vite build`, the same command the hosted UI build runs. It typechecks `src` and `vite.config.ts`. Stop and fix errors if it fails.

Then run `npm ls @types/node`. The hosted install is clean and does not install Vite’s optional `@types/node` peer. If that package is present locally and missing from `package.json`, a green `tsc` can still fail on deploy: Connect’s `IncomingMessage` has no `url`. Do not type a shared `serve` function as taking a custom server whose `use` handler requires `{ url?: string }` — that is not assignable to Vite’s hooks. Attach middleware inside `configureServer` and `configurePreviewServer` and read `req.url` from `object`.

If the release also changed `dashboard/`, run `npm run build` from `dashboard/` as well.

After editing `frontend/src/changelog.ts`, open `/changelog` and confirm each version you touched is on the page with the new text. If no dev server is running, say so.
