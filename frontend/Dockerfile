FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy the rest of the source code
COPY . .

# Build the web version of the Expo app using modern Expo CLI
RUN npx expo export --platform web

# ---------- Runtime stage ----------
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose the default Nginx port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
