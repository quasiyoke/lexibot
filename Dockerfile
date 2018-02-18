FROM node:9.5
MAINTAINER Petr Ermishkin <quasiyoke@gmail.com>

COPY src/ /wordsgurubot/src/
COPY .babelrc .eslintrc docker-entrypoint.sh package.json package-lock.json webpack.config.js webpack.parts.js /wordsgurubot/

RUN cd /wordsgurubot/ && \
  npm i && \
  npm run build
CMD ["/wordsgurubot/docker-entrypoint.sh"]
