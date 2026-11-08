# Dev HMR + sim state (§0.1)

Vite HMR is enabled via `npm run dev`. Sim singletons (`sim`, `rng`, GameLoop) are module-scoped; full reload resets them.

Safe HMR preserves:

- React HUD / menu components
- Flag toggles read each frame from `getFlags()`

Unsafe without full reload:

- Changing `GameLoop` step order or RNG stream names
- Manifest graph rebuilds mid-mission (use `hotReloadManifest` instead)

Accept target: component HMR < 300ms; sim-affecting edits may require soft reload.
