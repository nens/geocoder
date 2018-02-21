FROM ubuntu:16.04

RUN apt-get update
RUN apt-get -y install curl autoconf automake libtool pkg-config build-essential nodejs npm git libspatialite-dev sqlite3

RUN mkdir /code
WORKDIR /code

RUN git clone https://github.com/openvenues/libpostal
RUN mkdir /code/postaldata
RUN cd /code/libpostal && ./bootstrap.sh && ./configure --datadir=/code/postaldata
RUN cd /code/libpostal && make && make install && ldconfig

RUN npm install -g node-gyp yarn
RUN yarn install

CMD ['node', 'server.js']

