# Lightweight Node image for production
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies (cache package.json)
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --production

# Bundle app source
COPY . .

# Use environment variable PORT if provided by the host; default 3000
ENV PORT 3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
