import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  define: {
    // Ensure VITE_* variables are available at build time
    __DEV__: JSON.stringify(true),
  },
});
