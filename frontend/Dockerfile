FROM node:22-alpine

# Optional: Tambah dependencies sistem umum
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./

RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-audit

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]