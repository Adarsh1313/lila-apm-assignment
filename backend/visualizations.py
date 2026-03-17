from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from PIL import Image
from plotly.subplots import make_subplots

from .config import get_data_path
from .utils import MAP_CONFIGS, PARTIAL_DAYS, minimap_path


MAP_LINE_COLORS = {
    "AmbroseValley": "#7C3AED",
    "GrandRift": "#10B981",
    "Lockdown": "#F59E0B",
}


def _elapsed_seconds(series: pd.Series) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce").fillna(0.0)
    # Some local datasets carry ts_relative at ~1/1000 scale; normalize once here.
    return numeric * 1000 if numeric.max() <= 5 else numeric


def _background_figure(data_path: Path, map_id: str) -> go.Figure:
    fig = go.Figure()
    image_size = int(MAP_CONFIGS[map_id]["image_size"])
    image = Image.open(minimap_path(data_path, map_id))

    fig.add_layout_image(
        dict(
            source=image,
            x=0,
            y=0,
            sizex=image_size,
            sizey=image_size,
            xref="x",
            yref="y",
            layer="below",
        )
    )

    fig.update_xaxes(range=[0, image_size], showgrid=False, visible=False)
    fig.update_yaxes(range=[image_size, 0], showgrid=False, visible=False, scaleanchor="x", scaleratio=1)
    fig.update_layout(
        template=None,
        paper_bgcolor="#0a0a0f",
        plot_bgcolor="#0a0a0f",
        margin=dict(l=0, r=0, t=0, b=0),
        showlegend=True,
    )
    return fig


def heatmap(df_clean: pd.DataFrame, data_path: Path, map_id: str, event_type: str, player_type: str) -> go.Figure:
    filtered = df_clean[
        (df_clean["map_id"] == map_id)
        & (df_clean["event"] == event_type)
        & (df_clean["player_type"] == player_type)
    ]
    fig = _background_figure(data_path, map_id)
    colorscale = "Blues" if player_type == "human" else "YlOrRd"
    fig.add_trace(
        go.Histogram2dContour(
            x=filtered["px"],
            y=filtered["py"],
            colorscale=colorscale,
            contours=dict(coloring="heatmap"),
            showscale=False,
            opacity=0.82,
            hoverinfo="skip",
            nbinsx=40,
            nbinsy=40,
        )
    )
    return fig


def player_journey(df_clean: pd.DataFrame, data_path: Path, user_id: str, match_id: str | None = None) -> tuple[go.Figure, list[dict]]:
    filtered = df_clean[df_clean["user_id"].astype(str) == str(user_id)].copy()
    if match_id:
        filtered = filtered[filtered["match_id"] == match_id]

    if filtered.empty:
        return go.Figure(), []

    selected_map = filtered["map_id"].mode().iloc[0]
    fig = _background_figure(data_path, selected_map)

    for idx, (current_match_id, match_df) in enumerate(filtered.sort_values("ts_relative").groupby("match_id")):
        path_df = match_df[match_df["event"].isin(["Position", "Kill", "Killed", "KilledByStorm", "Loot"])].sort_values("ts_relative")
        color = px.colors.qualitative.Bold[idx % len(px.colors.qualitative.Bold)]
        fig.add_trace(
            go.Scatter(
                x=path_df["px"],
                y=path_df["py"],
                mode="lines+markers",
                name=str(current_match_id),
                line=dict(color=color, width=3),
                marker=dict(size=6, color=color),
                hovertemplate="match=%{text}<br>x=%{x:.1f}<br>y=%{y:.1f}<extra></extra>",
                text=[str(current_match_id)] * len(path_df),
            )
        )

    history = []
    for current_match_id, match_df in filtered.groupby("match_id"):
        history.append(
            {
                "match_id": str(current_match_id),
                "map_id": str(match_df["map_id"].iloc[0]),
                "day": str(match_df["day"].iloc[0]),
                "kills": int((match_df["event"] == "Kill").sum()),
                "deaths": int((match_df["event"].isin(["Killed", "KilledByStorm"])).sum()),
                "loots": int((match_df["event"] == "Loot").sum()),
                "duration": float(match_df["ts_relative"].max()),
            }
        )

    history.sort(key=lambda item: item["duration"], reverse=True)
    return fig, history


