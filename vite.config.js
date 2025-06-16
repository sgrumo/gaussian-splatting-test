import { defineConfig } from "vite";

export default defineConfig({
    server: {
        allowedHosts: ['quinckdev.com'],
        headers: {
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
        },
    }
})