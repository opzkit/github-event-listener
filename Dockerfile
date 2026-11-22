# Use Bun's official image
FROM oven/bun:1@sha256:3aa040e5445efa09d75bb428a64ba50db13e2b3ac9b6b0c7f145615f62b2ee18 AS base
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
