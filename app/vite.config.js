import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/css/app.css", "resources/js/app.tsx"],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    charts: ["recharts"],
                    ui: ["@radix-ui/react-dialog", "@radix-ui/react-slot"],
                    react: ["react", "react-dom", "@inertiajs/react"],
                },
            },
        },
    },
});
