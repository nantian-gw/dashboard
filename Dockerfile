ARG NODE_IMAGE=docker.io/library/node:22-alpine

FROM ${NODE_IMAGE} AS builder
WORKDIR /app
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm install --ignore-scripts
COPY dashboard/src/ ./src/
COPY dashboard/public/ ./public/
COPY dashboard/types/ ./types/
COPY dashboard/next.config.ts dashboard/tsconfig.json dashboard/postcss.config.mjs dashboard/components.json dashboard/tailwind.config.ts dashboard/eslint.config.mjs ./
RUN npm run build

FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV AUTH_TRUST_HOST=true
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/server ./.next/server
ENV CONTROLPLANE_ADMIN_URL=http://localhost:18081
ENV DATAPLANE_ADMIN_URL=http://localhost:19080

USER node
EXPOSE 3000
CMD ["node", "server.js"]
