FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
EXPOSE 80
RUN npm install pm2 -g
COPY package.json package-lock.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "start"]