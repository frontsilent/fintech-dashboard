# ESLint setup

The project uses ESLint flat config with Angular ESLint, typescript-eslint, and focused plugins for imports, JSDoc, RxJS, and general TypeScript/JavaScript quality rules.

## Install dependencies

Run from the project root:

```powershell
npm install
```

This updates `package-lock.json` using the dependencies declared in `package.json`.

## Commands

```powershell
npm run lint
npm run lint:fix
```

`lint:fix` applies only safe automatic fixes. Review its diff before committing.

## Scope and deliberate exclusions

- Rust source under `wasm/` is not linted by ESLint; use `cargo fmt --check` and `cargo clippy` for Rust.
- Angular TypeScript and HTML templates are linted, including inline component templates.
- Component and directive selectors use the standard `app` prefix. Explicit view encapsulation is configured for the current components.


**RxJS plugin compatibility:** the original `eslint-plugin-rxjs@5.0.3` only declares ESLint 8 as a peer dependency. This setup uses `eslint-plugin-rxjs-updated` to retain the RxJS rule set with ESLint 9.
