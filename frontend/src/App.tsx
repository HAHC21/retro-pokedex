import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { gameByKey, idsInRegion, idsIntroducedInGen, introducedIdsForGame, nationalIdsForGame, regionBySlug } from "./catalog";
import { fetchMe, isStaffRole, logout, type AuthUser } from "./auth";
import { fetchCollectionProgress, syncCollectionProgress, upsertCollectionMark } from "./collectionApi";
import { ensureObtainIndex, isObtainableInGame, rememberRegionalDex, resolveObtainabilityForIds } from "./obtainability";
import {
  fetchCatalog,
  fetchForms,
  fetchMon,
  fetchRegionalDex,
  fetchLearnset,
  fetchSpawns,
  loadCachedIndex,
  saveIndex,
  type CatalogForm,
  type LearnsetGroup,
  type RegionalDex,
} from "./pokeapi";
import { idFromUrl } from "./format";
import { formFromVarietySlug, formStorageKey, formsEqual, type FormList, type SpeciesForm } from "./forms";
import { buildAppPath, parseAppPath, saveDexPrefs, loadDexPrefs, loadListView, saveListView, type DetailSection, type ListView } from "./paths";
import { entryFor, loadProgress, mergeProgress, moveMark, saveProgress, clearProgress, isProgressEmpty, toggleGenderMark, toggleMark, type GenderChoice } from "./progress";
import type { CollectionFilter, DexIndex, DexScope, MarkKey, MonPayload, Progress, StatusFilter } from "./types";
import { AuthView } from "./views/AuthView";
import { CollectionView } from "./views/CollectionView";
import { DashboardView } from "./views/DashboardView";
import { ChecklistView } from "./views/ChecklistView";
import { DexView } from "./views/DexView";
import { DetailView } from "./views/DetailView";
import { ChangelogView } from "./views/ChangelogView";
import { LegalView } from "./views/LegalView";
import { RoadmapView } from "./views/RoadmapView";
import { ScanView } from "./views/ScanView";

async function monForForm(payload: MonPayload, form: SpeciesForm | null): Promise<MonPayload | null> {
  if (!form) {
    return payload;
  }
  const speciesSlug = payload.species.name || payload.data.name;
  const match = (payload.species.varieties || []).find((item) =>
    formsEqual(formFromVarietySlug(item.pokemon.name, speciesSlug), form),
  );
  const formId = match ? idFromUrl(match.pokemon.url || "") : 0;
  if (formId) {
    const formMon = await fetchMon(formId);
    return {
      ...payload,
      data: { ...formMon.data, forms: payload.data.forms },
      overview: formMon.overview,
      capture: formMon.capture,
      games: formMon.games,
    };
  }
  if (form.kind !== "variant" || !form.name) {
    return null;
  }
  const shared = (payload.data.forms || []).some((entry) => {
    if (idFromUrl(entry.url || "") === payload.data.id) {
      return false;
    }
    return formsEqual(formFromVarietySlug(entry.name, speciesSlug), form);
  });
  return shared ? payload : null;
}

type ListContext = {
  gen: number;
  region: string | null;
  scope: DexScope;
  formList: FormList | null;
  q: string;
  status: StatusFilter;
  collectionFilter: CollectionFilter;
  originRegion: string | null;
};

