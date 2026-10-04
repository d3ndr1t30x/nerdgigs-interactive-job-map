"""Normalize the NerdGigs RSS/XML feed into the frontend's JSON contract.

The feed intentionally remains a server-side/build-time input. GitHub Pages
cannot fetch the current feed directly because it does not grant browser CORS.
"""
from __future__ import annotations

import html
import json
import os
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

FEED_URLS = [
    os.environ.get("NERDGIGS_FEED_URL", "https://www.nerdgigs.com/jobs.rss"),
    "https://www.nerdgigs.com/jobs.xml",
]
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "jobs.json"

LOCATION_POINTS = {
    "australia": (-35.2809, 149.1300), "sydney": (-33.8688, 151.2093), "melbourne": (-37.8136, 144.9631), "brisbane": (-27.4698, 153.0251), "new zealand": (-41.2866, 174.7756), "wellington": (-41.2866, 174.7756),
    "united kingdom": (51.5074, -0.1278), "uk": (51.5074, -0.1278), "london": (51.5074, -0.1278), "manchester": (53.4808, -2.2426), "oxford": (51.7520, -1.2577),
    "united states": (38.9072, -77.0369), "usa": (38.9072, -77.0369), "new york": (40.7128, -74.0060), "san francisco": (37.7749, -122.4194), "austin": (30.2672, -97.7431), "chicago": (41.8781, -87.6298), "los angeles": (34.0522, -118.2437), "seattle": (47.6062, -122.3321),
    "canada": (45.4215, -75.6972), "toronto": (43.6532, -79.3832), "vancouver": (49.2827, -123.1207), "india": (28.6139, 77.2090), "new delhi": (28.6139, 77.2090), "japan": (35.6762, 139.6503), "tokyo": (35.6762, 139.6503), "singapore": (1.3521, 103.8198), "germany": (52.5200, 13.4050), "berlin": (52.5200, 13.4050), "france": (48.8566, 2.3522), "paris": (48.8566, 2.3522), "netherlands": (52.3676, 4.9041), "amsterdam": (52.3676, 4.9041), "switzerland": (46.9480, 7.4474), "europe": (50.8503, 4.3517), "emea": (51.5074, -0.1278), "apac": (1.3521, 103.8198),
}


def clean(value: str | None) -> str:
    value = html.unescape(html.unescape(value or ""))
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def fetch_feed() -> bytes:
    for url in FEED_URLS:
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "NerdGigs-Map-Feed-Sync/1.0"})
            with urllib.request.urlopen(request, timeout=90) as response:
                return response.read()
        except Exception as error:
            print(f"Feed unavailable: {url} ({error})")
    raise RuntimeError("Neither the RSS nor XML NerdGigs feed could be loaded")


def child_text(item: ET.Element, name: str) -> str:
    node = item.find(name)
    return clean(node.text if node is not None else "")


def infer_title_and_company(raw_title: str) -> tuple[str, str]:
    parts = [part.strip() for part in re.split(r"\s+-\s*|\s+–\s*", raw_title) if part.strip()]
    if len(parts) >= 2:
        return " - ".join(parts[:-1]), parts[-1]
    return raw_title.strip(), "NerdGigs listing"


def infer_mode(text: str) -> tuple[str, bool]:
    lower = text.lower()
    if re.search(r"\bhybrid\b", lower):
        return "hybrid", False
    if re.search(r"\b(on[- ]?site|onsite|office[- ]based)\b", lower):
        return "onsite", False
    if re.search(r"\b(remote|work from home|anywhere in the world)\b", lower):
        return "remote", True
    return "onsite", False


def infer_category(text: str) -> str:
    lower = text.lower()
    if re.search(r"security|infosec|cyber|privacy", lower):
        return "Cybersecurity"
    if re.search(r"quant|statistic|finance|trading|analytics|econom", lower):
        return "Mathematics & Finance"
    if re.search(r"research|scientist|biology|clinical|chemist|physics|laboratory|climate", lower):
        return "Science & Research"
    if re.search(r"engineer|developer|software|data|devops|cloud|machine learning|ai|technical", lower):
        return "Tech & Engineering"
    return "Tech-Adjacent & Other Nerd Stuff"


def infer_employment(text: str) -> str:
    lower = text.lower()
    for label, pattern in [("Part-time", r"part[- ]time"), ("Contract", r"contract|freelance"), ("Internship", r"intern"), ("Temporary", r"temporary")]:
        if re.search(pattern, lower):
            return label
    return "Full-time"


def approximate_point(text: str, identifier: str) -> tuple[float | None, float | None, str]:
    lower = text.lower()
    for hint, point in sorted(LOCATION_POINTS.items(), key=lambda pair: len(pair[0]), reverse=True):
        if re.search(rf"(?<![a-z]){re.escape(hint)}(?![a-z])", lower):
            seed = sum(ord(char) for char in identifier)
            lat = point[0] + ((seed % 17) - 8) / 100
            lon = point[1] + (((seed // 17) % 17) - 8) / 100
            return round(lat, 5), round(lon, 5), hint.title()
    return None, None, "Anywhere in the World"


def normalize(item: ET.Element) -> dict:
    raw_title = child_text(item, "title")
    title, company = infer_title_and_company(raw_title)
    link = child_text(item, "link")
    guid = child_text(item, "guid") or link
    description = child_text(item, "description")
    combined = f"{title} {company} {description}"
    work_mode, remote = infer_mode(combined)
    latitude, longitude, location = approximate_point(f"{title} {company}", guid)
    if not latitude and not remote:
        location = "Location not specified in RSS feed"
    return {
        "id": guid,
        "title": title,
        "company": company,
        "location": location,
        "latitude": latitude,
        "longitude": longitude,
        "geographicScope": "global" if remote and not latitude else ("approximate" if latitude else "unknown"),
        "url": link,
        "employmentType": infer_employment(combined),
        "workMode": work_mode,
        "remote": remote,
        "category": infer_category(combined),
        "salary": "Not listed",
        "publishedAt": child_text(item, "pubDate"),
    }


def main() -> None:
    root = ET.fromstring(fetch_feed())
    items = root.findall("./channel/item")
    jobs = [normalize(item) for item in items if child_text(item, "title") and child_text(item, "link")]
    OUTPUT.write_text(json.dumps(jobs, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(jobs)} normalized NerdGigs jobs to {OUTPUT}")


if __name__ == "__main__":
    main()
