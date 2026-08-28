# Real-Time Chat Application

A production-grade, real-time enterprise chat application built with a modern monorepo architecture.

## Monorepo Architecture

This project is organized as a monorepo containing three primary packages:

- `client/` - Frontend desktop client (Electron + React + Vite + Tailwind CSS)
- `server/` - Backend API and WebSocket service (Node.js + Express + PostgreSQL + Drizzle ORM)
- `shared/` - Shared TypeScript interfaces, types, and Zod validation schemas

## Tech Stack

- **Frontend:** Electron, React, Vite, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, WebSockets
- **Database & ORM:** PostgreSQL, Drizzle ORM
- **Tooling:** ESLint, Prettier, Husky, lint-staged

## Getting Started

### Prerequisites

- Node.js (v20+ recommended)
- npm (v10+ recommended)

### Installation

Install all workspace dependencies from the root directory:

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` in the root directory (and package directories as needed):

```bash
cp .env.example .env
```

Set appropriate environment variables for your local PostgreSQL database, server port, and JWT secret.

## Available Scripts

From the root directory, you can run:

- `npm run lint` - Runs ESLint across all packages to ensure strict code quality.
- `npm run format` - Runs Prettier to format code across the entire codebase.
- `npm run format:check` - Checks if all files conform to Prettier formatting guidelines.

## Development Guidelines

- **Code Quality & Formatting:** Pre-commit hooks via Husky and lint-staged automatically enforce ESLint checks (`eslint --fix`) and Prettier formatting (`prettier --write`) on staged files.
- **Strict TypeScript:** Type safety and strict rules are enforced across all workspaces. Unused variables are treated as errors (`@typescript-eslint/no-unused-vars`).
- **Production Readiness:** SQLite is not used for this application; all database configurations and migrations target PostgreSQL using Drizzle ORM.