def match_replay(df_clean: pd.DataFrame, data_path: Path, match_id: str) -> go.Figure:
    filtered = df_clean[df_clean["match_id"] == match_id].copy()
    if filtered.empty:
        return go.Figure()

    map_id = filtered["map_id"].iloc[0]
    fig = _background_figure(data_path, map_id)

    filtered["frame_bucket"] = (filtered["ts_relative"] // 5).astype(int)
    grouped = filtered.sort_values("ts_relative").groupby("frame_bucket")
    frame_keys = list(grouped.groups.keys())

    if not frame_keys:
        return fig

    initial = grouped.get_group(frame_keys[0])
    fig.add_trace(
        go.Scatter(
            x=initial["px"],
            y=initial["py"],
            mode="markers",
            marker=dict(
                size=10,
                color=initial["player_type"].map({"human": "#3B82F6", "bot": "#EF4444"}),
            ),
            text=initial["user_id"].astype(str),
            name="Players",
        )
    )

    frames = []
    for bucket, frame_df in grouped:
        frames.append(
            go.Frame(
                name=str(bucket),
                data=[
                    go.Scatter(
                        x=frame_df["px"],
                        y=frame_df["py"],
                        mode="markers",
                        marker=dict(
                            size=10,
                            color=frame_df["player_type"].map({"human": "#3B82F6", "bot": "#EF4444"}),
                        ),
                        text=frame_df["user_id"].astype(str),
                    )
                ],
            )
        )

    fig.frames = frames
    fig.update_layout(
        updatemenus=[
            {
                "type": "buttons",
                "buttons": [
                    {"label": "Play", "method": "animate", "args": [None, {"frame": {"duration": 150, "redraw": True}}]},
                    {"label": "Pause", "method": "animate", "args": [[None], {"frame": {"duration": 0, "redraw": False}, "mode": "immediate"}]},
                ],
            }
        ],
        sliders=[
            {
                "steps": [
                    {"label": str(bucket * 5), "method": "animate", "args": [[str(bucket)], {"mode": "immediate"}]}
                    for bucket in frame_keys
                ]
            }
        ],
    )
    return fig


def telemetry_overview(df_clean: pd.DataFrame) -> dict:
    stats = {
        "total_matches": int(df_clean["match_id"].nunique()),
        "total_humans": int(df_clean[df_clean["player_type"] == "human"]["user_id"].nunique()),
        "total_bots": int(df_clean[df_clean["player_type"] == "bot"]["user_id"].nunique()),
        "total_events": int(len(df_clean)),
        "total_maps": int(df_clean["map_id"].nunique()),
        "total_days": int(df_clean["day"].nunique()),
        "storm_deaths": int((df_clean["event"] == "KilledByStorm").sum()),
        "total_kills": int(df_clean["event"].isin(["Kill", "BotKill"]).sum()),
        "partial_days": sorted(PARTIAL_DAYS),
        "sample_coverage_note": "This dataset is sampled and does not represent complete match coverage.",
    }

    events_by_day = px.bar(
        df_clean.groupby(["day", "event"]).size().reset_index(name="count"),
        x="day",
        y="count",
        color="event",
        barmode="stack",
    )
    events_by_map_day = px.bar(
        df_clean.groupby(["day", "map_id"]).size().reset_index(name="count"),
        x="day",
        y="count",
        color="map_id",
        barmode="stack",
    )
    map_distribution = px.pie(df_clean.groupby("map_id").size().reset_index(name="count"), names="map_id", values="count", hole=0.55)
    player_distribution = px.pie(
        df_clean.groupby("player_type").size().reset_index(name="count"),
        names="player_type",
        values="count",
        hole=0.55,
    )
    event_distribution_fig = px.pie(df_clean.groupby("event").size().reset_index(name="count"), names="event", values="count", hole=0.55)

    return {
        "stats": stats,
        "events_by_day": json.loads(events_by_day.to_json()),
        "events_by_map_day": json.loads(events_by_map_day.to_json()),
        "map_distribution": json.loads(map_distribution.to_json()),
        "player_distribution": json.loads(player_distribution.to_json()),
        "event_distribution": json.loads(event_distribution_fig.to_json()),
    }


def event_distribution(df_clean: pd.DataFrame, map_id: str) -> go.Figure:
    filtered = df_clean[df_clean["map_id"] == map_id]
    grouped = filtered.groupby(["event", "player_type"]).size().reset_index(name="count")
    fig = px.bar(
        grouped,
        x="event",
        y="count",
        color="player_type",
        barmode="group",
        color_discrete_map={"human": "#3B82F6", "bot": "#EF4444"},
    )
    fig.update_layout(paper_bgcolor="#0a0a0f", plot_bgcolor="#0a0a0f")
    return fig


def player_counts_over_time(df_clean: pd.DataFrame) -> go.Figure:
    positions = df_clean[df_clean["event"].isin(["Position", "BotPosition"])].copy()
    if positions.empty:
        fig = go.Figure()
        fig.update_layout(template="plotly_dark")
        return fig

    positions["minute"] = (_elapsed_seconds(positions["ts_relative"]) // 60).astype(int)
    per_match = (
        positions.groupby(["map_id", "match_id", "minute"])["user_id"]
        .nunique()
        .reset_index(name="active_players")
    )
    averaged = (
        per_match.groupby(["map_id", "minute"])["active_players"]
        .mean()
        .reset_index(name="avg_active_players")
    )

    fig = go.Figure()
    for map_id in ["AmbroseValley", "GrandRift", "Lockdown"]:
        map_rows = averaged[averaged["map_id"] == map_id]
        fig.add_trace(
            go.Scatter(
                x=map_rows["minute"],
                y=map_rows["avg_active_players"],
                mode="lines+markers",
                name=map_id,
                line=dict(color=MAP_LINE_COLORS[map_id], width=3),
                marker=dict(size=6, color=MAP_LINE_COLORS[map_id]),
                hovertemplate="%{fullData.name}<br>Minute %{x}<br>Avg Active Players %{y:.2f}<extra></extra>",
            )
        )

    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="#0D0D0D",
        plot_bgcolor="#0D0D0D",
        hovermode="x unified",
        xaxis_title="Match Time (minutes)",
        yaxis_title="Avg Active Players",
        margin=dict(l=40, r=20, t=30, b=40),
    )
    return fig


def pct_alive_over_time(df_clean: pd.DataFrame) -> go.Figure:
    positions = df_clean[df_clean["event"].isin(["Position", "BotPosition"])].copy()
    if positions.empty:
        fig = go.Figure()
        fig.update_layout(template="plotly_dark")
        return fig

    positions["minute"] = (_elapsed_seconds(positions["ts_relative"]) // 60).astype(int)
    last_seen = (
        positions.groupby(["map_id", "match_id", "user_id"])["minute"]
        .max()
        .reset_index(name="last_seen_minute")
    )
    match_totals = (
        last_seen.groupby(["map_id", "match_id"])["user_id"]
        .nunique()
        .reset_index(name="total_players")
    )

    rows: list[dict[str, float | int | str]] = []
    for (map_id, match_id), match_df in last_seen.groupby(["map_id", "match_id"]):
        total_players = int(match_totals[(match_totals["map_id"] == map_id) & (match_totals["match_id"] == match_id)]["total_players"].iloc[0])
        max_minute = int(match_df["last_seen_minute"].max())
        for minute in range(max_minute + 1):
            alive_count = int((match_df["last_seen_minute"] >= minute).sum())
            rows.append(
                {
                    "map_id": map_id,
                    "match_id": match_id,
                    "minute": minute,
                    "pct_alive": (alive_count / total_players) * 100 if total_players else 0,
                }
            )

    alive_df = pd.DataFrame(rows)
    averaged = alive_df.groupby(["map_id", "minute"])["pct_alive"].mean().reset_index()

    fig = go.Figure()
    for map_id in ["AmbroseValley", "GrandRift", "Lockdown"]:
        map_rows = averaged[averaged["map_id"] == map_id]
        fig.add_trace(
            go.Scatter(
                x=map_rows["minute"],
                y=map_rows["pct_alive"],
                mode="lines",
                fill="tozeroy",
                name=map_id,
                line=dict(color=MAP_LINE_COLORS[map_id], width=3),
                hovertemplate="%{fullData.name}<br>Minute %{x}<br>% Alive %{y:.1f}%<extra></extra>",
            )
        )

    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="#0D0D0D",
        plot_bgcolor="#0D0D0D",
        hovermode="x unified",
        xaxis_title="Match Time (minutes)",
        yaxis_title="% Alive",
        margin=dict(l=40, r=20, t=30, b=40),
    )
    fig.update_yaxes(range=[0, 100], ticksuffix="%")
    return fig


def spawn_zones(df_clean: pd.DataFrame, data_path: Path | None = None, player_filter: str = "all") -> go.Figure:
    if player_filter not in {"all", "human", "bot"}:
        raise ValueError("player_filter must be one of: all, human, bot")

    resolved_data_path = data_path or get_data_path()
    positions = df_clean[df_clean["event"].isin(["Position", "BotPosition"])].copy()
    if player_filter != "all":
        positions = positions[positions["player_type"] == player_filter]

    positions["elapsed_seconds"] = _elapsed_seconds(positions["ts_relative"])
    first_positions = (
        positions.sort_values("elapsed_seconds")
        .groupby(["map_id", "match_id", "user_id"], as_index=False)
        .first()
    )

    fig = make_subplots(
        rows=1,
        cols=3,
        subplot_titles=["AmbroseValley", "GrandRift", "Lockdown"],
        horizontal_spacing=0.02,
    )

    for col_idx, map_id in enumerate(["AmbroseValley", "GrandRift", "Lockdown"], start=1):
        map_df = first_positions[first_positions["map_id"] == map_id]
        image = Image.open(minimap_path(resolved_data_path, map_id))
        xref = "x" if col_idx == 1 else f"x{col_idx}"
        yref = "y" if col_idx == 1 else f"y{col_idx}"
        fig.add_layout_image(
            dict(
                source=image,
                xref=xref,
                yref=yref,
                x=0,
                y=1024,
                sizex=1024,
                sizey=1024,
                sizing="stretch",
                layer="below",
                opacity=0.8,
            )
        )

        for trace_player_type, color, label in [("human", "#3B82F6", "Human"), ("bot", "#EF4444", "Bot")]:
            trace_df = map_df[map_df["player_type"] == trace_player_type]
            if trace_df.empty:
                continue
            fig.add_trace(
                go.Scatter(
                    x=trace_df["px"],
                    y=trace_df["py"],
                    mode="markers",
                    name=label,
                    legendgroup=label,
                    showlegend=col_idx == 1,
                    marker=dict(size=6, color=color, opacity=0.7),
                    hovertemplate=f"{map_id}<br>{label}<br>x=%{{x:.1f}}<br>y=%{{y:.1f}}<extra></extra>",
                ),
                row=1,
                col=col_idx,
            )

        fig.update_xaxes(range=[0, 1024], showgrid=False, visible=False, row=1, col=col_idx)
        fig.update_yaxes(range=[1024, 0], showgrid=False, visible=False, row=1, col=col_idx, scaleanchor=xref, scaleratio=1)

    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="#0D0D0D",
        plot_bgcolor="#0D0D0D",
        width=1600,
        height=600,
        margin=dict(l=20, r=20, t=50, b=20),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="center", x=0.5),
    )
    return fig


# Preview in Colab
# fig_player_counts = player_counts_over_time(df_clean)
# fig_player_counts.show()
#
# fig_pct_alive = pct_alive_over_time(df_clean)
# fig_pct_alive.show()
#
# spawn_zones(df_clean, player_filter="all").show()
# spawn_zones(df_clean, player_filter="human").show()
# spawn_zones(df_clean, player_filter="bot").show()
