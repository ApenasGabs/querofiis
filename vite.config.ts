import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    open: true,
    proxy: {
      // Dev proxy to bypass CORS for B3 list endpoint
      // Requests to '/b3-funds' will be forwarded to the B3 host and the path rewritten
      "/b3-funds": {
        target: "https://sistemaswebb3-listados.b3.com.br",
        changeOrigin: true,
        secure: true,
        rewrite: (path) =>
          path.replace(
            /^\/b3-funds/,
            "/fundsListedProxy/Search/GetListFunds/eyJsYW5ndWFnZSI6InB0LWJyIiwidHlwZUZ1bmQiOiJGSUFHUk8iLCJwYWdlTnVtYmVyIjoxLCJwYWdlU2l6ZSI6MTIwLCJrZXl3b3JkIjoiIn0=",
          ),
      },
      // Proxy API requests to local server
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
