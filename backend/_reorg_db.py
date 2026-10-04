"""Split db document modules and drop '_repository' from repository filenames."""

from __future__ import annotations

import ast
import re
from pathlib import Path

ROOT = Path("app")
BACKEND = Path(".")

DOC_SOURCES = {
    "app/db/documents.py": ("app", "app.db.app"),
    "app/db/user_documents.py": ("user", "app.db.user"),
    "app/db/admin_documents.py": ("admin", "app.db.admin"),
}


def snake(name: str) -> str:
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", name)
    text = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", text)
    return text.lower()


def segment(source: str, node: ast.AST) -> str:
    text = ast.get_source_segment(source, node)
    if text is None:
        raise SystemExit(f"missing source for {type(node)}")
    return text


def used_names(node: ast.AST) -> set[str]:
    return {item.id for item in ast.walk(node) if isinstance(item, ast.Name)}


def split_documents() -> dict[str, str]:
    """Return class name -> import module."""
    class_modules: dict[str, str] = {}
    for source_name, (folder, module) in DOC_SOURCES.items():
        path = Path(source_name)
        source = path.read_text(encoding="utf-8")
        tree = ast.parse(source)
        classes = [node for node in tree.body if isinstance(node, ast.ClassDef)]
        class_names = {node.name for node in classes}
        imported: dict[str, ast.AST] = {}
        for node in tree.body:
            if isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    imported[alias.asname or alias.name] = node
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    imported[alias.asname or alias.name.split(".")[0]] = node

        dest = Path("app/db") / folder
        dest.mkdir(parents=True, exist_ok=True)
        (dest / "__init__.py").write_text('"""MongoEngine documents."""\n', encoding="utf-8")

        for cls in classes:
            names = used_names(cls)
            lines: list[str] = []
            seen_import_sources: set[str] = set()
            for name in sorted(names):
                node = imported.get(name)
                if node is None or not isinstance(node, ast.ImportFrom):
                    continue
                key = f"{node.module}:{node.level}"
                if key in seen_import_sources:
                    continue
                group = [
                    alias.name
                    for alias in node.names
                    if (alias.asname or alias.name) in names
                ]
                if not group:
                    continue
                seen_import_sources.add(key)
                module_name = "." * node.level + (node.module or "")
                if len(group) == 1:
                    lines.append(f"from {module_name} import {group[0]}")
                else:
                    joined = ",\n    ".join(group)
                    lines.append(f"from {module_name} import (\n    {joined},\n)")

            peers = sorted(name for name in class_names if name in names and name != cls.name)
            for peer in peers:
                lines.append(f"from {module}.{snake(peer)} import {peer}")

            body = segment(source, cls)
            file_text = "\n".join(lines)
            if file_text:
                file_text += "\n\n\n"
            file_text += body
            if not file_text.endswith("\n"):
                file_text += "\n"
            filename = snake(cls.name) + ".py"
            (dest / filename).write_text(file_text, encoding="utf-8")
            class_modules[cls.name] = f"{module}.{snake(cls.name)}"
        path.unlink()
    return class_modules


def rewrite_document_imports(class_modules: dict[str, str]) -> None:
    old_modules = {"app.db.documents", "app.db.user_documents", "app.db.admin_documents"}
    for path in BACKEND.rglob("*.py"):
        source = path.read_text(encoding="utf-8")
        if not any(name in source for name in old_modules):
            continue
        tree = ast.parse(source)
        replacements: list[tuple[int, int, str]] = []
        for node in tree.body:
            if not isinstance(node, ast.ImportFrom) or node.module not in old_modules:
                continue
            lines = []
            for alias in node.names:
                target = class_modules[alias.name]
                bound = alias.asname or alias.name
                if alias.asname:
                    lines.append(f"from {target} import {alias.name} as {alias.asname}")
                else:
                    lines.append(f"from {target} import {bound}")
            start = node.lineno - 1
            end = (node.end_lineno or node.lineno) - 1
            replacements.append((start, end, "\n".join(lines)))
        if not replacements:
            continue
        rows = source.splitlines()
        for start, end, text in reversed(replacements):
            rows[start : end + 1] = text.splitlines()
        path.write_text("\n".join(rows) + ("\n" if source.endswith("\n") else ""), encoding="utf-8")


def rename_repositories() -> None:
    folder = Path("app/repositories")
    mapping: list[tuple[str, str]] = []
    for path in folder.glob("*_repository.py"):
        new_name = path.name.replace("_repository", "")
        mapping.append((path.stem, Path(new_name).stem))
    mapping.sort(key=lambda item: len(item[0]), reverse=True)
    for old_stem, new_stem in mapping:
        source = folder / f"{old_stem}.py"
        target = folder / f"{new_stem}.py"
        source.rename(target)
    for path in BACKEND.rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        updated = text
        for old_stem, new_stem in mapping:
            updated = updated.replace(f"app.repositories.{old_stem}", f"app.repositories.{new_stem}")
        if updated != text:
            path.write_text(updated, encoding="utf-8")


if __name__ == "__main__":
    modules = split_documents()
    rewrite_document_imports(modules)
    rename_repositories()
    print(f"documents {len(modules)}")
