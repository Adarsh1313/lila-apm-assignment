from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from .data_loader import load_all_data
from .data_processor import ProcessedData, process_data


@dataclass
class DataStore:
    data_path: Path
    processed: ProcessedData
    file_counts: dict[str, int]

    @property
    def df_all(self) -> pd.DataFrame:
        return self.processed.df_all

    @property
    def df_clean(self) -> pd.DataFrame:
        return self.processed.df_clean


def build_store(data_path: Path) -> DataStore:
    df_all, file_counts = load_all_data(data_path)
    processed = process_data(df_all)
    return DataStore(data_path=data_path, processed=processed, file_counts=file_counts)
