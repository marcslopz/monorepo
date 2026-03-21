# Claude Code — monorepo

## Contexto del proyecto

Los archivos de contexto están en `.ai/`:

- `.ai/project.md` — descripción y propósito
- `.ai/structure.md` — estructura de carpetas
- `.ai/architecture.md` — arquitectura hexagonal aplicada al backend
- `.ai/environments.md` — entornos local, producción y CI

Lee estos archivos al inicio de cada sesión para tener contexto del proyecto.

## Reglas críticas

- **NUNCA ejecutar `pnpm`, `uv`, `pytest`, `ruff`, `mypy`, `eslint` directamente en el host.** Usar siempre `make <target> APP=<app>` — los comandos corren dentro de Docker. Ver `.ai/environments.md`.
