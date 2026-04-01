#!/usr/bin/env python3

from __future__ import annotations

import re
from pathlib import Path

from export_basic_info_seeds import SEEDS_DIR, TABLE_SPECS, load_columns, run_psql


def load_table_row_count(table_name: str) -> int | None:
    if not load_columns(table_name):
        return None
    output = run_psql(f"select count(*) from public.{table_name};")
    return int(output.strip() or "0")


def load_seed_row_count(seed_path: Path, table_name: str) -> int:
    if not seed_path.exists():
        raise FileNotFoundError(f"missing seed file: {seed_path.name}")

    content = seed_path.read_text(encoding="utf-8")
    pattern = re.compile(rf"INSERT INTO public\.{re.escape(table_name)}\b", re.IGNORECASE)
    return len(pattern.findall(content))


def main() -> int:
    failures: list[str] = []

    for table_name, filename in TABLE_SPECS:
        seed_path = SEEDS_DIR / filename
        try:
            local_count = load_table_row_count(table_name)
            seed_count = load_seed_row_count(seed_path, table_name)
        except Exception as exc:  # pragma: no cover - CLI reporting path
            failures.append(f"{table_name}: {exc}")
            continue

        if local_count is None:
            if seed_count > 0:
                print(
                    f"ok {table_name}: table unavailable in current local schema, seed {filename} has {seed_count} rows and will restore them after schema update/reset"
                )
            else:
                print(f"ok {table_name}: table unavailable in current local schema and seed empty")
            continue

        if local_count == 0 and seed_count > 0:
            print(
                f"ok {table_name}: local empty, seed {filename} has {seed_count} rows and will restore them on reset"
            )
            continue

        if local_count == 0 and seed_count == 0:
            print(f"ok {table_name}: local empty and seed empty")
            continue

        if local_count == seed_count:
            print(f"ok {table_name}: {local_count} rows")
            continue

        if local_count > 0:
            failures.append(
                f"{table_name}: local has {local_count} rows but seed {filename} has {seed_count} inserts"
            )
        else:
            print(
                f"ok {table_name}: local empty, seed {filename} has {seed_count} rows and will restore them on reset"
            )

    if failures:
        print("\nseed verification failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("\nseed verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
