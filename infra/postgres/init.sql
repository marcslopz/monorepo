-- Create databases for each app
-- Add new CREATE DATABASE lines here when adding new apps
SELECT 'CREATE DATABASE demo_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'demo_db')\gexec

-- Test databases
SELECT 'CREATE DATABASE demo_db_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'demo_db_test')\gexec
