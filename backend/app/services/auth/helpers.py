def parse_email_list(raw: str) -> set[str]:
    return {part.strip().lower() for part in raw.split(",") if part.strip()}
