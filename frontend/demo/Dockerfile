FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json ./

RUN pnpm install 2>/dev/null || pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host"]
