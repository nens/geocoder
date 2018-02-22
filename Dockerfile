FROM ubuntu:16.04

RUN apt-get update
RUN apt-get -y install curl autoconf automake libtool pkg-config build-essential nodejs npm git libspatialite-dev sqlite3 nodejs-legacy

RUN mkdir /code
WORKDIR /code

RUN git clone https://github.com/openvenues/libpostal
RUN mkdir /code/postaldata
RUN cd /code/libpostal && ./bootstrap.sh && ./configure --datadir=/code/postaldata
RUN cd /code/libpostal && make && make install && ldconfig


COPY server.js /code
COPY package.json /code

RUN npm install -g node-gyp n
RUN n 9.5.0
RUN npm install

CMD ["node", "server.js"]

