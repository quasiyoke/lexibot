FROM node:9.5
MAINTAINER Petr Ermishkin <quasiyoke@gmail.com>

COPY src/ /src/
COPY .babelrc .eslintrc package.json package-lock.json webpack.config.js webpack.parts.js /

RUN npm i && \
  npm run build
CMD ["node /dist/app.js"]
