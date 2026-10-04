from pathlib import Path

needles = (
    "app.db.documents",
    "app.db.user_documents",
    "app.db.admin_documents",
    "_repository",
)
for path in Path(".").rglob("*.py"):
    if path.name.startswith("_"):
        continue
    text = path.read_text(encoding="utf-8")
    hits = []
    for index, line in enumerate(text.splitlines(), 1):
        if "app.db.documents" in line or "app.db.user_documents" in line or "app.db.admin_documents" in line:
            hits.append(f"{index}: {line.strip()}")
        elif "app.repositories." in line and "_repository" in line:
            hits.append(f"{index}: {line.strip()}")
    if hits:
        print(path.as_posix())
        for hit in hits:
            print(" ", hit)
