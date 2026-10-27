import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // R3F scene objects are mutated every frame by design.
      "react-hooks/immutability": "off",
    },
  },
  { ignores: [".next/**", "node_modules/**", "scripts/**", "next-env.d.ts"] },
];

export default config;
