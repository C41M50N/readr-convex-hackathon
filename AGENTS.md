# Agent Guidelines for readr-convex-hackathon

## Commands
- **Add dependency**: `pnpm add <package>`
- **Add dev dependency**: `pnpm add -D <package>`
- **Remove dependency**: `pnpm remove <package>`
- **Build**: `vite build`
- **Dev server**: `vite dev --port 3000`
- **Test all**: `vitest run`
- **Test single**: `vitest run <test-file>` (use vitest pattern matching)
- **Convex dashboard**: `convex:dashboard`
- **Convex deploy**: `convex:deploy`

## Code Style
- **TypeScript**: Strict mode enabled, target ES2022
- **Imports**: Single quotes, path aliases `@/*` for `./src/*`
- **Components**: PascalCase, functional with hooks
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Formatting**: Prettier (installed), no semicolons
- **UI**: Shadcn/ui with Tailwind CSS, zinc base color, CSS variables
- **Icons**: Lucide React

## Convex Backend
- Use `v` validator builder for schema definitions
- System fields `_id` and `_creationTime` are automatic
- Index on frequently queried fields
- Follow schema patterns from existing tables

## Shadcn Components
- Install with: `pnpx shadcn@latest add <component>`
- Use `cn()` utility for class merging
- Follow existing variant patterns

## Error Handling
- Use TypeScript strict mode for type safety
- Validate inputs with Convex validators
- Handle optional fields appropriately