---
name: git-conventions
description: Git Conventions: Guidelines for commit messages, branch naming, and version control practices
---

# Git Commit and Version Control Conventions

## Commit Message Format

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages. This format enables automatic changelog generation, version bumping, and better collaboration.

### Structure

```text
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Type

The type must be one of the following:

- `feat` - A new feature for the user
- `fix` - A bug fix
- `docs` - Documentation only changes
- `style` - Changes that don't affect the meaning of code (white-space, formatting, etc.)
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `perf` - Code change that improves performance
- `test` - Adding missing tests or correcting existing tests
- `build` - Changes that affect the build system or external dependencies
- `ci` - Changes to CI configuration files and scripts
- `chore` - Other changes that don't modify src or test files
- `revert` - Reverts a previous commit

### Scope

The scope should be the name of the package or area affected.

### Subject

The subject contains a succinct description of the change:

- Use the imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize the first letter
- No period (.) at the end
- Keep it under 72 characters

### Body (Optional)

The body should include the motivation for the change and contrast this with previous behavior.

- Use the imperative, present tense
- Wrap at 72 characters
- Separate from subject with a blank line

### Footer (Optional)

The footer should contain information about Breaking Changes and reference issues that this commit closes.

**Breaking Changes** should start with `BREAKING CHANGE:` followed by a description.

**Closes** references should be on a separate line and use the format: `Closes #123, #456`

## Examples

### Feature Addition

```text
feat(desktop): add mod conflict detection

Implement visual indicators for mod conflicts and add conflict
resolution suggestions to the UI.

Closes #142
```

### Bug Fix

```text
fix(api): handle edge case in pagination

Fix incorrect offset calculation when page size exceeds total items.
This prevents API errors when requesting pages beyond available data.
```

### Breaking Change

```text
feat(api)!: remove deprecated v1 endpoints

BREAKING CHANGE: The /v1/mods endpoint has been removed. All clients
must migrate to the /v2/mods endpoint which provides better filtering
and pagination support.

Migration guide available at docs/migration/v1-to-v2.md
```

### Dependency Update

```text
chore(deps): update react-dom to v2.1.0
```

### Documentation

```text
docs(readme): add installation instructions for Linux
```

### Multiple Scopes

```text
refactor(desktop,shared): extract mod validation logic to shared package
```

### Simple Fix

```text
fix(www): correct button alignment on mobile
```

## Branch Naming Conventions

### Branch Format

```text
<type>-<ticket-or-shortdescription>
```

### Types

- `feat-` - New features
- `fix-` - Bug fixes
- `hotfix-` - Critical fixes that need immediate deployment
- `refactor-` - Code refactoring
- `chore-` - Maintenance tasks
- `docs-` - Documentation updates

### Branch Naming Rules

- Use kebab-case for descriptions
- Include ticket/issue numbers when applicable
- Keep names descriptive but concise
- Use lowercase letters

### Branch Examples

```bash
# With ticket number
feat-KR-123-add-mod-collections
fix-KR-456-fix-download-crash
hotfix-KR-789-security-patch

# Without ticket number
feat-dark-mode-toggle
fix-pagination-edge-case
refactor-extract-validation-logic
chore-update-dependencies
docs-add-api-examples
```

## Gathering Git Context

Run this single command to gather all necessary information:

```bash
echo "=== BRANCH ===" && git rev-parse --abbrev-ref HEAD && echo "=== STAGED FILES ===" && git diff --staged --stat && echo "=== STAGED CHANGES ===" && git diff --staged
```

This provides:

- Current branch name
- Staged files summary → determine scope (which workspace/package)
- Actual changes → determine commit type and write description

### Current branch (agents)

When running `/commit` or creating commits for the user, use the **checked-out
branch** as-is. Do not create, switch to, or require a feature branch only
because the current branch is `main` or `master`, unless the user explicitly
asks for a different branch.

## References

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
