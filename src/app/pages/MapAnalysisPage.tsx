import { Skull } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";
import { MapViewport } from "../components/MapViewport";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../components/ui/resizable";
import {
  DATE_OPTIONS,
  fetchHeatmap,
  fetchMatches,
  fetchStats,
  fetchStormDeaths,
  getMapBySlug,
  getMapMeta,
  shortId,
  type GlobalStats,
  type HeatmapPoint,
  type MatchSummary,
} from "../lib/data";
import { useAppData } from "../context/AppDataContext";

type KillType = "hh" | "hb" | "bh" | "bb";
type DeathFilter = "all" | "human" | "bot";
type HeatmapLayer = "loot" | "kills" | "position";
type PositionFilter = "human" | "bot";

type HoveredPoint = {
  point: HeatmapPoint;
  label: string;
  x: number;
  y: number;
};

type RenderHeatPoint = {
  x: number;
  y: number;
  weight: number;
};

const killTypeLabels: Record<KillType, string> = {
  hh: "Human kills Human",
  hb: "Human kills Bot",
  bh: "Bot kills Human",
  bb: "Bot kills Bot",
};

export function MapAnalysisPage() {
  const location = useLocation();
  const map = useMemo(() => getMapBySlug(location.pathname.split("/").pop() || ""), [location.pathname]);
  const { mapConfigs, mapConfigStatus } = useAppData();

  const [date, setDate] = useState("All");
  const [matchId, setMatchId] = useState("All");
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [lootPoints, setLootPoints] = useState<HeatmapPoint[]>([]);
  const [killPoints, setKillPoints] = useState<HeatmapPoint[]>([]);
  const [positionPoints, setPositionPoints] = useState<HeatmapPoint[]>([]);
  const [deathPoints, setDeathPoints] = useState<HeatmapPoint[]>([]);
  const [stormPoints, setStormPoints] = useState<HeatmapPoint[]>([]);
  const [activeHeatmaps, setActiveHeatmaps] = useState<HeatmapLayer[]>(["loot"]);
  const [showStormDeaths, setShowStormDeaths] = useState(false);
  const [showDeaths, setShowDeaths] = useState(false);
  const [killTypes, setKillTypes] = useState<KillType[]>(["hh", "hb", "bh", "bb"]);
  const [positionFilters, setPositionFilters] = useState<PositionFilter[]>(["human", "bot"]);
  const [deathFilter, setDeathFilter] = useState<DeathFilter>("all");
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [heatmapOpacity, setHeatmapOpacity] = useState(50);
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    let active = true;
    setDate("All");
    setMatchId("All");
    setMeasureMode(false);
    setMeasurePoints([]);
    setZoom(1);

    fetchMatches(map.id)
      .then((result) => {
        if (active) {
          setMatches(result);
        }
      })
      .catch((error) => {
        console.error(`Failed to load matches for ${map.id}`, error);
        if (active) {
          setMatches([]);
        }
      });

    return () => {
      active = false;
    };
  }, [map]);

  useEffect(() => {
    if (!map) {
      return;
    }

    let active = true;

    Promise.allSettled([
      fetchStats(map.id, date, matchId),
      fetchHeatmap(map.id, "loot", date, matchId),
      fetchHeatmap(map.id, "kills", date, matchId),
      fetchHeatmap(map.id, "position", date, matchId),
      fetchHeatmap(map.id, "deaths", date, matchId),
      fetchStormDeaths(map.id, date, matchId),
    ]).then(([statsResult, lootResult, killResult, positionResult, deathResult, stormResult]) => {
      if (!active) {
        return;
      }

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      } else {
        console.error(`Failed to load stats for ${map.id}`, statsResult.reason);
      }

      if (lootResult.status === "fulfilled") {
        setLootPoints(lootResult.value);
      } else {
        console.error(`Failed to load loot heatmap for ${map.id}`, lootResult.reason);
      }

      if (killResult.status === "fulfilled") {
        setKillPoints(killResult.value);
      } else {
        console.error(`Failed to load kill heatmap for ${map.id}`, killResult.reason);
      }

      if (positionResult.status === "fulfilled") {
        setPositionPoints(positionResult.value);
      } else {
        console.error(`Failed to load position heatmap for ${map.id}`, positionResult.reason);
      }

      if (deathResult.status === "fulfilled") {
        setDeathPoints(deathResult.value);
      } else {
        console.error(`Failed to load death heatmap for ${map.id}`, deathResult.reason);
      }

      if (stormResult.status === "fulfilled") {
        setStormPoints(stormResult.value);
      } else {
        console.error(`Failed to load storm deaths for ${map.id}`, stormResult.reason);
      }
    });

    return () => {
      active = false;
    };
  }, [date, map, matchId]);

  const visibleMatches = useMemo(
    () => matches.filter((entry) => date === "All" || entry.date === date),
    [date, matches],
  );

  useEffect(() => {
    if (matchId !== "All" && !visibleMatches.some((entry) => entry.match_id === matchId)) {
      setMatchId("All");
    }
  }, [matchId, visibleMatches]);

  const killCounts = useMemo(() => {
    const counts = { hh: 0, hb: 0, bh: 0, bb: 0 };
    killPoints.forEach((point) => {
      const kind = point.kind as KillType | undefined;
      if (kind) {
        counts[kind] += 1;
      }
    });
    return counts;
  }, [killPoints]);

  const deathCounts = useMemo(
    () => ({
      all: deathPoints.length,
      human: deathPoints.filter((point) => point.player_type === "Human").length,
      bot: deathPoints.filter((point) => point.player_type === "Bot").length,
    }),
    [deathPoints],
  );

  const stormCounts = useMemo(
    () => ({
      all: stormPoints.length,
      human: stormPoints.filter((point) => point.player_type === "Human").length,
      bot: stormPoints.filter((point) => point.player_type === "Bot").length,
    }),
    [stormPoints],
  );

  const visibleKillPoints = useMemo(
    () =>
      killPoints.filter((point) => {
        const kind = point.kind as KillType | undefined;
        return kind ? killTypes.includes(kind) : true;
      }),
    [killPoints, killTypes],
  );

  const positionCounts = useMemo(
    () => ({
      all: positionPoints.length,
      human: positionPoints.filter((point) => point.event_name === "Position").length,
      bot: positionPoints.filter((point) => point.event_name === "BotPosition").length,
    }),
    [positionPoints],
  );

  const visiblePositionPoints = useMemo(
    () =>
      positionPoints.filter((point) => {
        if (point.event_name === "Position") {
          return positionFilters.includes("human");
        }
        if (point.event_name === "BotPosition") {
          return positionFilters.includes("bot");
        }
        return true;
      }),
    [positionFilters, positionPoints],
  );

  const visibleDeathPoints = useMemo(
    () =>
      deathPoints.filter((point) => {
        if (deathFilter === "all") {
          return true;
        }
        return deathFilter === "human" ? point.player_type === "Human" : point.player_type === "Bot";
      }),
    [deathFilter, deathPoints],
  );

  const combinedHeatmapPoints = useMemo(() => {
    const next: RenderHeatPoint[] = [];

    if (activeHeatmaps.includes("loot")) {
      lootPoints.forEach((point) => {
        next.push({ x: point.x, y: point.y, weight: point.intensity ?? 0.86 });
      });
    }

    if (activeHeatmaps.includes("kills")) {
      visibleKillPoints.forEach((point) => {
        next.push({ x: point.x, y: point.y, weight: point.intensity ?? 1.0 });
      });
    }

    if (activeHeatmaps.includes("position")) {
      visiblePositionPoints.forEach((point) => {
        next.push({ x: point.x, y: point.y, weight: point.intensity ?? 0.3 });
      });
    }

    return next;
  }, [activeHeatmaps, lootPoints, visibleKillPoints, visiblePositionPoints]);

  const measurement =
    measurePoints.length === 2
      ? (() => {
          const [a, b] = measurePoints;
          const pixelDistance = Math.hypot(b.x - a.x, b.y - a.y);
          const imageSize = mapConfigs?.[map?.id ?? ""]?.image_size ?? 1024;
          const scale = map && mapConfigs?.[map.id]?.scale ? mapConfigs[map.id].scale : 0;
          const meters = scale ? (pixelDistance / imageSize) * scale : 0;
          const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          return {
            pixelDistance,
            meters,
            angle,
            midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          };
        })()
      : null;

  if (!map) {
    return <div className="flex h-full items-center justify-center text-white">Unknown map.</div>;
  }

  const activeBadge = [date !== "All" ? date : null, matchId !== "All" ? shortId(matchId) : null]
    .filter(Boolean)
    .join(" | ");

  const statRows = [
    { label: "Unique Matches", value: stats?.matches ?? 0 },
    { label: "Unique Players", value: stats?.total_players ?? 0 },
    { label: "Humans", value: stats?.humans ?? 0, valueClass: "text-[var(--storm-blue)]" },
    { label: "Bots", value: stats?.bots ?? 0, valueClass: "text-[var(--kill-red)]" },
    {
      label: "Avg Match Duration",
      value: formatDuration(stats?.avg_match_duration_seconds ?? 0),
    },
    { divider: true },
    { label: "Total Kills", value: stats?.total_kills ?? 0, valueClass: "text-[var(--kill-red)]", active: activeHeatmaps.includes("kills") },
    { label: "Total Deaths", value: stats?.total_deaths ?? 0, valueClass: "text-[var(--death-orange)]", active: showDeaths },
    { label: "Storm Deaths", value: stats?.storm_deaths ?? 0, valueClass: "text-[var(--storm-blue)]", active: showStormDeaths },
    { label: "Total Loot Events", value: stats?.total_loot_events ?? 0, valueClass: "text-[var(--loot-yellow)]", active: activeHeatmaps.includes("loot") },
    { label: "Position Samples", value: positionCounts.all, valueClass: "text-[#4cf0ff]", active: activeHeatmaps.includes("position") },
  ];

  const toggleHeatmap = (layer: HeatmapLayer) => {
    setActiveHeatmaps((current) => (current.includes(layer) ? current.filter((entry) => entry !== layer) : [...current, layer]));
  };

  const toggleMeasureMode = () => {
    setMeasurePoints([]);
    setMeasureMode(true);
  };

  return (
    <div className="h-full overflow-hidden bg-[var(--bg-base)] p-4">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={19} minSize={14} maxSize={28}>
          <aside className="flex h-full flex-col overflow-y-auto rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
            <SectionTitle>Filters</SectionTitle>
            <LabeledSelect label="Date" value={date} onChange={setDate} options={DATE_OPTIONS} />
            <LabeledSelect
              label="Match ID"
              value={matchId}
              onChange={setMatchId}
              options={["All", ...visibleMatches.map((entry) => entry.match_id)]}
              formatOption={(value) => {
                if (value === "All") {
                  return value;
                }
                const currentMatch = visibleMatches.find((entry) => entry.match_id === value);
                return currentMatch ? `${shortId(value)} | ${currentMatch.date}` : shortId(value);
              }}
            />

            <SectionTitle className="mt-5">Heatmaps</SectionTitle>
            <ToggleOption
              label="Loot"
              count={lootPoints.length}
              active={activeHeatmaps.includes("loot")}
              color="var(--loot-yellow)"
              onClick={() => toggleHeatmap("loot")}
            />
            <ToggleOption
              label="Kills"
              count={killPoints.length}
              active={activeHeatmaps.includes("kills")}
              color="var(--kill-red)"
              onClick={() => toggleHeatmap("kills")}
            />
            {activeHeatmaps.includes("kills") ? (
              <div className="mb-3 ml-5 space-y-2">
                {(Object.keys(killTypeLabels) as KillType[]).map((type) => (
                  <label
                    key={type}
                    className="flex min-w-0 items-center gap-2 rounded-md border border-transparent px-2 py-1 text-[11px] text-white/72 transition hover:border-white/8 hover:bg-white/4"
                  >
                    <input
                      type="checkbox"
                      className="shrink-0 accent-[var(--purple)]"
                      checked={killTypes.includes(type)}
                      onChange={() =>
                        setKillTypes((current) =>
                          current.includes(type) ? current.filter((entry) => entry !== type) : [...current, type],
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{killTypeLabels[type]}</span>
                    <CountBadge count={killCounts[type]} />
                  </label>
                ))}
              </div>
            ) : null}
            <ToggleOption
              label="Position"
              count={positionCounts.all}
              active={activeHeatmaps.includes("position")}
              color="#4cf0ff"
              onClick={() => toggleHeatmap("position")}
            />
            {activeHeatmaps.includes("position") ? (
              <div className="mb-3 ml-5 space-y-2">
                {[
                  { value: "human", label: "Human Position", count: positionCounts.human, color: "#4cf0ff" },
                  { value: "bot", label: "Bot Position", count: positionCounts.bot, color: "#ff63d8" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex min-w-0 items-center gap-2 rounded-md border border-transparent px-2 py-1 text-[11px] text-white/72 transition hover:border-white/8 hover:bg-white/4"
                  >
                    <input
                      type="checkbox"
                      className="shrink-0 accent-[var(--purple)]"
                      checked={positionFilters.includes(option.value as PositionFilter)}
                      onChange={() =>
                        setPositionFilters((current) =>
                          current.includes(option.value as PositionFilter)
                            ? current.filter((entry) => entry !== option.value)
                            : [...current, option.value as PositionFilter],
                        )
                      }
                    />
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: option.color }} />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <CountBadge count={option.count} />
                  </label>
                ))}
              </div>
            ) : null}
            <ToggleOption
              label="Storm Deaths"
              count={stormCounts.all}
              active={showStormDeaths}
              color="var(--storm-blue)"
              onClick={() => setShowStormDeaths((current) => !current)}
            />
            <ToggleOption
              label="Deaths"
              count={deathCounts.all}
              active={showDeaths}
              color="var(--death-orange)"
              onClick={() => setShowDeaths((current) => !current)}
            />
            {showDeaths ? (
              <div className="mb-3 ml-5 space-y-2">
                {[
                  { value: "all", label: "All Deaths", count: deathCounts.all },
                  { value: "human", label: "Human Deaths only", count: deathCounts.human },
                  { value: "bot", label: "Bot Deaths only", count: deathCounts.bot },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex min-w-0 items-center gap-2 rounded-md border border-transparent px-2 py-1 text-[11px] text-white/72 transition hover:border-white/8 hover:bg-white/4"
                  >
                    <input
                      type="radio"
                      name="death-filter"
                      className="shrink-0 accent-[var(--purple)]"
                      checked={deathFilter === option.value}
                      onChange={() => setDeathFilter(option.value as DeathFilter)}
                    />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <CountBadge count={option.count} />
                  </label>
                ))}
              </div>
            ) : null}

            <SectionTitle className="mt-2">Map Tools</SectionTitle>
            <ToolButton active={measureMode} disabled={mapConfigStatus !== "ready"} onClick={toggleMeasureMode}>
              Measure Mode
            </ToolButton>
            <ToolButton active={showGrid} onClick={() => setShowGrid((current) => !current)}>
              {showGrid ? "Hide Grid" : "Show Grid"}
            </ToolButton>
            <div className="mb-3 rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2">
              <div className="mb-2 flex items-center justify-between font-display text-[10px] uppercase tracking-[0.18em] text-white/68">
                <span>Heatmap Opacity</span>
                <span className="font-mono text-[11px] normal-case tracking-normal text-white/82">{heatmapOpacity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={heatmapOpacity}
                onChange={(event) => setHeatmapOpacity(Number(event.target.value))}
                className="w-full accent-[var(--purple)]"
              />
            </div>
            <div className="mb-3 rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-[11px] text-white/62">
              Selected heatmap events are merged into one shared density layer so overlap stays readable for level-design review.
            </div>
            <ToolButton
              onClick={() => {
                setActiveHeatmaps([]);
                setShowStormDeaths(false);
                setShowDeaths(false);
                setMeasureMode(false);
                setMeasurePoints([]);
              }}
            >
              Hide All
            </ToolButton>
            <ToolButton
              onClick={() => {
                setDate("All");
                setMatchId("All");
                setActiveHeatmaps(["loot"]);
                setShowStormDeaths(false);
                setShowDeaths(false);
                setPositionFilters(["human", "bot"]);
                setKillTypes(["hh", "hb", "bh", "bb"]);
                setDeathFilter("all");
                setShowGrid(false);
                setHeatmapOpacity(50);
                setMeasureMode(false);
                setMeasurePoints([]);
              }}
            >
              Reset
            </ToolButton>

            <div className="mt-auto rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-[10px] text-white/56">
              {mapConfigStatus === "ready"
                ? "Measure mode uses the backend map scale and coordinate conversion."
                : "Measure mode is disabled until /map-configs is available."}
            </div>
          </aside>
        </ResizablePanel>

        <ResizableHandle
          withHandle
          className="mx-2 rounded-full bg-white/10 after:w-3 hover:bg-white/18 focus-visible:ring-white/30"
        />

        <ResizablePanel defaultSize={81} minSize={72}>
          <div className="flex h-full min-w-0 gap-4">
            <section className="min-w-0 flex-1">
              <div className="h-full">
                <MapViewport
                  imageUrl={getMapMeta(map.id).imageUrl}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  onWheel={(delta) => setZoom((current) => Math.min(2.5, Math.max(0.75, current + (delta > 0 ? -0.1 : 0.1))))}
                  cursor={measureMode ? "crosshair" : "default"}
                  imageOpacity={0.85}
                  overlayOpacity={0.06}
                >
                  {measureMode ? (
                    <button
                      type="button"
                      className="absolute inset-0 z-10 h-full w-full"
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const x = ((event.clientX - rect.left) / rect.width) * 1024;
                        const y = ((event.clientY - rect.top) / rect.height) * 1024;
                        setMeasurePoints((current) => {
                          if (current.length === 2) {
                            return [{ x, y }];
                          }
                          const next = [...current, { x, y }];
                          if (next.length === 2) {
                            setMeasureMode(false);
                          }
                          return next;
                        });
                      }}
                    />
                  ) : null}

                  {showGrid ? <GridOverlay /> : null}

                  <UnifiedHeatmapCanvas points={combinedHeatmapPoints} opacity={heatmapOpacity / 100} />
                  {combinedHeatmapPoints.length > 0 ? <HeatmapScaleLegend /> : null}

                  {showStormDeaths
                    ? stormPoints.map((point) => (
                        <SkullMarker
                          key={point.id}
                          point={point}
                          color="var(--storm-blue)"
                          label="Storm Death"
                          opacity={heatmapOpacity / 100}
                          size={18}
                          onHover={setHoveredPoint}
                        />
                      ))
                    : null}
                  {showDeaths
                    ? visibleDeathPoints.map((point) => (
                        <SkullMarker
                          key={point.id}
                          point={point}
                          color="var(--death-orange)"
                          label="Death"
                          opacity={heatmapOpacity / 100}
                          size={17}
                          onHover={setHoveredPoint}
                        />
                      ))
                    : null}

                  {measurePoints.map((point, index) => (
                    <div
                      key={`${point.x}-${point.y}`}
                      className="absolute z-30"
                      style={{
                        left: `${(point.x / 1024) * 100}%`,
                        top: `${(point.y / 1024) * 100}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div className="h-3 w-3 rounded-full border border-black bg-white" />
                      <div className="mt-1 text-center font-display text-xs font-semibold text-white">{index === 0 ? "A" : "B"}</div>
                    </div>
                  ))}

                  {measurement ? (
                    <>
                      <div
                        className="absolute z-20 bg-white"
                        style={{
                          left: `${(measurement.midpoint.x / 1024) * 100}%`,
                          top: `${(measurement.midpoint.y / 1024) * 100}%`,
                          width: `${(measurement.pixelDistance / 1024) * 100}%`,
                          height: 2,
                          transform: `translate(-50%, -50%) rotate(${measurement.angle}deg)`,
                          transformOrigin: "center",
                        }}
                      />
                      <div
                        className="absolute z-30 rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-white"
                        style={{
                          left: `${(measurement.midpoint.x / 1024) * 100}%`,
                          top: `${(measurement.midpoint.y / 1024) * 100}%`,
                          transform: "translate(-50%, -140%)",
                        }}
                      >
                        {`${measurement.meters.toFixed(1)}m (${measurement.pixelDistance.toFixed(0)}px)`}
                      </div>
                    </>
                  ) : null}

                  {hoveredPoint ? (
                    <div
                      className="pointer-events-none absolute z-40 min-w-[164px] rounded-md border border-[var(--border-subtle)] bg-[#161919] px-3 py-2 text-[11px] text-white shadow-xl"
                      style={{
                        left: `clamp(88px, ${(hoveredPoint.x / 1024) * 100}%, calc(100% - 88px))`,
                        top: `max(72px, calc(${(hoveredPoint.y / 1024) * 100}% - 14px))`,
                        transform: "translate(-50%, -100%)",
                      }}
                    >
                      <div className="font-display text-xs uppercase tracking-[0.2em] text-white/72">{hoveredPoint.label}</div>
                      <div>
                        {hoveredPoint.point.player_type} | {shortId(hoveredPoint.point.match_id ?? "")}
                      </div>
                      <div className="font-mono text-white/64">
                        X {hoveredPoint.point.world_x?.toFixed(2) ?? "0.00"} / Z {hoveredPoint.point.world_z?.toFixed(2) ?? "0.00"}
                      </div>
                      <div className="text-white/64">Survived {Math.round(hoveredPoint.point.survived_time ?? 0)}s</div>
                    </div>
                  ) : null}
                </MapViewport>
              </div>
            </section>

            <aside className="flex min-h-0 w-[280px] flex-shrink-0 flex-col overflow-hidden rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
              <div className="flex items-center justify-between">
                <SectionTitle className="mt-0">Stats Overview</SectionTitle>
              </div>
              {activeBadge ? (
                <button
                  type="button"
                  className="mb-4 flex items-center justify-between rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-left text-[11px] text-white/80"
                  onClick={() => {
                    setDate("All");
                    setMatchId("All");
                  }}
                >
                  <span>Filtered: {activeBadge}</span>
                  <span className="font-display text-sm">x</span>
                </button>
              ) : null}

              <div className="panel-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {statRows.map((row, index) =>
                  "divider" in row ? (
                    <div key={`divider-${index}`} className="my-3 h-px bg-[var(--border-subtle)]" />
                  ) : (
                    <div
                      key={row.label}
                      className={`rounded-r-md px-3 py-2 ${
                        row.active ? "border-l-[3px] border-[var(--purple)] bg-white/4" : "border-l-[3px] border-transparent"
                      }`}
                    >
                      <div className="font-display text-[9px] uppercase tracking-[0.28em] text-white/42">{row.label}</div>
                      <div className={`mt-1 text-lg font-bold text-white ${row.valueClass ?? ""}`}>{row.value}</div>
                    </div>
                  ),
                )}
              </div>
            </aside>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function UnifiedHeatmapCanvas({
  points,
  opacity,
}: {
  points: RenderHeatPoint[];
  opacity: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length === 0) {
      return;
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = 320;
    offscreen.height = 320;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) {
      return;
    }

    offCtx.clearRect(0, 0, offscreen.width, offscreen.height);
    offCtx.globalCompositeOperation = "lighter";

    const densityRadius = points.length > 9000 ? 6 : points.length > 4500 ? 8 : 10;

    points.forEach((point) => {
      const x = (point.x / 1024) * offscreen.width;
      const y = (point.y / 1024) * offscreen.height;
      const gradient = offCtx.createRadialGradient(x, y, 0, x, y, densityRadius);
      const alpha = Math.min(1, point.weight);
      gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(0.35, `rgba(255,255,255,${alpha * 0.45})`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      offCtx.fillStyle = gradient;
      offCtx.fillRect(x - densityRadius, y - densityRadius, densityRadius * 2, densityRadius * 2);
    });

    const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imageData.data;
    const intensityValues: number[] = [];

    for (let index = 3; index < data.length; index += 4) {
      const value = data[index] / 255;
      if (value > 0) {
        intensityValues.push(value);
      }
    }

    if (intensityValues.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    intensityValues.sort((a, b) => a - b);
    const cap = intensityValues[Math.max(0, Math.floor(intensityValues.length * 0.95) - 1)] ?? intensityValues[intensityValues.length - 1] ?? 1;
    const floor = intensityValues[Math.max(0, Math.floor(intensityValues.length * 0.2) - 1)] ?? 0;

    for (let index = 0; index < data.length; index += 4) {
      const raw = data[index + 3] / 255;
      const normalized = cap > floor ? Math.max(0, Math.min(1, (raw - floor) / (cap - floor))) : raw;
      const intensity = Math.pow(normalized, 0.92);
      const color = getHeatColor(intensity);
      data[index] = color.r;
      data[index + 1] = color.g;
      data[index + 2] = color.b;
      data[index + 3] = Math.round(color.a * Math.min(0.85, opacity) * 255);
    }

    offCtx.putImageData(imageData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
  }, [opacity, points]);

  return <canvas ref={canvasRef} width={1024} height={1024} className="pointer-events-none absolute inset-0 z-[12] h-full w-full mix-blend-screen" />;
}

function getHeatColor(intensity: number) {
  if (intensity <= 0.2) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const stops = [
    { stop: 0.2, color: [0, 0, 0, 0] },
    { stop: 0.34, color: [18, 41, 92, 0.22] },
    { stop: 0.48, color: [42, 214, 255, 0.38] },
    { stop: 0.64, color: [110, 235, 109, 0.52] },
    { stop: 0.8, color: [255, 227, 87, 0.68] },
    { stop: 0.92, color: [255, 165, 70, 0.78] },
    { stop: 1, color: [255, 255, 255, 0.85] },
  ] as const;

  let start = stops[0];
  let end = stops[stops.length - 1];

  for (let index = 1; index < stops.length; index += 1) {
    if (intensity <= stops[index].stop) {
      start = stops[index - 1];
      end = stops[index];
      break;
    }
  }

  const range = Math.max(0.0001, end.stop - start.stop);
  const t = Math.max(0, Math.min(1, (intensity - start.stop) / range));
  return {
    r: Math.round(start.color[0] + (end.color[0] - start.color[0]) * t),
    g: Math.round(start.color[1] + (end.color[1] - start.color[1]) * t),
    b: Math.round(start.color[2] + (end.color[2] - start.color[2]) * t),
    a: start.color[3] + (end.color[3] - start.color[3]) * t,
  };
}

function HeatmapScaleLegend() {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-md border border-white/10 bg-black/45 px-3 py-2 shadow-lg backdrop-blur-sm">
      <div className="mb-2 font-display text-[10px] uppercase tracking-[0.18em] text-white/72">Density</div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-white/52">Low</span>
        <div
          className="h-2.5 w-28 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(18,41,92,0.85) 18%, rgba(42,214,255,0.9) 36%, rgba(110,235,109,0.9) 58%, rgba(255,227,87,0.95) 78%, rgba(255,165,70,0.97) 90%, rgba(255,255,255,1) 100%)",
          }}
        />
        <span className="font-mono text-[10px] text-white/82">High</span>
      </div>
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const wholeSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {count.toLocaleString()}
    </span>
  );
}

function GridOverlay() {
  return (
    <>
      <svg className="absolute inset-0 z-10 h-full w-full">
        {Array.from({ length: 11 }, (_, index) => (
          <g key={index}>
            <line x1={`${index * 10}%`} y1="0%" x2={`${index * 10}%`} y2="100%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <line x1="0%" y1={`${index * 10}%`} x2="100%" y2={`${index * 10}%`} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
          </g>
        ))}
      </svg>
      {Array.from({ length: 10 }, (_, y) =>
        Array.from({ length: 10 }, (_, x) => (
          <div
            key={`${x}-${y}`}
            className="absolute z-20 font-mono text-[10px] text-white/56"
            style={{ left: `${x * 10 + 1}%`, top: `${y * 10 + 1}%` }}
          >
            {String.fromCharCode(65 + x)}
            {y + 1}
          </div>
        )),
      )}
    </>
  );
}

function SectionTitle({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`mb-3 font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-white/54 ${className}`}>
      {children}
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  formatOption,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  formatOption?: (value: string) => string;
}) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 font-display text-[9px] uppercase tracking-[0.28em] text-white/42">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-[var(--border-subtle)] bg-black/20 px-3 py-2 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption ? formatOption(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleOption({
  label,
  count,
  active,
  color,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="mb-3 flex w-full min-w-0 items-center gap-3 text-left">
      <span
        className={`h-3.5 w-3.5 rounded-sm border ${active ? "border-transparent" : "border-white/24"}`}
        style={{ background: active ? color : "transparent" }}
      />
      <span className={`min-w-0 flex-1 truncate font-display text-[12px] uppercase tracking-[0.18em] ${active ? "text-white" : "text-white/68"}`}>{label}</span>
      <CountBadge count={count} />
    </button>
  );
}

function SkullMarker({
  point,
  color,
  label,
  opacity,
  size,
  onHover,
}: {
  point: HeatmapPoint;
  color: string;
  label: string;
  opacity: number;
  size: number;
  onHover: (value: HoveredPoint | null) => void;
}) {
  return (
    <button
      type="button"
      className="absolute z-20 text-center"
      style={{
        left: `${(point.x / 1024) * 100}%`,
        top: `${(point.y / 1024) * 100}%`,
        transform: "translate(-50%, -50%)",
        color,
        lineHeight: 1,
        opacity,
      }}
      onMouseEnter={() =>
        onHover({
          point,
          label,
          x: point.x,
          y: point.y,
        })
      }
      onMouseLeave={() => onHover(null)}
    >
      <Skull className="drop-shadow-[0_0_10px_rgba(0,0,0,0.35)]" size={size} strokeWidth={2.3} />
    </button>
  );
}

function ToolButton({
  children,
  active = false,
  disabled = false,
  onClick,
}: {
  children: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`mb-2 rounded-md border px-3 py-2 font-display text-[11px] uppercase tracking-[0.18em] transition ${
        active
          ? "border-[var(--purple)] bg-[var(--purple)] text-white"
          : "border-[var(--border-subtle)] bg-black/20 text-white/72 hover:border-white/20"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}
