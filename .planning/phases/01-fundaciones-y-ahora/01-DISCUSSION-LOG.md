# Phase 1: Fundaciones y Ahora - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-23
**Phase:** 01-fundaciones-y-ahora
**Areas discussed:** ninguna (el usuario respondió "sin preferencia")

---

## Áreas presentadas

| Option | Description | Selected |
|--------|-------------|----------|
| Último dato bueno | Data Cache de Vercel vs. Supabase para servir el dato anterior si cae la fuente | |
| Fuentes en la fase 1 | Solo `current` o snapshot completo (forecast + MET Norway) | |
| Repo y deploy | Repo público/privado, URL vercel.app o dominio, quién conecta Vercel | |
| Probar fallas y frescura | Cómo simular fuente caída/dato viejo (env var, flag, /dev) | |

**User's choice:** sin preferencia. No se eligió ninguna área.
**Notes:** Claude tomó defaults recomendados en las cuatro áreas (D-01..D-15 de CONTEXT.md), marcados como revisables antes de planificar.

## Claude's Discretion

- Las cuatro áreas: Data Cache sin Supabase, Open-Meteo completo + MET oculto, repo privado + vercel.app + Git integration con checkpoint humano, `WEATHER_FAULT` fuera de producción + `/dev/estados`.
- Estructura de carpetas, `/api/weather` en la fase 1, lint y gestor de paquetes.

## Deferred Ideas

- Repo público (antes de la fase 7), dominio propio, último snapshot en Supabase (solo si la Data Cache no alcanza).
