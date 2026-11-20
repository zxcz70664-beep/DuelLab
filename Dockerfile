FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache python3 ca-certificates
COPY package.json ./
COPY public ./public
COPY server ./server
COPY tools/import_card_catalog.py ./tools/import_card_catalog.py
RUN python3 ./tools/import_card_catalog.py
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["npm","start"]
