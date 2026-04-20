# Use Bun's official image
FROM oven/bun:1@sha256:87416c977a612a204eb54ab9f3927023c2a3c971f4f345a01da08ea6262ae30e AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source code
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .

# Production image
FROM base AS release
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./

# Run as non-root user (bun user has UID 1000)
USER 1000
EXPOSE 8080

ENTRYPOINT ["bun", "run", "src/index.ts"]
