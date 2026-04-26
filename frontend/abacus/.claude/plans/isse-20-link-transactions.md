# Plan — Issue #20: Realized P&L con linking buy↔sell en abacus

## Status: COMPLETADO ✓

## Pasos

- [x] Modelo de dominio: `TransactionLink`, `LinkValidationError`, puertos extendidos
- [x] Migración alembic: `c1d2e3f4a5b6_add_transaction_links.py` (`down_revision='b3c4d5e6f7a8'`)
- [x] Repositorios: `sqlalchemy_transaction_link_repository.py` + métodos nuevos en `sqlalchemy_transaction_repository.py` (`list_open_buys`, `get_by_id`, `get_links_*`, `list_by_ids`)
- [x] Servicio: `pnl.py` (función pura), `transaction_service.py` (`_auto_link_fifo`, `update_sell_links`, `get_available_buys_for_sell`, `compute_summary_by_asset`)
- [x] API: 4 nuevos endpoints (`GET /summary/by-asset`, `GET /{id}/available-buys`, `PUT /{id}/links`, enriquecimiento del `GET /`)
- [x] Schemas: `TransactionLinkOut`, `LinksUpdateRequest`, `AvailableBuyOut`, `AvailableBuysResponse`, `AssetPnLSummary`
- [x] Frontend tipos: `Transaction` extendido, `TransactionLink`, `AvailableBuy`, `AvailableBuysResponse`, `AssetPnLSummary`
- [x] Frontend API: `updateSellLinks`, `getAvailableBuys`, `getSummaryByAsset`
- [x] Frontend hooks: `updateLinks` en `useTransactions`, nuevo `useAssetSummary`
- [x] Frontend componentes: `LinksModal`, `AssetSummary`, `TransactionList` actualizado, `Dashboard` actualizado
- [x] Tests backend: `test_pnl.py` (7 casos), `test_transaction_service.py` (+12 tests), `test_api.py` (+4 e2e) — 54 passed
- [x] Tests frontend: `LinksModal.test.tsx`, `TransactionList.test.tsx`, `AssetSummary.test.tsx` — 20 passed
- [x] Lint/typecheck backend: ruff + mypy — clean
- [x] Lint/typecheck frontend: eslint + tsc — clean
- [x] Smoke test local: cálculo verificado manualmente con ICFI (−34,50 €, −11,18%) ✓
- [x] CI checks: todos verdes en PR #21
- [x] Fixes runtime: `row.TransactionModel.quantity` en `list_open_buys`, fee restado en venta en `TransactionList.tsx`
