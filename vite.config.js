import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    root: resolve(__dirname, "src"),

    // Forward API requests to Express during local development.
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true,
            },
        },
    },

    preview: {
        allowedHosts: ["swms-0iyt.onrender.com"],
    },

    build: {
        outDir: resolve(__dirname, "dist"),
        emptyOutDir: true,

        rollupOptions: {
            input: {
                confirm: resolve(__dirname, "src/confirm.html"),
                contact: resolve(__dirname, "src/contact.html"),
                main: resolve(__dirname, "src/index.html"),
                items: resolve(__dirname, "src/items.html"),
                map: resolve(__dirname, "src/map.html"),
                move: resolve(__dirname, "src/move.html"),
                pickface: resolve(__dirname, "src/pickface.html"),
                pull: resolve(__dirname, "src/pull.html"),
                receive: resolve(__dirname, "src/receive.html"),
                summary: resolve(__dirname, "src/summary.html"),
            },
        },
    },
});