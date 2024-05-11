FROM node:21.7.3-alpine3.19
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENTRYPOINT ["npm", "run", "start"]
EXPOSE 3001