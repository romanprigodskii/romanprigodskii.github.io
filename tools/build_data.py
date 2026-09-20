#!/usr/bin/env python3
"""Regenerate assets/data/audit.json from the paper artifacts.

Usage:
    python3 tools/build_data.py /path/to/vertexmma-paper/paper > assets/data/audit.json

Reads econ_numbers.json (the e-value audit) and tae_numbers.json (the detection
floor paper) and emits only the series the site plots. Every number on the site
comes through here; nothing is typed in by hand except the four Vertex metrics
below, which are read from the model's committed evaluation artifacts.
"""
import json
import os
import sys


def rnd(x, k=4):
    return None if x is None else round(float(x), k)


def build(src):
    with open(os.path.join(src, "econ_numbers.json")) as fh:
        econ = json.load(fh)
    with open(os.path.join(src, "tae_numbers.json")) as fh:
        tae = json.load(fh)

    segments = [
        {
            "n": s["n"],
            "ef": rnd(s["e_fair"], 3),
            "er": rnd(s["e_real"], 3),
            "g": rnd(s["g_fair"], 5),
            "f": s["name"].split("__")[0],
        }
        for s in econ["segments"]["table"]
    ]

    rename = {
        "RESIDUAL_CORRECTION": "residual correction",
        "drop the leaked is_title_fight": "drop the leaked title-fight flag",
    }

    def lever(row, shipped=False):
        name = row["name"].replace(" (v0.13.0)", "")
        return {
            "name": rename.get(name, name),
            "effect": rnd(row["effect"], 5),
            "ratio": rnd(row["abs_over_floor"], 3),
            **({"shipped": True} if row.get("shipped") else {}),
        }

    levers = [lever(r) for r in tae["eleven"]["table"]]
    levers += [lever(r) for r in tae["levers"]["table"]]

    return {
        "segments": {
            "rows": segments,
            "n": econ["segments"]["n_segments"],
            "pos_fair": econ["segments"]["pos_fair"],
            "pos_real": econ["segments"]["pos_real"],
            "clear_fair": econ["segments"]["clear_fair"],
            "clear_real": econ["segments"]["clear_real"],
            "bouts": econ["band"]["n"],
            "threshold": 20,
        },
        "ladder": {
            "fair": econ["exchange"]["ladder_fair"],
            "real": econ["exchange"]["ladder_real"],
            "labels": [
                "the search it ran",
                "+ the direction it could have searched",
                "+ the bookmaker's margin",
            ],
            "threshold": 20,
        },
        "floor": {
            "mde": rnd(tae["floor"]["mde_1seed"], 5),
            "nulls": [rnd(x, 5) for x in tae["floor"]["null_deltas"]],
            "largest_null": rnd(tae["floor"]["largest_null_lever_effect"], 5),
            "levers": levers,
            "pool": tae["floor"]["n_bouts"],
            "seeds": len(tae["floor"]["seeds"]),
            "power": rnd(tae["threshold"]["power_at_shipped"], 3),
            "null_share": rnd(tae["levers"]["null_share_of_shipped"], 3),
        },
        "budget": {
            "curve": [
                {"k": c["k"], "mde": rnd(c["mde"], 5)} for c in tae["budget"]["curve"]
            ],
            "asymptote": rnd(tae["budget"]["asymptote"], 5),
        },
        "debut": {
            "pool": tae["debut_pool"]["n_rows"],
            "effect": rnd(tae["debut_pool"]["effect"], 4),
            "floor": rnd(tae["debut_pool"]["mde_1seed"], 5),
            "over": rnd(tae["debut_pool"]["effect_over_floor"], 2),
        },
        # Held-out window event_date >= 2025-01-01, read from the Vertex MMA
        # repository's committed evaluation artifacts.
        "vertex": {
            "rows": [
                {"metric": "Accuracy", "model": 0.6753, "market": 0.6838, "higher": True},
                {"metric": "Log-loss", "model": 0.6171, "market": 0.5922, "higher": False},
                {"metric": "Brier", "model": 0.2140, "market": 0.2035, "higher": False},
            ],
            "auc": 0.7244,
            "n_all": 664,
            "n_priced": 582,
            "acc_all": 0.6747,
        },
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    json.dump(build(sys.argv[1]), sys.stdout, separators=(",", ":"))
