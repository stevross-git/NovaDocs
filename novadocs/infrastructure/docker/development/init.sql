-- File: novadocs/infrastructure/docker/development/init.sql
-- Initialize database with required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create keycloak database
CREATE DATABASE keycloak;