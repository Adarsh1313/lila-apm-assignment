from __future__ import annotations

import json
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_allowed_origins, get_data_path
from .models import FigureResponse, MatchSummary, PlayerJourneyResponse, PlayerMatchSummary, ReplayResponse
from .store import DataStore, build_store
from .utils import MAP_CONFIGS
from .visualizations import (
    event_distribution,
    heatmap,
    match_replay,
    pct_alive_over_time,
    player_counts_over_time,
    player_journey,
    spawn_zones,
    telemetry_overview,
)


STORE: DataStore | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global STORE
    STORE = build_store(get_data_path())
    yield


app = FastAPI(title="LILA BLACK Backend", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/minimaps", StaticFiles(directory=str(get_data_path() / "minimaps")), name="minimaps")


def require_store() -> DataStore:
    if STORE is None:
        raise HTTPException(status_code=503, detail="Data store not ready")
    return STORE


DAY_LABELS = {
    "Feb 10": "February_10",
    "Feb 11": "February_11",
    "Feb 12": "February_12",
    "Feb 13": "February_13",
    "Feb 14": "February_14",
}

DAY_REVERSE_LABELS = {value: key for key, value in DAY_LABELS.items()}
ELAPSED_SECONDS_SCALE = 1000.0


def normalize_day(day: str | None) -> str | None:
    if not day or day == "All":
        return None
    return DAY_LABELS.get(day, day)


def display_day(day: str) -> str:
    return DAY_REVERSE_LABELS.get(day, day)


def normalize_elapsed_seconds(value: float | int) -> float:
    return float(value) * ELAPSED_SECONDS_SCALE


def filter_df(store: DataStore, map_id: str | None = None, date: str | None = None, match_id: str | None = None):
    filtered = store.df_clean
    normalized_day = normalize_day(date)
    if map_id:
        filtered = filtered[filtered["map_id"] == map_id]
    if normalized_day:
        filtered = filtered[filtered["day"] == normalized_day]
    if match_id and match_id != "All":
        filtered = filtered[filtered["match_id"] == match_id]
    return filtered.copy()


def build_match_date_lookup(store: DataStore) -> dict[str, str]:
    rows = (
        store.df_clean[["match_id", "day"]]
        .drop_duplicates(subset=["match_id"])
        .assign(day=lambda frame: frame["day"].map(display_day))
    )
    return dict(zip(rows["match_id"].astype(str), rows["day"].astype(str)))


def build_player_labels(match_df) -> dict[str, str]:
    players = (
        match_df.groupby("user_id")["ts_relative"]
        .min()
        .sort_values()
        .index.astype(str)
        .tolist()
    )
    return {user_id: f"Player {index + 1}" for index, user_id in enumerate(players)}


def event_kind_to_feed_type(event_name: str) -> str | None:
    if event_name in {"Kill", "BotKill"}:
        return "kill"
    if event_name == "Loot":
        return "loot"
    if event_name == "KilledByStorm":
        return "storm"
    return None


def derive_kill_kind(event_name: str, player_type: str) -> str:
    if player_type == "human" and event_name == "Kill":
        return "hh"
    if player_type == "human" and event_name == "BotKill":
        return "hb"
    if player_type == "bot" and event_name == "BotKill":
        return "bh"
    return "bb"


@app.get("/healthz")
def healthcheck():
    store = require_store()
    return {
        "status": "ok",
        "rows": int(len(store.df_clean)),
        "matches": int(store.df_clean["match_id"].nunique()),
    }


@app.get("/map-configs")
def map_configs():
    return MAP_CONFIGS


@app.get("/api/heatmap", response_model=FigureResponse)
def get_heatmap(
    map_id: str = Query(...),
    event_type: str = Query(...),
    player_type: str = Query(...),
):
    store = require_store()
    fig = heatmap(store.df_clean, store.data_path, map_id, event_type, player_type)
    return {"figure": json.loads(fig.to_json())}


@app.get("/api/player-journey", response_model=PlayerJourneyResponse)
def get_player_journey(user_id: str, match_id: str | None = None):
    store = require_store()
    fig, history = player_journey(store.df_clean, store.data_path, user_id, match_id)
    return {"figure": json.loads(fig.to_json()), "match_history": history}


@app.get("/api/match-replay", response_model=ReplayResponse)
def get_match_replay(match_id: str):
    store = require_store()
    fig = match_replay(store.df_clean, store.data_path, match_id)
    return {"figure": json.loads(fig.to_json())}


@app.get("/api/telemetry")
def get_telemetry():
    store = require_store()
    return telemetry_overview(store.df_clean)


@app.get("/api/event-distribution", response_model=FigureResponse)
def get_event_distribution(map_id: str):
    store = require_store()
    fig = event_distribution(store.df_clean, map_id)
    return {"figure": json.loads(fig.to_json())}


@app.get("/api/player-counts-over-time", response_model=FigureResponse)
def get_player_counts_over_time():
    store = require_store()
    fig = player_counts_over_time(store.df_clean)
    return {"figure": json.loads(fig.to_json())}


@app.get("/api/pct-alive", response_model=FigureResponse)
def get_pct_alive():
    store = require_store()
    fig = pct_alive_over_time(store.df_clean)
    return {"figure": json.loads(fig.to_json())}


@app.get("/api/spawn-zones", response_model=FigureResponse)
def get_spawn_zones(player_filter: str = Query("all")):
    store = require_store()
    try:
        fig = spawn_zones(store.df_clean, store.data_path, player_filter=player_filter)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"figure": json.loads(fig.to_json())}


