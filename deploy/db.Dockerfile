# Build context is the repository root.
FROM postgres:17

COPY db/init.sql /docker-entrypoint-initdb.d/010-init.sql

EXPOSE 5432
