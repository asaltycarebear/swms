import { defineConfig } from "vite";

export default defineConfig({
    root: "src",
    
    preview: {
        allowedHosts: ["swms-0iyt.onrender.com"],
    },
    
    build: {
        outDir: "../dist",
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