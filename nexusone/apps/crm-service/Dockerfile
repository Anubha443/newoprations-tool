FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json tsconfig.json nest-cli.json ./
RUN pnpm install
COPY src ./src
RUN pnpm build
EXPOSE 8003
CMD ["pnpm", "start"]
