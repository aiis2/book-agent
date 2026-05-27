from __future__ import annotations

import importlib.util
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any

from .tool_registry import ToolRegistry


HOST_ROOT = Path(__file__).resolve().parents[1]
PLUGINS_ROOT = HOST_ROOT / "plugins"


@dataclass(frozen=True)
class LoadedPlugin:
    name: str
    path: Path
    tools: tuple[str, ...]


class PluginContext:
    def __init__(self, plugin_name: str, registry: ToolRegistry) -> None:
        self.plugin_name = plugin_name
        self.registry = registry
        self._tool_names: list[str] = []

    def register_tool(self, *, name: str, description: str, handler: Any) -> None:
        self.registry.register(
            name=name,
            plugin=self.plugin_name,
            description=description,
            handler=handler,
        )
        self._tool_names.append(name)

    @property
    def tool_names(self) -> tuple[str, ...]:
        return tuple(self._tool_names)


def _load_module(plugin_dir: Path) -> ModuleType:
    plugin_file = plugin_dir / "plugin.py"
    spec = importlib.util.spec_from_file_location(f"book_hermes_plugin_{plugin_dir.name}", plugin_file)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load plugin module from {plugin_file}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_plugins(plugins_root: Path | None = None) -> tuple[ToolRegistry, list[LoadedPlugin]]:
    root = plugins_root or PLUGINS_ROOT
    registry = ToolRegistry()
    loaded_plugins: list[LoadedPlugin] = []

    if not root.exists():
        return registry, loaded_plugins

    for plugin_dir in sorted(path for path in root.iterdir() if path.is_dir()):
        plugin_file = plugin_dir / "plugin.py"
        if not plugin_file.exists():
            continue

        module = _load_module(plugin_dir)
        register = getattr(module, "register", None)
        if register is None:
            continue

        context = PluginContext(plugin_dir.name, registry)
        register(context)
        loaded_plugins.append(
            LoadedPlugin(
                name=plugin_dir.name,
                path=plugin_dir,
                tools=context.tool_names,
            )
        )

    return registry, loaded_plugins