@app.get("/api/players")
def get_players():
    store = require_store()
    players = sorted(store.df_clean[store.df_clean["player_type"] == "human"]["user_id"].astype(str).unique().tolist())
    return players


@app.get("/api/matches", response_model=list[MatchSummary])
def get_matches():
    store = require_store()
    grouped = store.df_clean.groupby("match_id")
    results = []
    for match_id, match_df in grouped:
        human_count = int(match_df[match_df["player_type"] == "human"]["user_id"].nunique())
        bot_count = int(match_df[match_df["player_type"] == "bot"]["user_id"].nunique())
        results.append(
            MatchSummary(
                match_id=str(match_id),
                day=display_day(str(match_df["day"].iloc[0])),
                map_id=str(match_df["map_id"].iloc[0]),
                human_count=human_count,
                bot_count=bot_count,
                total_players=human_count + bot_count,
            )
        )
    return sorted(results, key=lambda item: item.total_players, reverse=True)


@app.get("/api/player-matches", response_model=list[PlayerMatchSummary])
def get_player_matches(user_id: str):
    store = require_store()
    filtered = store.df_clean[store.df_clean["user_id"].astype(str) == str(user_id)]
    results = []
    for match_id, match_df in filtered.groupby("match_id"):
        results.append(
            PlayerMatchSummary(
                match_id=str(match_id),
                map_id=str(match_df["map_id"].iloc[0]),
                day=display_day(str(match_df["day"].iloc[0])),
                kills=int((match_df["event"] == "Kill").sum()),
                deaths=int(match_df["event"].isin(["Killed", "BotKilled", "KilledByStorm"]).sum()),
                loots=int((match_df["event"] == "Loot").sum()),
                duration=normalize_elapsed_seconds(float(match_df["ts_relative"].max())),
            )
        )
    return sorted(results, key=lambda item: item.duration, reverse=True)


