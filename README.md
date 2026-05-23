# ad-west

This repository defines a simple **group of repositories** for managing multiple projects in multiple languages.

## Suggested repository group

Create one GitHub organization (or team namespace) and keep each project in its own repository:

- `ad-west-web` (React)
- `ad-west-api` (Next.js)
- `ad-west-services` (Go)
- `ad-west-data` (SQL + Python)
- `ad-west-infra` (Terraform/YAML)

## Why this layout

- Keeps language-specific tooling isolated per repository
- Makes CI/CD and dependency management easier
- Lets teams release each project independently
