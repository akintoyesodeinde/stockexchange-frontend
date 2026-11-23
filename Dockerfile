FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ARG VITE_OIDC_AUTHORITY=http://localhost:8180/realms/stockexchange
ARG VITE_OIDC_CLIENT_ID=stockexchange-web
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_OIDC_AUTHORITY=${VITE_OIDC_AUTHORITY}
ENV VITE_OIDC_CLIENT_ID=${VITE_OIDC_CLIENT_ID}
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --prefer-offline --fetch-retries=3 || npm install --no-audit --no-fund --fetch-retries=3
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
