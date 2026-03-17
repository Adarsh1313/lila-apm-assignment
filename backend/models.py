from __future__ import annotations

from pydantic import BaseModel


class MatchSummary(BaseModel):
    match_id: str
    day: str
    map_id: str
    human_count: int
    bot_count: int
    total_players: int


class PlayerMatchSummary(BaseModel):
    match_id: str
    map_id: str
    day: str
    kills: int
    deaths: int
    loots: int
    duration: float


class PlayerJourneyResponse(BaseModel):
    figure: dict
    match_history: list[PlayerMatchSummary]


class ReplayResponse(BaseModel):
    figure: dict


class FigureResponse(BaseModel):
    figure: dict
