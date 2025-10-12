const config = {
  plugins: process.env.VITEST === "true" ? [] : ["@tailwindcss/postcss"],
};

export default config;
