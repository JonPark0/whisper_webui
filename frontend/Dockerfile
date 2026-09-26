# Multi-stage build. docker-compose picks the stage with FRONTEND_MODE:
#   dev  - Vite dev server with hot reload (source bind-mounted by compose)
#   prod - static build served by nginx, which also proxies /api to the backend
# Building without --target yields prod (the last stage), so CI and the image
# publish workflow test and ship the production image.

FROM node:24-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install


FROM deps AS dev

# Copy application code
COPY . .

# Expose port
EXPOSE 5173

# Run development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


FROM deps AS build

# Baked into the bundle at build time. Empty = call /api on the page's own
# origin (nginx proxies it), same as the dev server.
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

COPY . .
RUN npm run build


FROM nginx:1.27-alpine AS prod

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Same port as the dev server, so URLs and compose port mappings don't change
EXPOSE 5173
