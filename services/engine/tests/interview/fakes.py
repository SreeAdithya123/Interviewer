"""A minimal in-memory fake of the Supabase postgrest query builder, just
big enough to drive `app/interview/engine.py`'s real logic in tests without
touching the network or the live project.

Supports exactly the chain shapes `engine.py` uses: `.select("*").eq(...)
[.eq(...)].order(...).execute()`, `.insert(row_or_rows).execute()`,
`.update(values).eq(...).execute()`, and
`.upsert(row, on_conflict=...).execute()`. Nothing else — this is a test
double for one module's call patterns, not a general postgrest emulator.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any


def _new_id() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class FakeResult:
    def __init__(self, data: Any, count: int | None = None) -> None:
        self.data = data
        self.count = count if count is not None else (len(data) if isinstance(data, list) else 0)


class FakeQuery:
    def __init__(self, store: FakeClient, table_name: str) -> None:
        self._store = store
        self._table_name = table_name
        self._op: str | None = None
        self._payload: Any = None
        self._on_conflict: str | None = None
        self._filters: list[tuple[str, Any]] = []
        self._in_filters: list[tuple[str, list[Any]]] = []
        self._gte_filters: list[tuple[str, Any]] = []
        self._lte_filters: list[tuple[str, Any]] = []
        self._order_col: str | None = None

    # -- builder methods ---------------------------------------------------

    def select(self, *_columns: str, count: str | None = None) -> FakeQuery:
        self._op = "select"
        return self

    def insert(self, json: Any) -> FakeQuery:
        self._op = "insert"
        self._payload = json
        return self

    def update(self, json: Any) -> FakeQuery:
        self._op = "update"
        self._payload = json
        return self

    def delete(self) -> FakeQuery:
        self._op = "delete"
        return self

    def in_(self, column: str, values: list[Any]) -> FakeQuery:
        self._in_filters.append((column, values))
        return self

    def gte(self, column: str, value: Any) -> FakeQuery:
        self._gte_filters.append((column, value))
        return self

    def lte(self, column: str, value: Any) -> FakeQuery:
        self._lte_filters.append((column, value))
        return self

    def upsert(self, json: Any, *, on_conflict: str = "") -> FakeQuery:
        self._op = "upsert"
        self._payload = json
        self._on_conflict = on_conflict
        return self

    def eq(self, column: str, value: Any) -> FakeQuery:
        self._filters.append((column, value))
        return self

    def order(self, column: str) -> FakeQuery:
        self._order_col = column
        return self

    def single(self) -> FakeQuery:
        return self

    # -- execution ----------------------------------------------------------

    async def execute(self) -> FakeResult:
        rows = self._store.tables.setdefault(self._table_name, [])

        if self._op == "select":
            matched = [r for r in rows if self._row_matches(r)]
            if self._order_col:
                matched = sorted(matched, key=lambda r: r[self._order_col])
            return FakeResult([dict(r) for r in matched])

        if self._op == "insert":
            payload = self._payload if isinstance(self._payload, list) else [self._payload]
            inserted = []
            for row in payload:
                full = {**row}
                full.setdefault("id", _new_id())
                full.setdefault("created_at", _now_iso())
                rows.append(full)
                inserted.append(dict(full))
            return FakeResult(inserted)

        if self._op == "update":
            matched = [r for r in rows if self._row_matches(r)]
            for row in matched:
                row.update(self._payload)
            return FakeResult([dict(r) for r in matched])

        if self._op == "delete":
            matched = [r for r in rows if self._row_matches(r)]
            self._store.tables[self._table_name] = [r for r in rows if not self._row_matches(r)]
            return FakeResult([dict(r) for r in matched])

        if self._op == "upsert":
            key_col = self._on_conflict
            existing = None
            if key_col:
                existing = next((r for r in rows if r.get(key_col) == self._payload.get(key_col)), None)
            if existing is not None:
                existing.update(self._payload)
                return FakeResult([dict(existing)])
            full = {**self._payload}
            full.setdefault("id", _new_id())
            full.setdefault("created_at", _now_iso())
            rows.append(full)
            return FakeResult([dict(full)])

        raise NotImplementedError(f"FakeQuery has no op set (table={self._table_name!r})")

    def _get_field(self, row: dict[str, Any], col: str) -> Any:
        if col in row:
            return row[col]
        parts = col.replace("!inner", "").split(".")
        val: Any = row
        for p in parts:
            if isinstance(val, dict):
                val = val.get(p)
            else:
                return None
        return val

    def _row_matches(self, row: dict[str, Any]) -> bool:
        eq_match = all(self._get_field(row, col) == val for col, val in self._filters)
        in_match = all(self._get_field(row, col) in vals for col, vals in self._in_filters)
        gte_match = all(str(self._get_field(row, col) or "") >= str(val) for col, val in self._gte_filters)
        lte_match = all(str(self._get_field(row, col) or "") <= str(val) for col, val in self._lte_filters)
        return eq_match and in_match and gte_match and lte_match


class FakeClient:
    """Stands in for `supabase.AsyncClient` in tests. `tables` is a plain
    dict of table name -> list of row dicts, pre-seeded by the test and
    freely inspectable afterward."""

    def __init__(self) -> None:
        self.tables: dict[str, list[dict[str, Any]]] = {}

    def table(self, name: str) -> FakeQuery:
        return FakeQuery(self, name)

    def seed(self, table_name: str, rows: list[dict[str, Any]]) -> None:
        self.tables.setdefault(table_name, []).extend(dict(r) for r in rows)
