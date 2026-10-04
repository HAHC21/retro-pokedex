import ast
from pathlib import Path

missing = []
for path in Path("app/db").rglob("*.py"):
    if path.name == "__init__.py":
        continue
    tree = ast.parse(path.read_text(encoding="utf-8"))
    imported = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            for alias in node.names:
                imported.add(alias.asname or alias.name)
    defined = {node.name for node in tree.body if isinstance(node, (ast.ClassDef, ast.FunctionDef))}
    used = set()
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            for item in ast.walk(node):
                if isinstance(item, ast.Name) and isinstance(item.ctx, ast.Load):
                    used.add(item.id)
    unknown = sorted(name for name in used if name not in imported and name not in defined and name not in {"list", "dict", "str", "int", "bool", "None", "True", "False"})
    if unknown:
        missing.append((path.as_posix(), unknown))

print("name gaps", len(missing))
for path, names in missing:
    print(path, names)

print("--- files ---")
for folder in ("app", "admin", "user"):
    names = sorted(p.name for p in Path("app/db", folder).glob("*.py"))
    print(folder, len(names), names)
print("repos", sorted(p.name for p in Path("app/repositories").glob("*.py")))
