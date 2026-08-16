"""Recursive character text splitter with no external dependencies."""

from __future__ import annotations

import re

# Token counts are approximated as characters / 4, so ~500 tokens of content
# with a ~50 token overlap becomes 2000 / 200 characters.
CHARS_PER_TOKEN = 4
DEFAULT_CHUNK_SIZE = 500 * CHARS_PER_TOKEN
DEFAULT_CHUNK_OVERLAP = 50 * CHARS_PER_TOKEN
SEPARATORS = ["\n\n", "\n", " ", ""]


def split_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")
    if chunk_overlap < 0:
        raise ValueError("chunk_overlap must not be negative")
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    text = text.strip()
    if not text:
        return []

    # Reserve room for the overlap so the final chunks stay within chunk_size.
    content_size = chunk_size - chunk_overlap
    pieces = _split_recursive(text, content_size, SEPARATORS)
    return _apply_overlap(_pack(pieces, content_size), chunk_overlap)


def _split_recursive(text: str, content_size: int, separators: list[str]) -> list[str]:
    """Break text into pieces that each fit within content_size."""
    if len(text) <= content_size:
        return [text] if text else []

    for index, separator in enumerate(separators):
        if separator == "":
            return [
                text[i : i + content_size] for i in range(0, len(text), content_size)
            ]
        if separator not in text:
            continue

        pieces: list[str] = []
        for part in _split_keeping_separator(text, separator):
            if not part:
                continue
            if len(part) <= content_size:
                pieces.append(part)
            else:
                pieces.extend(
                    _split_recursive(part, content_size, separators[index + 1 :])
                )
        return pieces

    return [text]


def _split_keeping_separator(text: str, separator: str) -> list[str]:
    """Split on separator while keeping it attached to the preceding part."""
    parts = text.split(separator)
    return [part + separator for part in parts[:-1]] + [parts[-1]]


def _pack(pieces: list[str], content_size: int) -> list[str]:
    """Greedily group pieces into chunks of at most content_size characters."""
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for piece in pieces:
        if current and current_len + len(piece) > content_size:
            chunks.append("".join(current))
            current = []
            current_len = 0
        current.append(piece)
        current_len += len(piece)

    if current:
        chunks.append("".join(current))

    return [chunk for chunk in (chunk.strip() for chunk in chunks) if chunk]


def _apply_overlap(chunks: list[str], chunk_overlap: int) -> list[str]:
    """Prefix each chunk with the tail of the one before it."""
    # One character of the budget is spent on the space joining tail and chunk.
    tail_limit = chunk_overlap - 1
    if tail_limit <= 0 or len(chunks) < 2:
        return chunks

    overlapped = [chunks[0]]
    for previous, chunk in zip(chunks, chunks[1:]):
        tail = previous[-chunk_overlap:]
        # Drop a leading partial word so the overlap starts cleanly.
        boundary = re.search(r"\s", tail)
        if boundary:
            tail = tail[boundary.end() :]
        tail = tail.strip()
        if len(tail) > tail_limit:
            tail = tail[-tail_limit:]
        overlapped.append(f"{tail} {chunk}" if tail else chunk)

    return overlapped
