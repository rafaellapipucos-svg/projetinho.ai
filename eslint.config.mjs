import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";
import prettier from "eslint-config-prettier";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      "src/generated/**",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "domain", pattern: "src/domain/**" },
        { type: "server", pattern: "src/server/**" },
        { type: "app", pattern: "src/app/**" },
        { type: "components", pattern: "src/components/**" },
        { type: "lib", pattern: "src/lib/**" },
        { type: "messages", pattern: "src/messages/**" },
        { type: "generated", pattern: "src/generated/**" },
      ],
    },
    rules: {
      // Fronteiras de camada (docs/ARQUITETURA.md §6): import ilegal é erro de CI.
      // Módulos server-only são adicionalmente protegidos pelo pacote `server-only`,
      // que impede client components de importá-los mesmo dentro de src/app.
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: { type: "domain" }, allow: { to: { type: "domain" } } },
            {
              from: { type: "server" },
              allow: {
                to: {
                  type: ["server", "domain", "lib", "messages", "generated"],
                },
              },
            },
            {
              from: { type: "generated" },
              allow: { to: { type: "generated" } },
            },
            {
              from: { type: "lib" },
              allow: { to: { type: ["lib", "domain", "messages"] } },
            },
            {
              from: { type: "components" },
              allow: {
                to: { type: ["components", "lib", "domain", "messages"] },
              },
            },
            { from: { type: "messages" }, allow: { to: { type: "messages" } } },
            {
              from: { type: "app" },
              allow: {
                to: {
                  type: [
                    "app",
                    "components",
                    "lib",
                    "domain",
                    "messages",
                    "server",
                  ],
                },
              },
            },
          ],
        },
      ],
    },
  },
  prettier,
];

export default eslintConfig;