function initialList(pathname: string): ListContext {
  const parsed = parseAppPath(pathname);
  const prefs = loadDexPrefs(parsed.game);
  const onList = parsed.view === "dex" || parsed.view === "checklist" || parsed.view === "collection";
  return {
    gen: onList ? parsed.gen : (prefs?.gen ?? 1),
    region: onList && parsed.view !== "collection" ? parsed.region : null,
    scope: parsed.region ? "generation" : (prefs?.scope ?? "national"),
    formList: onList ? parsed.formList : null,
    q: "",
    status: "all",
    collectionFilter: "all",
    originRegion: null,
  };
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useMemo(
    () => parseAppPath(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const [authError, setAuthError] = useState<"confirm_failed" | "signin_failed" | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [regional, setRegional] = useState<RegionalDex | null>(null);
  const [regionalLoading, setRegionalLoading] = useState(false);
  const [index, setIndex] = useState<DexIndex>({ names: {}, types: {}, rarity: {} });
  const [indexLoading, setIndexLoading] = useState(true);
  const [forms, setForms] = useState<CatalogForm[]>([]);
  const [formsLoading, setFormsLoading] = useState(true);
  const [prog, setProg] = useState<Progress>({});
  const [mon, setMon] = useState<MonPayload | null>(null);
  const [monLoading, setMonLoading] = useState(false);
  const [spawns, setSpawns] = useState<MonPayload["enc"]>([]);
  const [spawnsLoading, setSpawnsLoading] = useState(false);
  const [learnset, setLearnset] = useState<LearnsetGroup[]>([]);
  const [learnsetLoading, setLearnsetLoading] = useState(false);
  const [obtainable, setObtainable] = useState<Record<number, boolean>>({});
  const [listView, setListView] = useState<ListView>(() => loadListView());
  const openIdRef = useRef<number | null>(null);
  const openFormRef = useRef("");
  const obtainGameRef = useRef(route.game);

  const { view, game, id, form, section } = route;
  const [list, setList] = useState<ListContext>(() => initialList(location.pathname));
  const { gen, region, q, status, scope, formList, collectionFilter, originRegion } = list;

  useEffect(() => {
    if (view !== "dex" && view !== "checklist") {
      return;
    }
    setList((prev) => {
      const nextRegion = route.region;
      const nextGen = route.gen;
      const nextScope = nextRegion ? "generation" : prev.scope;
      const nextFormList = route.formList;
      if (prev.gen === nextGen && prev.region === nextRegion && prev.scope === nextScope && prev.formList === nextFormList) {
        return prev;
      }
      return { ...prev, gen: nextGen, region: nextRegion, scope: nextScope, formList: nextFormList };
    });
  }, [route.gen, route.region, route.formList, view]);

  useEffect(() => {
    if (view === "dex" || view === "checklist" || view === "mon") {
      saveDexPrefs(game, gen, scope);
    }
    if (view === "dex" || view === "checklist" || view === "collection") {
      saveListView(view);
      setListView(view);
    }
  }, [view, game, gen, scope]);

  const go = useCallback(
    (next: Parameters<typeof buildAppPath>[0], replace = false) => {
      const target = buildAppPath(next);
      if (target === `${location.pathname}${location.search}`) {
        return;
      }
      navigate(target, { replace });
    },
    [location.pathname, location.search, navigate],
  );

  useEffect(() => {
    if (!authUser) {
      setProg(loadProgress());
      return;
    }
    let cancelled = false;
    (async () => {
      const local = loadProgress();
      const remote = await fetchCollectionProgress();
      if (cancelled) {
        return;
      }
      if (remote === null) {
        setProg(local);
        return;
      }
      if (isProgressEmpty(local)) {
        setProg(remote);
        clearProgress();
        return;
      }
      const merged = mergeProgress(local, remote);
      try {
        const synced = await syncCollectionProgress(merged, "merge");
        if (cancelled) {
          return;
        }
        setProg(synced || merged);
        clearProgress();
      } catch {
        if (!cancelled) {
          setProg(merged);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("auth_error");
    if (params.get("signed_in") === "1" || error) {
      if (error === "confirm_failed") {
        setAuthError("confirm_failed");
      } else if (error) {
        setAuthError("signin_failed");
      }
      navigate(error ? "/login" : "/", { replace: true });
    }
    void fetchMe().then((user) => {
      setAuthUser(user);
      setAuthReady(true);
    });
  }, [navigate]);

  useEffect(() => {
    void ensureObtainIndex().catch(() => {
      /* per-id obtain fallback remains */
    });
  }, []);

  useEffect(() => {
    const cached = loadCachedIndex();
    if (cached) {
      setIndex(cached);
      setIndexLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const next = await fetchCatalog();
        if (cancelled) {
          return;
        }
        setIndex(next);
        saveIndex(next);
        setIndexLoading(false);
      } catch {
        if (!cancelled) {
          setIndexLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchForms()
      .then((next) => {
        if (!cancelled) {
          setForms(next);
          setFormsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFormsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    obtainGameRef.current = game;
  }, [game]);

  useEffect(() => {
    let cancelled = false;
    setRegionalLoading(true);
    fetchRegionalDex(game)
      .then((payload) => {
        if (cancelled) {
          return;
        }
        rememberRegionalDex(payload.game, payload.ids);
        setRegional(payload);
        setRegionalLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setRegional(null);
        setRegionalLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game]);

  useEffect(() => {
    setObtainable({});
    const origin = regionBySlug(region);
    const ids = origin
      ? idsInRegion(origin.slug)
      : scope === "regional"
        ? regional?.ids || []
        : scope === "generation"
          ? game === "home"
            ? idsIntroducedInGen(gen)
            : introducedIdsForGame(game)
          : nationalIdsForGame(game);
    if (!ids.length) {
      return;
    }
    let cancelled = false;
    resolveObtainabilityForIds(ids, game, (pokemonId, value) => {
      if (cancelled || obtainGameRef.current !== game) {
        return;
      }
      setObtainable((prev) => (prev[pokemonId] === value ? prev : { ...prev, [pokemonId]: value }));
    }).catch(() => {
      /* ignore */
    });
    return () => {
      cancelled = true;
    };
  }, [game, gen, region, scope, regional]);

  useEffect(() => {
    if (!id) {
      return;
    }
    let cancelled = false;
    isObtainableInGame(id, game).then((value) => {
      if (cancelled || obtainGameRef.current !== game) {
        return;
      }
      setObtainable((prev) => (prev[id] === value ? prev : { ...prev, [id]: value }));
    });
    return () => {
      cancelled = true;
    };
  }, [game, id]);

  useEffect(() => {
    if (view !== "mon" || !id) {
      openIdRef.current = null;
      openFormRef.current = "";
      return;
    }
    const requestKey = `${id}:${form?.kind ?? ""}:${form?.name ?? ""}`;
    openIdRef.current = id;
    openFormRef.current = requestKey;
    setMon(null);
    setSpawns([]);
    setLearnset([]);
    setMonLoading(true);
    setSpawnsLoading(true);
    setLearnsetLoading(true);
    let cancelled = false;

    fetchMon(id)
      .then(async (payload) => {
        if (cancelled || openFormRef.current !== requestKey) {
          return;
        }
        const shown = await monForForm(payload, form);
        if (cancelled || openFormRef.current !== requestKey) {
          return;
        }
        if (form && !shown) {
          go({ view: "mon", game, id, form: null, section }, true);
          return;
        }
        const shownMon = shown ?? payload;
        setMon(shownMon);
        setMonLoading(false);
        const resourceId = shownMon.data.id;
        const [enc, learn] = await Promise.all([fetchSpawns(resourceId), fetchLearnset(resourceId, game)]);
        if (cancelled || openFormRef.current !== requestKey) {
          return;
        }
        setSpawns(enc);
        setSpawnsLoading(false);
        setLearnset(learn.groups);
        setLearnsetLoading(false);
        const value = await isObtainableInGame(id, obtainGameRef.current);
        if (cancelled || openFormRef.current !== requestKey) {
          return;
        }
        setObtainable((prev) => ({ ...prev, [id]: value }));
      })
      .catch(() => {
        if (cancelled || openFormRef.current !== requestKey) {
          return;
        }
        setMonLoading(false);
        setSpawnsLoading(false);
        setLearnsetLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form?.kind, form?.name, game, go, id, section, view]);

  const persistMany = useCallback(
    async (next: Progress) => {
      setProg(next);
      if (!authUser) {
        saveProgress(next);
        return;
      }
      const synced = await syncCollectionProgress(next, "merge");
      if (!synced) {
        throw new Error("Could not sync collection.");
      }
      setProg(synced);
    },
    [authUser],
  );

  const persist = useCallback(
    (next: Progress, mark?: { game: string; pokemonId: number; form?: SpeciesForm | null }) => {
      setProg(next);
      if (authUser) {
        if (!mark) {
          return;
        }
        const entry = entryFor(next, mark.game, mark.pokemonId, mark.form ?? null);
        void upsertCollectionMark(mark.game, mark.pokemonId, entry, formStorageKey(mark.form)).catch(() => {
          void fetchCollectionProgress().then((remote) => {
            if (remote) {
              setProg(remote);
            }
          });
        });
        return;
      }
      saveProgress(next);
    },
    [authUser],
  );

  const refreshProgressFromServer = useCallback(() => {
    if (!authUser) {
      return;
    }
    void fetchCollectionProgress().then((remote) => {
      if (!remote) {
        return;
      }
      setProg(remote);
    });
  }, [authUser]);

  const open = useCallback(
    (pokemonId: number, nextSection: DetailSection = "home") => {
      go({ view: "mon", game, id: pokemonId, form: null, section: nextSection });
    },
    [game, go],
  );

  const openForm = useCallback(
    (pokemonId: number, nextForm: SpeciesForm | null, nextSection: DetailSection = "home") => {
      go({ view: "mon", game, id: pokemonId, form: nextForm, section: nextSection });
    },
    [game, go],
  );

  const ensureObtainable = useCallback((ids: number[]) => {
    const activeGame = game;
    void resolveObtainabilityForIds(ids, activeGame, (pokemonId, value) => {
      if (obtainGameRef.current !== activeGame) {
        return;
      }
      setObtainable((prev) => (prev[pokemonId] === value ? prev : { ...prev, [pokemonId]: value }));
    }).catch(() => {
      /* ignore */
    });
  }, [game]);

  async function toggle(pokemonId: number, key: MarkKey, nextForm: SpeciesForm | null = null) {
    const known = obtainable[pokemonId];
    const ok = known === true || (known === undefined && (await isObtainableInGame(pokemonId, game)));
    if (!ok) {
      return;
    }
    if (known === undefined) {
      setObtainable((prev) => ({ ...prev, [pokemonId]: true }));
    }
    persist(toggleMark(prog, game, pokemonId, key, nextForm), { game, pokemonId, form: nextForm });
  }

  async function toggleGender(pokemonId: number, key: MarkKey, gender: GenderChoice, nextForm: SpeciesForm | null = null) {
    const known = obtainable[pokemonId];
    const ok = known === true || (known === undefined && (await isObtainableInGame(pokemonId, game)));
    if (!ok) {
      return;
    }
    persist(toggleGenderMark(prog, game, pokemonId, key, gender, nextForm), { game, pokemonId, form: nextForm });
  }

  function moveCaughtGame(pokemonId: number, nextForm: SpeciesForm | null, fromGame: string, toGame: string) {
    if (fromGame === toGame) {
      return;
    }
    const next = moveMark(prog, fromGame, toGame, pokemonId, nextForm);
    if (next === prog) {
      return;
    }
    setProg(next);
    if (!authUser) {
      saveProgress(next);
      return;
    }
    const formKey = formStorageKey(nextForm);
    const moved = entryFor(next, toGame, pokemonId, nextForm);
    void upsertCollectionMark(toGame, pokemonId, moved, formKey)
      .then(() => upsertCollectionMark(fromGame, pokemonId, {}, formKey))
      .catch(() => {
        void fetchCollectionProgress().then((remote) => {
          if (remote) {
            setProg(remote);
          }
        });
      });
  }

  function dexContextForGame(gameKey: string, fallbackGen = 1): { gen: number; scope: DexScope } {
    const meta = gameByKey(gameKey);
    if (meta && meta.g > 0) {
      return { gen: meta.g, scope: "generation" };
    }
    return { gen: fallbackGen, scope: "national" };
  }

  function selectGame(gameKey: string) {
    const next = dexContextForGame(gameKey);
    setList((prev) => ({ ...prev, gen: next.gen, region: null, scope: next.scope }));
    if (view === "mon" && id) {
      go({ view: "mon", game: gameKey, id, form, section });
      return;
    }
    if (view === "dex") {
      go({ view: "dex", game: gameKey, gen: next.gen });
      return;
    }
    if (view === "checklist") {
      go({ view: "checklist", game: gameKey, gen: next.gen });
      return;
    }
    if (view === "collection") {
      go({ view: "collection", game: gameKey });
      return;
    }
    if (view === "scan") {
      go({ view: "scan", game: gameKey });
      return;
    }
    go({ view: "dash", game: gameKey, gen: next.gen });
  }

  function goDash() {
    setAuthError(null);
    go({ view: "dash", game: view === "signin" || view === "login" ? "home" : game, gen });
  }

  // Auth errors on the root URL go to login; `/` itself is the dashboard.
  if (location.pathname === "/" || location.pathname === "") {
    const params = new URLSearchParams(location.search);
    if (params.get("auth_error")) {
      return <Navigate to={`/login${location.search}`} replace />;
    }
  }

  if (view !== "signin" && view !== "login") {
    const canonical = buildAppPath(route);
    const canonicalPath = canonical.split("?")[0];
    const actualPath = location.pathname.replace(/\/+$/, "") || "/";
    if (actualPath !== canonicalPath || location.search) {
      return <Navigate to={canonical} replace />;
    }
  }

  return (
    <AppShell
      game={game}
      view={view}
      authUser={authUser}
      listView={listView}
      onGame={selectGame}
      onDash={goDash}
      onDex={() => {
        if (view === "checklist" || view === "collection" || view === "mon") {
          setList((prev) => ({ ...prev, status: prev.status === "exclusives" ? "all" : prev.status }));
          go({ view: "dex", game, gen, region });
          return;
        }
        const next = dexContextForGame(game, gen);
        setList((prev) => ({ ...prev, gen: next.gen, region: null, scope: next.scope, q: "", status: "all" }));
        go({ view: "dex", game, gen: next.gen });
      }}
      onCollection={() => {
        setList((prev) => ({ ...prev, q: "", collectionFilter: "all", originRegion: null }));
        go({ view: "collection", game });
      }}
      onChecklist={() => {
        if (view === "dex" || view === "collection" || view === "mon") {
          go({ view: "checklist", game, gen, region });
          return;
        }
        const next = dexContextForGame(game, gen);
        setList((prev) => ({ ...prev, gen: next.gen, region: null, scope: next.scope, q: "", status: "all" }));
        go({ view: "checklist", game, gen: next.gen });
      }}
      onScan={() => {
        go({ view: "scan", game });
      }}
      onSignIn={() => go({ view: "signin", game })}
      onLogIn={() => go({ view: "login", game })}
      onLogout={() => {
        void logout().finally(() => {
          setAuthUser(null);
          go({ view: "dash", game: game || "home", gen });
        });
      }}
    >
      {view === "dash" ? (
        <DashboardView
          index={index}
          prog={prog}
          game={game}
          isStaff={isStaffRole(authUser?.role)}
          onImported={refreshProgressFromServer}
          onOpen={open}
          onOpenRegion={(slug) => {
            setList((prev) => ({ ...prev, region: slug, formList: null, q: "", status: "all", scope: "generation" }));
            go({ view: "dex", game: "home", region: slug });
          }}
          onOpenFormList={(kind) => {
            setList((prev) => ({ ...prev, formList: kind, region: null, q: "", status: "all" }));
            go({ view: "dex", game, formList: kind });
          }}
          forms={forms}
          formsLoading={formsLoading}
          indexLoading={indexLoading}
          obtainable={obtainable}
          onEnsureObtainable={ensureObtainable}
          onOpenForm={openForm}
          onToggleCaught={(pokemonId) => {
            void toggle(pokemonId, "caught");
          }}
          onToggleShiny={(pokemonId) => {
            void toggle(pokemonId, "shiny");
          }}
          onToggleForm={(pokemonId, nextForm, key) => {
            void toggle(pokemonId, key, nextForm);
          }}
          onMoveGame={(pokemonId, nextForm, fromGame, toGame) => {
            moveCaughtGame(pokemonId, nextForm, fromGame, toGame);
          }}
        />
      ) : null}
      {view === "scan" ? (
        <ScanView
          index={index}
          indexLoading={indexLoading}
          game={game}
          prog={prog}
          signedIn={!!authUser}
          authReady={authReady}
          onSignIn={() => go({ view: "signin", game })}
          onLogIn={() => go({ view: "login", game })}
          onCommit={persistMany}
        />
      ) : null}
      {view === "dex" ? (
        <DexView
          index={index}
          indexLoading={indexLoading}
          prog={prog}
          game={game}
          gen={gen}
          region={region}
          q={q}
          status={status}
          scope={scope}
          regional={regional}
          regionalLoading={regionalLoading}
          obtainable={obtainable}
          formList={formList}
          forms={forms}
          formsLoading={formsLoading}
          onQuery={(nextQ) => setList((prev) => ({ ...prev, q: nextQ }))}
          onStatus={(nextStatus) => setList((prev) => ({ ...prev, status: nextStatus }))}
          onScope={(nextScope) => {
            const next = nextScope === "generation" ? dexContextForGame(game, gen) : { gen, scope: nextScope };
            setList((prev) => ({ ...prev, gen: next.gen, region: null, formList: null, scope: next.scope }));
            go({ view: "dex", game, gen: next.gen });
          }}
          onOpen={open}
          onOpenForm={openForm}
          onToggleCaught={(pokemonId) => {
            void toggle(pokemonId, "caught");
          }}
          onToggleShiny={(pokemonId) => {
            void toggle(pokemonId, "shiny");
          }}
          onToggleForm={(pokemonId, nextForm, key) => {
            void toggle(pokemonId, key, nextForm);
          }}
          onMoveGame={(pokemonId, nextForm, fromGame, toGame) => {
            moveCaughtGame(pokemonId, nextForm, fromGame, toGame);
          }}
        />
      ) : null}
      {view === "collection" ? (
        <CollectionView
          index={index}
          indexLoading={indexLoading}
          prog={prog}
          game={game}
          q={q}
          filter={collectionFilter}
          originRegion={originRegion}
          signedIn={!!authUser}
          forms={forms}
          onQuery={(nextQ) => setList((prev) => ({ ...prev, q: nextQ }))}
          onFilter={(nextFilter) => setList((prev) => ({ ...prev, collectionFilter: nextFilter }))}
          onOriginRegion={(slug) => setList((prev) => ({ ...prev, originRegion: slug }))}
          onOpen={open}
          onOpenForm={openForm}
          onToggleCaught={(pokemonId) => {
            void toggle(pokemonId, "caught");
          }}
          onToggleShiny={(pokemonId) => {
            void toggle(pokemonId, "shiny");
          }}
          onToggleForm={(pokemonId, nextForm, key) => {
            void toggle(pokemonId, key, nextForm);
          }}
          onMoveGame={(pokemonId, nextForm, fromGame, toGame) => {
            moveCaughtGame(pokemonId, nextForm, fromGame, toGame);
          }}
        />
      ) : null}
      {view === "checklist" ? (
        <ChecklistView
          index={index}
          indexLoading={indexLoading}
          prog={prog}
          game={game}
          gen={gen}
          region={region}
          q={q}
          status={status}
          scope={scope}
          regional={regional}
          regionalLoading={regionalLoading}
          obtainable={obtainable}
          onQuery={(nextQ) => setList((prev) => ({ ...prev, q: nextQ }))}
          onStatus={(nextStatus) => setList((prev) => ({ ...prev, status: nextStatus }))}
          onScope={(nextScope) => {
            const next = nextScope === "generation" ? dexContextForGame(game, gen) : { gen, scope: nextScope };
            setList((prev) => ({ ...prev, gen: next.gen, region: null, scope: next.scope }));
            go({ view: "checklist", game, gen: next.gen });
          }}
          onOpen={open}
          onSpawns={(pokemonId) => open(pokemonId, "spawns")}
          onToggleCaught={(pokemonId) => {
            void toggle(pokemonId, "caught");
          }}
          onToggleShiny={(pokemonId) => {
            void toggle(pokemonId, "shiny");
          }}
        />
      ) : null}
      {view === "mon" && id ? (
        <DetailView
          id={id}
          mon={mon}
          loading={monLoading}
          spawns={spawns}
          spawnsLoading={spawnsLoading}
          learnset={learnset}
          learnsetLoading={learnsetLoading}
          prog={prog}
          game={game}
          names={index.names}
          rarity={index.rarity}
          obtainable={obtainable[id]}
          authUser={authUser}
          section={section}
          listView={listView}
          onSection={(nextSection) => go({ view: "mon", game, id, form, section: nextSection })}
          onBack={() => go({ view: listView, game, gen, region, formList })}
          onPrev={() => open(Math.max(1, id - 1), section)}
          onNext={() => open(Math.min(1025, id + 1), section)}
          form={form}
          onOpen={open}
          onOpenForm={openForm}
          onToggleCaught={(pokemonId) => {
            void toggle(pokemonId, "caught", form);
          }}
          onToggleShiny={(pokemonId) => {
            void toggle(pokemonId, "shiny", form);
          }}
          onToggleGender={(pokemonId, key, gender) => {
            void toggleGender(pokemonId, key, gender, form);
          }}
          onProgressRefresh={refreshProgressFromServer}
        />
      ) : null}
      {view === "changelog" ? <ChangelogView /> : null}
      {view === "roadmap" ? <RoadmapView /> : null}
      {view === "privacy" || view === "terms" ? <LegalView page={view} /> : null}
      {view === "signin" || view === "login" ? (
        <AuthView
          mode={view}
          error={authError}
          onAlt={() => {
            setAuthError(null);
            go({ view: view === "signin" ? "login" : "signin", game: "home" });
          }}
          onContinue={() => {
            void fetchMe().then(setAuthUser);
            goDash();
          }}
        />
      ) : null}
    </AppShell>
  );
}
