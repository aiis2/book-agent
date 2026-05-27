from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable


ToolHandler = Callable[..., dict[str, Any]]


@dataclass(frozen=True)
class ToolEntry:
    name: str
    plugin: str
    description: str
    handler: ToolHandler


class ToolRegistry:
    def __init__(self) -> None:
        self._tools: dict[str, ToolEntry] = {}

    def register(self, *, name: str, plugin: str, description: str, handler: ToolHandler) -> None:
        self._tools[name] = ToolEntry(
            name=name,
            plugin=plugin,
            description=description,
            handler=handler,
        )

    def list_tools(self) -> list[ToolEntry]:
        return sorted(self._tools.values(), key=lambda entry: entry.name)

    def tool_names(self) -> list[str]:
        return [entry.name for entry in self.list_tools()]

    def invoke(self, name: str, payload: dict[str, Any], **kwargs: Any) -> dict[str, Any]:
        entry = self._tools.get(name)
        if entry is None:
            raise KeyError(name)
        return entry.handler(payload, **kwargs)