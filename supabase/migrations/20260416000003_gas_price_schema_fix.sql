-- Fix gas_city_prices: relax NOT NULL constraints that were always failing
-- since OCR can't reliably extract city, price_per_liter, or price_per_gallon.
-- Every insert since table creation has been silently failing due to these constraints.
-- Also adds amount_usd (total receipt amount) and a query index.

alter table gas_city_prices
  alter column city drop not null,
  alter column price_per_liter drop not null,
  alter column price_per_gallon_usd drop not null;

alter table gas_city_prices
  add column if not exists amount_usd numeric;

create index if not exists gas_city_prices_country_ts_idx
  on gas_city_prices (country, ts desc);
