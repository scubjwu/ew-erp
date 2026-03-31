#!/usr/bin/env python3

from __future__ import annotations

import re
from pathlib import Path

from export_basic_info_seeds import SEEDS_DIR, TABLE_SPECS, run_psql


def load_table_row_count(table_name: str) -> int:
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

        if local_count != seed_count:
            failures.append(
                f"{table_name}: local has {local_count} rows but seed {filename} has {seed_count} inserts"
            )
        else:
            print(f"ok {table_name}: {local_count} rows")

    if failures:
        print("\nseed verification failed:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("\nseed verification passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
