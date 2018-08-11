FROM node:10
RUN apt-get update
RUN apt-get install apt-transport-https -y
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update && apt-get install yarn -y
RUN apt-get install xvfb -y
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
  echo "deb http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list && \
  apt-get update -y && apt-get install -y --no-install-recommends google-chrome-stable libgconf-2-4 && \
  # clean
  apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /project
COPY ./package.json ./package.json
COPY ./yarn.lock ./yarn.lock
RUN yarn install
COPY ./ ./
RUN chmod 777 ./docker-entrypoint.sh
ENTRYPOINT [ "./docker-entrypoint.sh" ]