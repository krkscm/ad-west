# 01 - System Overview

## System Type

ADWest is a full-stack TypeScript application with:
- NestJS API backend (`ad-west-api`)
- React + Vite frontend (`ad-west-web`)
- PostgreSQL persistence (with optional in-memory fallbacks in selected runtime areas)

## Primary User Domains

1. Admin workspace
2. Member workspace
3. Public gateway (unauthenticated)

## High-Level Functional Domains

- Organization and governance data management
- Sreni/location/calendar/attendance workflows
- Role/permission/approval workflow operations
- Helpdesk and jobs public intake
- Member services operations
- Google OAuth and Gmail integration

## Runtime Boundaries

- Frontend app uses `/api/v1` API prefix for backend communication.
- API exposes authenticated and public endpoints.
- Frontend public routes (`/helpdesk`, `/jobs`, `/events/:id/register`) are rendered without app login.

## Top-Level Context

- Browser clients interact with the React app.
- React app calls NestJS REST APIs.
- NestJS modules orchestrate business workflows and persist state in PostgreSQL.
- Selected features support in-memory mode when DB persistence is disabled.
