# Build image: toolchain lives here, never on the host. Source is COPYed in (not bind-mounted), so
# node_modules/build scratch stay in the image and never touch the host checkout. Only ./dist is shared out.
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Produce the site, then publish it into the bind-mounted /out (host apps/mosni-chrome/dist).
# Done at RUN time (not build time) so the host mount is populated when the one-shot container runs.
CMD ["sh", "-c", "npm run build && rm -rf /out/* && cp -a dist/. /out/"]
