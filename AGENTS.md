# Repository Guidelines

## Project Structure & Module Organization

- `app.vue` is the Nuxt root shell.
- `pages/` holds route-based UI (e.g., `pages/index.vue`).
- `server/api/` contains Nitro API routes named by HTTP verb (e.g., `env.get.ts`, `projects/[id].put.ts`).
- `server/utils/` contains shared server utilities (SSH, filesystem, validation, storage).
- `shared/` holds cross-cutting types and helpers (currently `shared/types.ts`).
- `assets/` is for static assets.
- `data/` stores local state such as `projects.json`, plus ignored runtime data in `data/cache/`, `data/workspace/`, and `data/audit.log`.
- `nuxt.config.ts` defines Nuxt/Nitro configuration.

## Build, Test, and Development Commands

- `pnpm install` installs dependencies.
- `pnpm dev` starts the Nuxt dev server with hot reload.
- `pnpm build` produces a production build.
- `pnpm preview` serves the built app locally for verification.

There are no automated test scripts yet; add them to `package.json` when introducing a test framework.

## Coding Style & Naming Conventions

- TypeScript + Vue SFCs with 2-space indentation.
- Keep existing semicolon usage consistent within each file.
- Use `camelCase` for variables/functions, `PascalCase` for types/components.
- Prefer kebab-case filenames; keep Nitro route files in the `route.method.ts` pattern.
- Place shared types in `shared/types.ts` to avoid circular imports.

## Testing Guidelines

- No test framework is configured. If you add tests, also add a script (e.g., `pnpm test`) and document where tests live (such as `tests/`).
- For manual verification, run `pnpm dev` and exercise key flows in the UI and API routes.

## Commit & Pull Request Guidelines

- Commit messages follow a short `type: description` format (e.g., `feat: ...`, `chore: ...`, `init: ...`). Chinese descriptions are acceptable.
- PRs should include: a concise summary, testing notes (commands or manual steps), and screenshots for UI changes. Link related issues if available.

## Security & Configuration Tips

- SSH connectivity assumes local SSH aliases; keep secrets out of `data/projects.json` and `.env` files.
- Use `.env.example` to document required environment variables without committing secrets.
