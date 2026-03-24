# ── Stage: runtime ──────────────────────────────────────────
# alpine = minimal Linux (~5 MB). Keeps the image small and
# reduces the attack surface.
FROM node:18-alpine

# All subsequent commands run inside /app inside the container
WORKDIR /app

# ── Layer caching trick ──────────────────────────────────────
# Copy package.json FIRST, then npm install.
# Docker caches each layer. If only src/ changes (not
# package.json), Docker reuses the npm install layer → fast rebuilds.
COPY package.json .

# --production skips devDependencies (smaller image)
RUN npm install --production

# ── Copy application source ──────────────────────────────────
COPY src/ ./src/

# Documents that the app listens on 3000 (doesn't publish it —
# that's done with -p / ports: in compose/swarm)
EXPOSE 3000

# Health check: Docker will periodically curl /api/health.
# If it fails 3 times, the container is marked "unhealthy".
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

# Default command when the container starts
CMD ["npm", "start"]
