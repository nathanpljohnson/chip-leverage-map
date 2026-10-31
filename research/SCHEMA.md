# Research data format

Each research file is a JSON array of items. One item = one line on the map.

```json
{
  "id": "kebab-case-unique-id",
  "name": "Short display name, e.g. 'EUV lithography machines'",
  "category": "ai-chips | chipmaking-tools | software | memory | fabrication | materials | minerals | datacenter-hardware | compute-access",
  "leverage": "us | ally | china",
  "line_style": "solid | dotted",
  "from": { "site": "Specific facility or HQ, e.g. 'ASML HQ, Veldhoven'", "country": "Netherlands", "lat": 51.41, "lon": 5.45 },
  "via": [ { "site": "Transit point", "country": "Malaysia", "lat": 3.14, "lon": 101.69 } ],
  "to": { "site": "Specific destination or main user, e.g. 'SMIC, Shanghai'", "country": "China", "lat": 31.2, "lon": 121.6 },
  "what_it_is": "One plain-English sentence a non-expert understands.",
  "used_for": "What it enables: training frontier AI, military, phones, etc.",
  "status": "blocked | restricted | allowed | leaking | dependency",
  "status_detail": "Current rule or situation in 1-3 sentences, with the rule name/date.",
  "evidence": "One concrete fact: a number, market share, case, or trade figure.",
  "contested": false,
  "contested_note": "Only if contested: the other side in one sentence.",
  "sources": [ { "title": "...", "url": "https://...", "date": "YYYY-MM-DD" } ],
  "confidence": "high | medium | low"
}
```

## Meaning of fields
- `leverage`: who holds the leverage. `us` = China needs it from the US. `ally` = China needs it from a US ally. `china` = the US/allies need it from China.
- `line_style`: `dotted` only for flows that get around controls (smuggling, front companies, remote cloud access, diversion). Everything else `solid`.
- Direction: `from` is the supplier, `to` is the receiver. Blue items flow toward China; red items flow from China toward the US/allies.
- `via`: only for dotted routes that pass through transit countries. Omit otherwise.
- Coordinates: decimal degrees, real site location, 2 decimal places is fine.
- `status`: `blocked` = export banned; `restricted` = license required / partial; `allowed` = flows legally; `leaking` = flows despite controls; `dependency` = red items we rely on.

## Rules for researchers
- Today is 2026-10-28. Rules on chip exports to China changed many times in 2025-2026. Do NOT rely on memory for current status: verify with web searches and prefer the most recent primary sources (BIS/Federal Register, DOJ, MOFCOM, company filings, Reuters/Bloomberg/FT).
- Every item needs at least one source with a URL. Never invent a URL, number, or case.
- If you can't confirm something, set `confidence` to `low` and say so in `status_detail`.
- Keep text short and plain. No jargon without a plain explanation.
- Mark `contested: true` where credible experts disagree (e.g. whether a sale helps or hurts US interests).
