FROM node:22-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

RUN npm install -g corepack@latest
RUN corepack enable pnpm

COPY . .

ENV CI=true
RUN pnpm install --force --frozen-lockfile

WORKDIR /app/apps/web

# The tuyau registry (@generated/registry) is only written when routes are scanned,
# which `ace build` never does; `ace codegen` boots the app for that, so it needs a
# throwaway env that must not leak into the image.
RUN cp .env.example .env \
  && APP_KEY=build-only-placeholder-key-0000000 node ace codegen \
  && rm .env

RUN node ace build --ignore-ts-errors

WORKDIR /app/apps/web/build

EXPOSE 3333

CMD ["node", "bin/server.js"]
