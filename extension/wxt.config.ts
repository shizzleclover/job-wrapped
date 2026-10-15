import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

const LOCAL_API = "http://localhost:3000/api/wrapped";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  // A function so it runs after WXT loads .env files: `dev` uses .env.development, `build`/`zip` use .env.production.
  manifest: () => {
    const api = new URL(process.env.WXT_API_URL || LOCAL_API);
    return {
      name: "Job Hunt Wrapped",
      description: "A Spotify Wrapped-style story of your job hunt, built from your Gmail.",
      permissions: ["storage"],
      host_permissions: [`${api.origin}/*`],
    };
  },
  // WXT defaults to port 3000, which collides with the API server in ../web.
  dev: { server: { port: 3100, origin: "http://localhost:3100" } },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
