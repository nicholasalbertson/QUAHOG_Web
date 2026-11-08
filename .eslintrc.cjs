/** Minimal ESLint scaffold for §0.1 — expand when eslint deps are installed. */
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  ignorePatterns: ["dist", "node_modules"],
  overrides: [
    {
      files: ["src/sim/**/*.{ts,tsx}"],
      rules: {
        // Placeholder until @typescript-eslint is a dep:
        // no-floating-promises, no-explicit-any, import/order
      },
    },
  ],
};
