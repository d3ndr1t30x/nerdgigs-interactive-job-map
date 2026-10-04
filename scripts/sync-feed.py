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


def normalize(item: ET.Element) -> dict:
    raw_title = child_text(item, "title")
    title, company = infer_title_and_company(raw_title)
    link = child_text(item, "link")
    guid = child_text(item, "guid") or link
    description = child_text(item, "description")
    combined = f"{title} {company} {description}"
    work_mode, remote = infer_mode(combined)
    # The current RSS contract does not expose reliable coordinates. Keep these
    # null rather than inventing a map point or dropping a role on Null Island.
    return {
        "id": guid,
        "title": title,
        "company": company,
        "location": "Anywhere in the World" if remote else "Location not specified in RSS feed",
        "latitude": None,
        "longitude": None,
        "geographicScope": "global" if remote else "unknown",
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
