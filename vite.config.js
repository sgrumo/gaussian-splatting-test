import { defineConfig } from "vite";

export default defineConfig({
    server: {
        allowedHosts: ['quinckdev.com', '81d8-79-61-135-187.ngrok-free.app'],
        headers: {
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Opener-Policy': 'same-origin',
        },
    }
})