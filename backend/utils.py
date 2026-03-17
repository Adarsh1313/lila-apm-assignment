from __future__ import annotations

import re
from pathlib import Path


UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

EVENT_VALUES = [
    "Position",
    "BotPosition",
    "Kill",
    "Killed",
    "BotKill",
    "BotKilled",
    "Loot",
    "KilledByStorm",
]

HUMAN_EVENTS = ["Position", "Kill", "Killed", "KilledByStorm", "Loot"]
BOT_EVENTS = ["BotPosition", "BotKill", "BotKilled"]

PARTIAL_DAYS = {"February_14"}

MAP_CONFIGS: dict[str, dict[str, float]] = {
    "AmbroseValley": {"scale": 900, "origin_x": -370, "origin_z": -473, "image_size": 1024},
    "GrandRift": {"scale": 581, "origin_x": -290, "origin_z": -290, "image_size": 1024},
    "Lockdown": {"scale": 1000, "origin_x": -500, "origin_z": -500, "image_size": 1024},
}


def detect_player_type(user_id: object) -> str:
    return "human" if UUID_PATTERN.match(str(user_id)) else "bot"


def world_to_pixel(x: float, z: float, map_id: str) -> tuple[float, float]:
    config = MAP_CONFIGS[map_id]
    u = (x - config["origin_x"]) / config["scale"]
    v = (z - config["origin_z"]) / config["scale"]
    px = u * config["image_size"]
    py = (1 - v) * config["image_size"]
    return px, py


def minimap_filename(map_id: str) -> str:
    return {
        "AmbroseValley": "AmbroseValley_Minimap.png",
        "GrandRift": "GrandRift_Minimap.png",
        "Lockdown": "Lockdown_Minimap.jpg",
    }[map_id]


def minimap_path(data_path: Path, map_id: str) -> Path:
    return data_path / "minimaps" / minimap_filename(map_id)


px, py = world_to_pixel(-301.45, -355.55, "AmbroseValley")
assert abs(px - 78) < 1 and abs(py - 890) < 1
