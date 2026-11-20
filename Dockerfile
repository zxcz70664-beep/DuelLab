FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY public ./public
COPY server ./server
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["npm","start"]
