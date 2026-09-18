# Stage 1: Build Angular application
FROM node:22-alpine AS build
WORKDIR /app

COPY frontend/vincula-up-web/package*.json ./
RUN npm install

COPY frontend/vincula-up-web/ ./
RUN npm run build -- --configuration production

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine
COPY --from=build /app/dist/vincula-up-web/browser /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/certs /etc/nginx/certs

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]

