from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from .utils import HUMAN_EVENTS, detect_player_type, world_to_pixel


@dataclass
class ProcessedData:
    df_all: pd.DataFrame
    df: pd.DataFrame
    df_clean: pd.DataFrame
    anomalous_ids: list[str]


def process_data(df_all: pd.DataFrame) -> ProcessedData:
    df = df_all.copy()

    df["event"] = df["event"].apply(lambda value: value.decode("utf-8") if isinstance(value, bytes) else value)
    df["player_type"] = df["user_id"].apply(detect_player_type)

    bots_with_human_events = df[(df["player_type"] == "bot") & (df["event"].isin(HUMAN_EVENTS))]
    anomalous_ids = bots_with_human_events["user_id"].astype(str).unique().tolist()

    df["player_type"] = df.apply(
        lambda row: "anomalous" if str(row["user_id"]) in anomalous_ids else row["player_type"],
        axis=1,
    )

    df_clean = df[df["player_type"].isin(["human", "bot"])].reset_index(drop=True)

    df_clean["ts"] = pd.to_datetime(df_clean["ts"], errors="coerce")
    df_clean["ts_relative"] = df_clean.groupby("match_id")["ts"].transform(lambda value: (value - value.min()).dt.total_seconds())

    def convert_row(row: pd.Series) -> pd.Series:
        px, py = world_to_pixel(float(row["x"]), float(row["z"]), str(row["map_id"]))
        return pd.Series({"px": px, "py": py})

    df_clean[["px", "py"]] = df_clean.apply(convert_row, axis=1)

    return ProcessedData(df_all=df_all, df=df, df_clean=df_clean, anomalous_ids=anomalous_ids)
