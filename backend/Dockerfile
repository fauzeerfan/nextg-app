FROM node:22-alpine

# FIX: Install OpenSSL (Wajib untuk Prisma di Alpine Linux)
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

# Config network npm agar stabil
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-audit

COPY . .

# Generate Prisma
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "start:dev"]