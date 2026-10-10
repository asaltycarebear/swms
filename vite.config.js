
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    root: resolve(__dirname, "src"),

    build: {
        outDir: resolve(__dirname, "dist"),
        emptyOutDir: true,
        
        rollupOptions: {
            input: {
                confirm: "src/confirm.html",
                contact: "src/contact.html",
                main: "src/index.html",
                items: "src/items.html",
                map: "src/map.html",
                move: "src/move.html",
                pickface: "src/pickface.html",
                pull: "src/pull.html",
                receive: "src/receive.html",
                summary: "src/summary.html",
            },
        },
    },
});