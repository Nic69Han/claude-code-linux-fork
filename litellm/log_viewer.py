#!/usr/bin/env python3
"""
Claude Code — LiteLLM request log viewer
Reads litellm/logs/requests.log and displays a cost/usage summary.

Usage:
  python3 litellm/log_viewer.py              # show last 20 requests
  python3 litellm/log_viewer.py --all        # show all
  python3 litellm/log_viewer.py --summary    # cost summary only
"""
import json
import sys
from pathlib import Path
from datetime import datetime

LOG_FILE = Path(__file__).parent / "logs" / "requests.log"


def parse_logs():
    if not LOG_FILE.exists():
        print(f"No log file found at {LOG_FILE}")
        print("Start the LiteLLM proxy first: ./litellm/start.sh")
        return []
    entries = []
    with open(LOG_FILE) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                pass
    return entries


def format_cost(cost):
    if cost is None:
        return "n/a"
    return f"${cost:.6f}"


def main():
    show_all = "--all" in sys.argv
    summary_only = "--summary" in sys.argv

    entries = parse_logs()
    if not entries:
        return

    if not summary_only:
        limit = entries if show_all else entries[-20:]
        print(f"\n{'─'*90}")
        print(f"  {'Time':<20} {'Model':<35} {'Tokens In':>10} {'Tokens Out':>11} {'Cost':>12}")
        print(f"{'─'*90}")
        for e in limit:
            ts = e.get("startTime", "")
            if ts:
                try:
                    ts = datetime.fromisoformat(ts).strftime("%Y-%m-%d %H:%M:%S")
                except Exception:
                    pass
            model = e.get("model", "?")[:34]
            p_tokens = e.get("usage", {}).get("prompt_tokens", 0)
            c_tokens = e.get("usage", {}).get("completion_tokens", 0)
            cost = e.get("response_cost")
            print(f"  {ts:<20} {model:<35} {p_tokens:>10,} {c_tokens:>11,} {format_cost(cost):>12}")
        print(f"{'─'*90}")
        if not show_all and len(entries) > 20:
            print(f"  Showing last 20 of {len(entries)} entries. Use --all to see all.")

    # Summary
    total_cost = sum(e.get("response_cost") or 0 for e in entries)
    total_in = sum(e.get("usage", {}).get("prompt_tokens", 0) for e in entries)
    total_out = sum(e.get("usage", {}).get("completion_tokens", 0) for e in entries)
    models = {}
    for e in entries:
        m = e.get("model", "unknown")
        models[m] = models.get(m, 0) + 1

    print(f"\n  📊 Summary ({len(entries)} requests)")
    print(f"  Total cost    : {format_cost(total_cost)}")
    print(f"  Total tokens  : {total_in + total_out:,}  (in: {total_in:,} / out: {total_out:,})")
    print(f"  Models used   :")
    for m, count in sorted(models.items(), key=lambda x: -x[1]):
        print(f"    {count:>5}x  {m}")
    print()


if __name__ == "__main__":
    main()
