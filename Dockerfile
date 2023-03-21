FROM node:lts-alpine
ENV NPM_CONFIG_LOGLEVEL info

RUN mkdir -p /botty
WORKDIR /botty

ADD ./ /botty
RUN npm install

CMD NODE_ENV=production node --trace-warnings index.js