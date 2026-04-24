from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from typing import Any

import pandas as pd


@dataclass
class SessionData:
    df_original: pd.DataFrame
    analysis: dict[str, Any]
    config: dict[str, Any]
    df_fixed: pd.DataFrame | None = None
    fix_result: dict[str, Any] | None = None


_sessions: dict[str, SessionData] = {}
_download_tokens: dict[str, pd.DataFrame] = {}
_lock = Lock()


def set_session(session_id: str, data: SessionData) -> None:
    with _lock:
        _sessions[session_id] = data


def get_session(session_id: str) -> SessionData | None:
    with _lock:
        return _sessions.get(session_id)


def set_fix_result(session_id: str, df_fixed: pd.DataFrame, result: dict[str, Any]) -> None:
    with _lock:
        if session_id in _sessions:
            _sessions[session_id].df_fixed = df_fixed
            _sessions[session_id].fix_result = result


def bind_download_token(token: str, df: pd.DataFrame) -> None:
    with _lock:
        _download_tokens[token] = df


def get_download_df(token: str) -> pd.DataFrame | None:
    with _lock:
        return _download_tokens.get(token)
