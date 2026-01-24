/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: [
            "@google-cloud/tasks",
            "firebase-admin",
        ],
    },
};

module.exports = nextConfig;