@app.get("/api/stats")
def get_stats(
    map_id: str = Query(...),
    date: str = Query("All"),
    match_id: str = Query("All"),
):
    store = require_store()
    filtered = filter_df(store, map_id=map_id, date=date, match_id=match_id)
    if filtered.empty:
        return {
            "matches": 0,
            "total_players": 0,
            "humans": 0,
            "bots": 0,
            "avg_match_duration_seconds": 0,
            "total_kills": 0,
            "total_deaths": 0,
            "storm_deaths": 0,
            "total_loot_events": 0,
        }

    durations = filtered.groupby("match_id")["ts_relative"].max().apply(normalize_elapsed_seconds)
    return {
        "matches": int(filtered["match_id"].nunique()),
        "total_players": int(filtered["user_id"].astype(str).nunique()),
        "humans": int(filtered[filtered["player_type"] == "human"]["user_id"].astype(str).nunique()),
        "bots": int(filtered[filtered["player_type"] == "bot"]["user_id"].astype(str).nunique()),
        "avg_match_duration_seconds": float(durations.mean()) if not durations.empty else 0,
        "total_kills": int(filtered["event"].isin(["Kill", "BotKill"]).sum()),
        "total_deaths": int(filtered["event"].isin(["Killed", "BotKilled", "KilledByStorm"]).sum()),
        "storm_deaths": int((filtered["event"] == "KilledByStorm").sum()),
        "total_loot_events": int((filtered["event"] == "Loot").sum()),
    }


@app.get("/api/heatmap-points")
def get_heatmap_points(
    map_id: str = Query(...),
    type: str = Query(...),
    date: str = Query("All"),
    match_id: str = Query("All"),
):
    store = require_store()
    filtered = filter_df(store, map_id=map_id, date=date, match_id=match_id)

    if type == "loot":
        filtered = filtered[filtered["event"] == "Loot"]
    elif type == "kills":
        filtered = filtered[filtered["event"].isin(["Kill", "BotKill"])]
    elif type == "deaths":
        filtered = filtered[filtered["event"].isin(["Killed", "BotKilled"])]
    else:
        raise HTTPException(status_code=400, detail="Unsupported heatmap type")

    return [
        {
            "id": f"{type}-{index}",
            "x": float(row["px"]),
            "y": float(row["py"]),
            "intensity": 0.65,
            "player_type": "Human" if row["player_type"] == "human" else "Bot",
            "match_id": str(row["match_id"]),
            "survived_time": normalize_elapsed_seconds(float(row["ts_relative"])),
            "kind": derive_kill_kind(str(row["event"]), str(row["player_type"])) if type == "kills" else None,
            "event_name": str(row["event"]),
            "world_x": float(row["x"]),
            "world_z": float(row["z"]),
        }
        for index, (_, row) in enumerate(filtered.iterrows())
    ]


@app.get("/api/storm-deaths")
def get_storm_deaths(
    map_id: str = Query(...),
    date: str = Query("All"),
    match_id: str = Query("All"),
):
    store = require_store()
    filtered = filter_df(store, map_id=map_id, date=date, match_id=match_id)
    filtered = filtered[filtered["event"] == "KilledByStorm"]
    return [
        {
            "id": f"storm-{index}",
            "x": float(row["px"]),
            "y": float(row["py"]),
            "player_type": "Human" if row["player_type"] == "human" else "Bot",
            "match_id": str(row["match_id"]),
            "survived_time": normalize_elapsed_seconds(float(row["ts_relative"])),
            "kind": "storm",
            "event_name": str(row["event"]),
            "world_x": float(row["x"]),
            "world_z": float(row["z"]),
        }
        for index, (_, row) in enumerate(filtered.iterrows())
    ]


