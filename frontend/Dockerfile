# Frontend multi-stage Dockerfile: build the Vite React app and serve with nginx

# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# copy package files and install
COPY package.json package-lock.json* ./
RUN npm ci --silent

# copy source and build
COPY . .
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_FIREBASE_API_KEY=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
RUN npm run build

# Production stage: serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# remove default nginx config and add a simple config suitable for SPA
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
