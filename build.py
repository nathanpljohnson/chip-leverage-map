import json
from pathlib import Path

root = Path(__file__).parent
html = (root / "src/template.html").read_text()
data = json.dumps(json.loads((root / "data.json").read_text()), ensure_ascii=False, separators=(",", ":"))
world = json.dumps(json.loads((root / "build/countries-50m.json").read_text()), separators=(",", ":"))
data = data.replace("</", "<\\/")
app = (root / "src/app.js").read_text()
out = html.replace("/*__APP__*/", app).replace("/*__DATA__*/null", data).replace("/*__WORLD__*/null", world)
(root / "chip-leverage-map.html").write_text(out)
print(f"wrote chip-leverage-map.html ({len(out) // 1024} KB)")
(root / "index.html").write_text(out)
