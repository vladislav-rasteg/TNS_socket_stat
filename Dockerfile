FROM node:14.17.0-alpine
WORKDIR /
ADD package*.json ./
RUN npm install
COPY . .
CMD [ "node", "index.js"]