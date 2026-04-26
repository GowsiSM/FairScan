from __future__ import annotations

from dataclasses import dataclass, field
from threading import Lock
from typing import Any

import pandas as pd


from collections import OrderedDict

@dataclass
class SessionData:
    df_original: pd.DataFrame
    analysis: dict[str, Any]
    config: dict[str, Any]
    df_fixed: pd.DataFrame | None = None
    fix_result: dict[str, Any] | None = None


MAX_SESSIONS = 100
MAX_TOKENS = 50

_sessions: OrderedDict[str, SessionData] = OrderedDict()
_download_tokens: OrderedDict[str, pd.DataFrame] = OrderedDict()
_lock = Lock()


def set_session(session_id: str, data: SessionData) -> None:
    with _lock:
        if session_id in _sessions:
            _sessions.move_to_end(session_id)
        _sessions[session_id] = data
        if len(_sessions) > MAX_SESSIONS:
            _sessions.popitem(last=False)


def get_session(session_id: str) -> SessionData | None:
    with _lock:
        if session_id in _sessions:
            _sessions.move_to_end(session_id)
            return _sessions[session_id]
        return None


def set_fix_result(session_id: str, df_fixed: pd.DataFrame, result: dict[str, Any]) -> None:
    with _lock:
        if session_id in _sessions:
            _sessions[session_id].df_fixed = df_fixed
            _sessions[session_id].fix_result = result
            _sessions.move_to_end(session_id)


def bind_download_token(token: str, df: pd.DataFrame) -> None:
    with _lock:
        if token in _download_tokens:
            _download_tokens.move_to_end(token)
        _download_tokens[token] = df
        if len(_download_tokens) > MAX_TOKENS:
            _download_tokens.popitem(last=False)


def get_download_df(token: str) -> pd.DataFrame | None:
    with _lock:
        if token in _download_tokens:
            _download_tokens.move_to_end(token)
            return _download_tokens[token]
        return None
