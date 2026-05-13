# Use Bun's official image
FROM oven/bun:1@sha256:e10577f0db68676a7024391c6e5cb4b879ebd17188ab750cf10024a6d700e5c4 AS base
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