@app.get("/api/telemetry/player-count")
def get_telemetry_player_count(map_id: str = Query(...), date: str = Query("All")):
    store = require_store()
    filtered = filter_df(store, map_id=map_id, date=date)
    positions = filtered[filtered["event"].isin(["Position", "BotPosition"])].copy()
    if positions.empty:
        return []

    positions["elapsed_seconds"] = positions["ts_relative"] * ELAPSED_SECONDS_SCALE
    positions["bucket"] = (positions["elapsed_seconds"] // 30).astype(int) * 30
    grouped = (
        positions.groupby(["match_id", "bucket"])["user_id"]
        .nunique()
        .reset_index(name="count")
        .groupby("bucket")["count"]
        .mean()
        .reset_index()
    )
    return [
        {"elapsed_seconds": int(row["bucket"]), "count": float(row["count"])}
        for _, row in grouped.iterrows()
    ]


@app.get("/api/telemetry/pct-alive")
def get_telemetry_pct_alive(map_id: str = Query(...), date: str = Query("All")):
    store = require_store()
    filtered = filter_df(store, map_id=map_id, date=date)
    positions = filtered[filtered["event"].isin(["Position", "BotPosition"])].copy()
    if positions.empty:
        return []

    totals = filtered.groupby("match_id")["user_id"].nunique().rename("total_players").reset_index()
    positions["elapsed_seconds"] = positions["ts_relative"] * ELAPSED_SECONDS_SCALE
    positions["bucket"] = (positions["elapsed_seconds"] // 30).astype(int) * 30
    alive = positions.groupby(["match_id", "bucket"])["user_id"].nunique().reset_index(name="alive_players")
    merged = alive.merge(totals, on="match_id", how="left")
    merged["pct_alive"] = (merged["alive_players"] / merged["total_players"]) * 100
    grouped = merged.groupby("bucket")["pct_alive"].mean().reset_index()
    return [
        {"elapsed_seconds": int(row["bucket"]), "pct_alive": float(row["pct_alive"])}
        for _, row in grouped.iterrows()
    ]


@app.get("/api/telemetry/spawn-zones")
def get_telemetry_spawn_zones(map_id: str = Query(...), date: str = Query("All")):
    store = require_store()
    filtered = filter_df(store, map_id=map_id, date=date)
    positions = filtered[filtered["event"].isin(["Position", "BotPosition"])].copy()
    if positions.empty:
        return []

    first_positions = (
        positions.sort_values("ts_relative")
        .groupby(["match_id", "user_id"])
        .first()
        .reset_index()
    )
    return [
        {
            "id": f"spawn-{index}",
            "x": float(row["px"]),
            "y": float(row["py"]),
            "player_type": "Human" if row["player_type"] == "human" else "Bot",
        }
        for index, (_, row) in enumerate(first_positions.iterrows())
    ]


@app.get("/api/replay-match")
def get_replay_match(match_id: str):
    store = require_store()
    match_df = filter_df(store, match_id=match_id)
    if match_df.empty:
        raise HTTPException(status_code=404, detail="Match not found")

    labels = build_player_labels(match_df)
    event_rows = match_df.sort_values("ts_relative")
    events: list[dict[str, Any]] = []
    seen_events: set[tuple[str, float, str]] = set()
    for _, row in event_rows.iterrows():
        feed_type = event_kind_to_feed_type(str(row["event"]))
        if not feed_type:
            continue
        key = (str(row["user_id"]), float(row["ts_relative"]), str(row["event"]))
        if key in seen_events:
            continue
        seen_events.add(key)
        label = labels[str(row["user_id"])]
        if feed_type == "kill":
            description = f"{label} recorded a kill"
        elif feed_type == "loot":
            description = f"{label} picked up loot"
        else:
            description = f"{label} died to storm"
        events.append(
            {
                "id": f"{match_id}-{len(events)}",
                "type": feed_type,
                "elapsed_seconds": normalize_elapsed_seconds(float(row["ts_relative"])),
                "description": description,
                "player_id": str(row["user_id"]),
            }
        )

    players = []
    for user_id, player_df in match_df.groupby("user_id"):
        ordered = player_df.sort_values("ts_relative")
        position_rows = ordered[ordered["event"].isin(["Position", "BotPosition"])]
        players.append(
            {
                "user_id": str(user_id),
                "label": labels[str(user_id)],
                "is_bot": bool(ordered["player_type"].iloc[0] == "bot"),
                "kills": int(ordered["event"].isin(["Kill", "BotKill"]).sum()),
                "team": "User Team" if labels[str(user_id)] in {"Player 1", "Player 2"} else "Enemy Team",
                "time_in_match": normalize_elapsed_seconds(float(ordered["ts_relative"].max())),
                "positions": [
                    {
                        "elapsed_seconds": normalize_elapsed_seconds(float(row["ts_relative"])),
                        "x": float(row["px"]),
                        "y": float(row["py"]),
                    }
                    for _, row in position_rows.iterrows()
                ],
            }
        )

    return {
        "match_id": str(match_id),
        "map_id": str(match_df["map_id"].iloc[0]),
        "date": display_day(str(match_df["day"].iloc[0])),
        "duration_seconds": normalize_elapsed_seconds(float(match_df["ts_relative"].max())),
        "events": events[:50],
        "players": sorted(players, key=lambda item: item["time_in_match"], reverse=True),
    }


@app.get("/api/players-all")
def get_players_all():
    store = require_store()
    grouped = (
        store.df_clean[["user_id", "player_type"]]
        .drop_duplicates(subset=["user_id"])
        .sort_values(["player_type", "user_id"])
    )
    return [
        {
            "user_id": str(row["user_id"]),
            "player_type": "Human" if row["player_type"] == "human" else "Bot",
        }
        for _, row in grouped.iterrows()
    ]


@app.get("/api/player-profile")
def get_player_profile(user_id: str):
    store = require_store()
    filtered = store.df_clean[store.df_clean["user_id"].astype(str) == str(user_id)].copy()
    if filtered.empty:
        raise HTTPException(status_code=404, detail="Player not found")

    match_history_lookup = {item.match_id: item for item in get_player_matches(user_id)}
    matches = []
    for current_match_id, match_df in filtered.groupby("match_id"):
        ordered = match_df.sort_values("ts_relative")
        position_rows = ordered[ordered["event"].isin(["Position", "BotPosition"])]
        summary = match_history_lookup[str(current_match_id)]
        events = []
        for index, (_, row) in enumerate(
            ordered[ordered["event"].isin(["Kill", "BotKill", "Killed", "BotKilled", "KilledByStorm", "Loot"])].iterrows()
        ):
            if row["event"] in {"Kill", "BotKill"}:
                event_type = "kill"
            elif row["event"] in {"Killed", "BotKilled"}:
                event_type = "death"
            elif row["event"] == "KilledByStorm":
                event_type = "storm"
            else:
                event_type = "loot"
            events.append(
                {
                    "id": f"{current_match_id}-{index}",
                    "type": event_type,
                    "x": float(row["px"]),
                    "y": float(row["py"]),
                    "elapsed_seconds": normalize_elapsed_seconds(float(row["ts_relative"])),
                    "kills": summary.kills,
                    "deaths": summary.deaths,
                    "loots": summary.loots,
                }
            )

        matches.append(
            {
                "match_id": str(current_match_id),
                "map_id": str(match_df["map_id"].iloc[0]),
                "date": display_day(str(match_df["day"].iloc[0])),
                "kills": summary.kills,
                "deaths": summary.deaths,
                "loots": summary.loots,
                "survived": summary.deaths == 0,
                "time_in_match": float(summary.duration),
                "positions": [
                    {
                        "elapsed_seconds": normalize_elapsed_seconds(float(row["ts_relative"])),
                        "x": float(row["px"]),
                        "y": float(row["py"]),
                    }
                    for _, row in position_rows.iterrows()
                ],
                "events": events,
            }
        )

    return {
        "user_id": str(user_id),
        "player_type": "Human" if filtered["player_type"].iloc[0] == "human" else "Bot",
        "matches": sorted(matches, key=lambda item: item["time_in_match"], reverse=True),
    }
