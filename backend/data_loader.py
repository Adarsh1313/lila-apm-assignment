from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd
import pyarrow.parquet as pq


LOGGER = logging.getLogger(__name__)
DAY_FOLDERS = [
    "February_10",
    "February_11",
    "February_12",
    "February_13",
    "February_14",
]


def load_day(folder_path: Path) -> tuple[pd.DataFrame, int]:
    frames: list[pd.DataFrame] = []
    file_count = 0
    day_name = folder_path.name

    for file_path in sorted(folder_path.iterdir()):
        if file_path.suffix != ".nakama-0":
            continue

        try:
            table = pq.read_table(file_path)
            dataframe = table.to_pandas()
            dataframe["day"] = day_name
            frames.append(dataframe)
            file_count += 1
        except Exception:
            LOGGER.exception("Failed to read parquet file: %s", file_path)

    if not frames:
        return pd.DataFrame(), 0

    return pd.concat(frames, ignore_index=True), file_count


def load_all_data(data_path: Path) -> tuple[pd.DataFrame, dict[str, int]]:
    day_frames: list[pd.DataFrame] = []
    per_day_file_counts: dict[str, int] = {}

    for day_name in DAY_FOLDERS:
        day_path = data_path / day_name
        if not day_path.exists():
            LOGGER.warning("Skipping missing data folder: %s", day_path)
            continue

        day_df, file_count = load_day(day_path)
        per_day_file_counts[day_name] = file_count
        if not day_df.empty:
            day_frames.append(day_df)

    if not day_frames:
        raise FileNotFoundError(f"No parquet data could be loaded from {data_path}")

    return pd.concat(day_frames, ignore_index=True), per_day_file_counts
