# Database setup note

This demo build does not require a generated EF migration to add the inventory module.

On startup the API:

1. Calls `EnsureCreatedAsync()` for a fresh database.
2. Runs idempotent `CREATE TABLE IF NOT EXISTS` statements for `inventory_items` and `stock_transactions`.

This allows the inventory module to be added to the existing SAMAYA database used during development.

For a production deployment, replace this startup schema bootstrap with versioned EF Core migrations.
