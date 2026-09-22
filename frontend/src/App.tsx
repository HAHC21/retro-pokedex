import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { TYPES, clampGen, gameByKey, introducedIdsForGame, nationalIdsForGame } from "./catalog";
import { fetchMe, isStaffRole, logout, type AuthUser } from "./auth";
import { fetchCollectionProgress, syncCollectionProgress, upsertCollectionMark } from "./collectionApi";
import { isObtainableInGame, rememberRegionalDex, resolveObtainabilityForIds } from "./obtainability";
import {
  fetchMon,
  fetchNameIndex,
  fetchRegionalDex,
  fetchLearnset,
  fetchSpawns,
  fetchTypeMembership,
  loadCachedIndex,
  saveIndex,
  type LearnsetGroup,
  type RegionalDex,
} from "./pokeapi";
import { buildAppPath, parseAppPath, saveDexPrefs, loadListView, saveListView, type DetailSection, type ListView } from "./paths";
import { entryFor, loadProgress, mergeProgress, saveProgress, clearProgress, isProgressEmpty, toggleMark } from "./progress";
import type { DexIndex, DexScope, MarkKey, MonPayload, Progress } from "./types";
import { AuthView } from "./views/AuthView";
import { DashboardView } from "./views/DashboardView";
import { ChecklistView } from "./views/ChecklistView";
import { DexView } from "./views/DexView";
import { DetailView } from "./views/DetailView";

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = useMemo(
    () => parseAppPath(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const [authError, setAuthError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [regional, setRegional] = useState<RegionalDex | null>(null);
  const [regionalLoading, setRegionalLoading] = useState(false);
  const [index, setIndex] = useState<DexIndex>({ names: {}, types: {} });
  const [indexLoading, setIndexLoading] = useState(true);
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
  const obtainGameRef = useRef(route.game);

  const { view, game, gen, id, section, q, status, scope } = route;

  useEffect(() => {
    if (view === "dex" || view === "checklist" || view === "mon") {
      saveDexPrefs(game, gen, scope);
    }
    if (view === "dex" || view === "checklist") {
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
        setAuthError("That confirmation link is invalid or expired.");
      } else if (error) {
        setAuthError("Sign-in failed. Try Google, Microsoft, or email again.");
      }
      navigate(error ? "/login" : "/home", { replace: true });
    }
    void fetchMe().then(setAuthUser);
  }, [navigate]);

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
        const names = await fetchNameIndex();
        if (cancelled) {
          return;
        }
        setIndex({ names, types: {} });
        setIndexLoading(false);
        const types: Record<number, string[]> = {};
        for (const typeName of TYPES) {
          const { ids } = await fetchTypeMembership(typeName);
          if (cancelled) {
            return;
          }
          ids.forEach((pokemonId) => {
            (types[pokemonId] = types[pokemonId] || []).push(typeName);
          });
          setIndex({ names, types: { ...types } });
        }
        saveIndex({ names, types });
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
    obtainGameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (view !== "mon" || !id) {
      return;
    }
    let cancelled = false;
    setLearnsetLoading(true);
    fetchLearnset(id, game)
      .then((payload) => {
        if (cancelled || openIdRef.current !== id) {
          return;
        }
        setLearnset(payload.groups);
        setLearnsetLoading(false);
      })
      .catch(() => {
        if (cancelled || openIdRef.current !== id) {
          return;
        }
        setLearnset([]);
        setLearnsetLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game, id, view]);

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
    const ids =
      scope === "regional"
        ? regional?.ids || []
        : scope === "generation"
          ? introducedIdsForGame(game)
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
  }, [game, gen, scope, regional]);

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
      return;
    }
    openIdRef.current = id;
    setMon(null);
    setSpawns([]);
    setLearnset([]);
    setMonLoading(true);
    setSpawnsLoading(true);
    let cancelled = false;

    fetchMon(id)
      .then(async (payload) => {
        if (cancelled || openIdRef.current !== id) {
          return;
        }
        setMon(payload);
        setMonLoading(false);
        const value = await isObtainableInGame(id, obtainGameRef.current);
        if (cancelled || openIdRef.current !== id) {
          return;
        }
        setObtainable((prev) => ({ ...prev, [id]: value }));
      })
      .catch(() => {
        if (cancelled || openIdRef.current !== id) {
          return;
        }
        setMonLoading(false);
        setSpawnsLoading(false);
      });

    fetchSpawns(id)
      .then((enc) => {
        if (cancelled || openIdRef.current !== id) {
          return;
        }
        setSpawns(enc);
        setSpawnsLoading(false);
      })
      .catch(() => {
        if (cancelled || openIdRef.current !== id) {
          return;
        }
        setSpawns([]);
        setSpawnsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, view]);

  const persist = useCallback(
    (next: Progress, mark?: { game: string; pokemonId: number }) => {
      setProg(next);
      if (authUser) {
        if (!mark) {
          return;
        }
        const entry = entryFor(next, mark.game, mark.pokemonId);
        void upsertCollectionMark(mark.game, mark.pokemonId, entry).catch(() => {
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
      go({ view: "mon", game, id: pokemonId, section: nextSection, gen, q, status, scope });
    },
    [game, gen, go, q, scope, status],
  );

  async function toggle(pokemonId: number, key: MarkKey) {
    const known = obtainable[pokemonId];
    const ok = known === true || (known === undefined && (await isObtainableInGame(pokemonId, game)));
    if (!ok) {
      return;
    }
    if (known === undefined) {
      setObtainable((prev) => ({ ...prev, [pokemonId]: true }));
    }
    persist(toggleMark(prog, game, pokemonId, key), { game, pokemonId });
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
    if (view === "mon" && id) {
      go({ view: "mon", game: gameKey, id, section, gen: next.gen, q, status, scope: next.scope });
      return;
    }
    if (view === "dex") {
      go({ view: "dex", game: gameKey, gen: next.gen, q, status, scope: next.scope });
      return;
    }
    if (view === "checklist") {
      go({ view: "checklist", game: gameKey, gen: next.gen, q, status, scope: next.scope });
      return;
    }
    go({ view: "dash", game: gameKey, gen: next.gen });
  }

  function goDash() {
    setAuthError(null);
    go({ view: "dash", game: view === "signin" || view === "login" ? "home" : game, gen });
  }

  // Normalize bare `/` and unknown/incomplete paths onto a canonical URL.
  if (location.pathname === "/" || location.pathname === "") {
    const params = new URLSearchParams(location.search);
    if (params.get("auth_error")) {
      return <Navigate to={`/login${location.search}`} replace />;
    }
    return <Navigate to="/home" replace />;
  }

  if (view !== "signin" && view !== "login") {
    const canonical = buildAppPath(route);
    const canonicalPath = canonical.split("?")[0];
    const actualPath = location.pathname.replace(/\/+$/, "") || "/";
    if (actualPath !== canonicalPath) {
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
        if (view === "checklist" || view === "mon") {
          go({ view: "dex", game, gen, q, status: status === "exclusives" ? "all" : status, scope });
          return;
        }
        const next = dexContextForGame(game, gen);
        go({ view: "dex", game, gen: next.gen, q: "", status: "all", scope: next.scope });
      }}
      onChecklist={() => {
        if (view === "dex" || view === "mon") {
          go({ view: "checklist", game, gen, q, status, scope });
          return;
        }
        const next = dexContextForGame(game, gen);
        go({ view: "checklist", game, gen: next.gen, q: "", status: "all", scope: next.scope });
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
          gen={gen}
          isStaff={isStaffRole(authUser?.role)}
          onImported={refreshProgressFromServer}
          onOpen={open}
          onOpenGen={(genId) => {
            go({ view: "dex", game, gen: clampGen(genId), q: "", status: "all", scope: "national" });
          }}
          onOpenGame={(gameKey, genId) => {
            const next = dexContextForGame(gameKey, clampGen(genId));
            go({
              view: "dex",
              game: gameKey,
              gen: next.gen,
              q: "",
              status: "all",
              scope: next.scope,
            });
          }}
          onOpenDex={() => {
            const next = dexContextForGame(game, gen);
            go({
              view: "dex",
              game,
              gen: next.gen,
              q: "",
              status: "all",
              scope: next.scope,
            });
          }}
          onOpenMissing={() => go({ view: "dex", game, gen, q: "", status: "missing", scope: "national" })}
          onOpenShinies={() => go({ view: "dex", game, gen, q: "", status: "shiny", scope: "national" })}
        />
      ) : null}
      {view === "dex" ? (
        <DexView
          index={index}
          indexLoading={indexLoading}
          prog={prog}
          game={game}
          q={q}
          status={status}
          scope={scope}
          regional={regional}
          regionalLoading={regionalLoading}
          obtainable={obtainable}
          onQuery={(nextQ) => go({ view: "dex", game, gen, q: nextQ, status, scope }, true)}
          onStatus={(nextStatus) => go({ view: "dex", game, gen, q, status: nextStatus, scope })}
          onScope={(nextScope) => {
            const next = nextScope === "generation" ? dexContextForGame(game, gen) : { gen, scope: nextScope };
            go({ view: "dex", game, gen: next.gen, q, status, scope: next.scope });
          }}
          onOpen={open}
          onToggleCaught={(pokemonId) => {
            void toggle(pokemonId, "caught");
          }}
          onToggleShiny={(pokemonId) => {
            void toggle(pokemonId, "shiny");
          }}
        />
      ) : null}
      {view === "checklist" ? (
        <ChecklistView
          index={index}
          indexLoading={indexLoading}
          prog={prog}
          game={game}
          q={q}
          status={status}
          scope={scope}
          regional={regional}
          regionalLoading={regionalLoading}
          obtainable={obtainable}
          onQuery={(nextQ) => go({ view: "checklist", game, gen, q: nextQ, status, scope }, true)}
          onStatus={(nextStatus) => go({ view: "checklist", game, gen, q, status: nextStatus, scope })}
          onScope={(nextScope) => {
            const next = nextScope === "generation" ? dexContextForGame(game, gen) : { gen, scope: nextScope };
            go({ view: "checklist", game, gen: next.gen, q, status, scope: next.scope });
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
          obtainable={obtainable[id]}
          authUser={authUser}
          section={section}
          listView={listView}
          onSection={(nextSection) => go({ view: "mon", game, id, section: nextSection, gen, q, status, scope })}
          onBack={() => go({ view: listView, game, gen, q, status, scope })}
          onPrev={() => open(Math.max(1, id - 1), section)}
          onNext={() => open(Math.min(1025, id + 1), section)}
          onOpen={open}
          onToggleCaught={(pokemonId) => {
            void toggle(pokemonId, "caught");
          }}
          onToggleShiny={(pokemonId) => {
            void toggle(pokemonId, "shiny");
          }}
          onProgressRefresh={refreshProgressFromServer}
        />
      ) : null}
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
