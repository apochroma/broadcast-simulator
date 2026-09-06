#!/usr/bin/env python3
"""Export mobile-device inventory (Device Family, Name, User, ICCID, eSIM ID) from the
Iru (formerly Kandji) Endpoint Management API to a CSV file.

Uses the Prism "Cellular" endpoint, which returns cellular/SIM attributes per device
in one call: GET /api/v1/prism/cellular

API docs: https://docs.iru.com/en/endpoint/api/iru-api-overview

Usage:
    export IRU_BASE_URL="https://<subdomain>.api.kandji.io"
    export IRU_API_TOKEN="<your-api-token>"
    python3 iru_device_export.py --output devices.csv

    # or pass everything as flags:
    python3 iru_device_export.py \
        --base-url https://<subdomain>.api.kandji.io \
        --token <your-api-token> \
        --device-family iPhone \
        --output devices.csv
"""

import argparse
import csv
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

PAGE_LIMIT = 300  # hard upper limit enforced by the API
FIELDNAMES = ["Device Family", "Device Name", "Device User", "ICCID", "eSIM ID"]


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--base-url",
        default=os.environ.get("IRU_BASE_URL"),
        help="Iru API base URL, e.g. https://<subdomain>.api.kandji.io (env: IRU_BASE_URL)",
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("IRU_API_TOKEN"),
        help="Iru API bearer token (env: IRU_API_TOKEN)",
    )
    parser.add_argument(
        "--device-family",
        default="iPhone",
        help="Comma-separated device families to include, e.g. 'iPhone' or 'iPhone,iPad' (default: iPhone)",
    )
    parser.add_argument(
        "--output",
        default="devices.csv",
        help="Output CSV file path (default: ./devices.csv)",
    )
    args = parser.parse_args()
    if not args.base_url:
        parser.error("Missing API base URL. Pass --base-url or set IRU_BASE_URL.")
    if not args.token:
        parser.error("Missing API token. Pass --token or set IRU_API_TOKEN.")
    return args


def fetch_page(base_url, token, device_family, offset):
    url = (
        f"{base_url.rstrip('/')}/api/v1/prism/cellular"
        f"?device_families={urllib.parse.quote(device_family)}"
        f"&limit={PAGE_LIMIT}&offset={offset}"
    )
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def join_slots(*values):
    """Combine ICCID/EID values from both SIM slots, dropping empties and duplicates."""
    seen = []
    for v in values:
        if v and v not in seen:
            seen.append(v)
    return "; ".join(seen)


def main():
    args = parse_args()

    rows = []
    offset = 0
    while True:
        try:
            page = fetch_page(args.base_url, args.token, args.device_family, offset)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            sys.exit(f"API error {e.code}: {body}")
        except urllib.error.URLError as e:
            sys.exit(f"Connection error: {e.reason}")

        data = page.get("data") or []
        if not data:
            break

        for d in data:
            rows.append(
                {
                    "Device Family": d.get("device__family") or "",
                    "Device Name": d.get("device__name") or "",
                    "Device User": d.get("device__user_name") or d.get("device__user_email") or "",
                    "ICCID": join_slots(d.get("iccid_slot_1"), d.get("iccid_slot_2")),
                    "eSIM ID": join_slots(d.get("eid_slot_1"), d.get("eid_slot_2")),
                }
            )

        if len(data) < PAGE_LIMIT:
            break
        offset += PAGE_LIMIT

    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} device(s) to {args.output}")


if __name__ == "__main__":
    main()
