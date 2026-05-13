"""Helpers for order lookups."""

import re


def normalize_order_number(raw: str) -> str:
    """Normalize user-entered order IDs for lookups."""
    s = (raw or '').strip()
    s = s.lstrip('#').strip()
    s = re.sub(r'\s+', '', s)
    return s
