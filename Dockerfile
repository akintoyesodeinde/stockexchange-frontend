FROM node:20-alpine AS builder
WORKDIR /app

# Only explicitly public runtime configuration is passed at Vite build time.
# Relative paths default to single-origin reverse-proxy routing on AWS EC2.
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_OIDC_AUTHORITY=/auth/realms/stockexchange
ARG VITE_OIDC_CLIENT_ID=stockexchange-web
ARG VITE_SANDBOX_MODE=true
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_OIDC_AUTHORITY=${VITE_OIDC_AUTHORITY}
ENV VITE_OIDC_CLIENT_ID=${VITE_OIDC_CLIENT_ID}
ENV VITE_SANDBOX_MODE=${VITE_SANDBOX_MODE}
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --prefer-offline --fetch-retries=3
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
USER 101
COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=101:101 --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/healthz > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
