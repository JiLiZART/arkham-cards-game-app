# Instructions for AI Agents

This file provides guidance for AI coding agents (Claude Code, Cursor Agent, Copilot Workspace, Windsurf, etc.) operating on this codebase.

## Project Context

!Describe project

Key directories:

!Describe key directories

## Rules for AI Agents

### DO

- Help the human contributor understand code and debug issues
- Suggest improvements that follow existing patterns in the codebase
- Write tests for new and existing functionality
- Use oxfmt for formatting and oxlint for linting (not ESLint/Prettier/Biome)
- Follow the existing commit convention: `type(scope): description` (see [.agents/skills/git-conventions/SKILL.md](.agents/skills/git-conventions/SKILL.md)); commit on the current branch unless the user asks to use a feature branch
- When creating a requested branch, use a descriptive prefix such as `feature/`, `bugfix/`, or `chore/`; never use `codex/`.
- Respect TypeScript strict mode — never use `any` or `unknown`, use proper types (see 031-never-use-any.mdc)
- Use `react-i18next` for any user-facing strings (check `apps/desktop/src/locales/`)
- Use React Query mutations for async operations, not manual useState loading (see 030-coding-style.mdc)
- When debugging or verifying desktop UI, IPC, or Tauri commands, use **tauri-mcp-server** (see [056-tauri-mcp-debugging.mdc](.cursor/rules/056-tauri-mcp-debugging.mdc)); ask the user to start the dev server — do not start it yourself
- When a plan, design doc, or PR description covers a real call-flow change that a tree would help reviewers understand, optionally include a `npx calldiff@latest diff` (see [095-calldiff.mdc](.cursor/rules/095-calldiff.mdc)). Do not add call-stack diffs to routine chat summaries.

### DON'T

- Generate entire pull requests autonomously
- Open issues based on static analysis without human verification
- Refactor code without prior discussion with maintainers
- Add new dependencies without justification
- Introduce patterns that don't already exist in the codebase without discussion
- Submit code that the human operator cannot explain or modify

### Code Quality Checklist

Before the human submits your work, ensure:

- [ ] `pnpm lint:fix` and `pnpm format:fix` have been run
- [ ] `pnpm typecheck` passes
- [ ] Changes are tested (manually at minimum, automated tests preferred)
- [ ] PR description explains _what_ and _why_, not just _how_

## Tech Stack Quick Reference

!TBD

## Commands

!TBD

## App architecture

!TBD


## Agent workflows

- Skills live in `.agents/skills`. `pnpm install` links them into `.claude/skills`; rerun `pnpm skills:link` after changing the skill set. Existing directories are preserved.
- For previous decisions or debugging history, use [transcript-search](.agents/skills/transcript-search/SKILL.md), scope results to this checkout, and verify them against current code. Cursor and Claude repository MCP configs register transcripts; use an existing connection when available.
- On request, use [simplify](.agents/skills/simplify/SKILL.md) for scoped review and cleanup or [handoff](.agents/skills/handoff/SKILL.md) to resume elsewhere. For instruction edits, read [writing-for-agents](.agents/skills/writing-for-agents/SKILL.md).
- Anti-slop rules initially report warnings so existing code can be inventoried without a bulk refactor. Resolve findings in new or modified code; promote rules only after reviewing their existing violations.
- Testing and import guidance: `057-testing.mdc` and `032-import-rules.mdc`. Preserve each package's existing Bun test conventions.
