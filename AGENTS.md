<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project workflow

- **Never commit directly to `main`.** Before changing anything, create a branch from `main`.
- **Conventional branches:** `<type>/<short-kebab-description>`, where `<type>` is one of `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`, `perf`, `style`. Example: `fix/remove-anime-from-list`.
- **Conventional commits:** `<type>(optional scope): <description>` in the imperative mood, with a lowercase description. Mark breaking changes with `!` after the type or with a `BREAKING CHANGE:` footer.
- **Semantic versioning:** the version in `package.json` follows SemVer. `fix` bumps PATCH, `feat` bumps MINOR, and a breaking change bumps MAJOR. Bump the version in the same branch as the change it ships.
