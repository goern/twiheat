FROM node:0.10-slim

MAINTAINER goern@b4mad.net

LABEL Version="0.1.0"

WORKDIR /app

EXPOSE 8088

# install dependencies
ADD package.json /app/
RUN npm install

# install app
ADD server.js /app/

ENTRYPOINT ["node", "server.js"]
