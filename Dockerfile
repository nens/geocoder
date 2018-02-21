FROM ubuntu:16.04

RUN apt-get update
RUN apt-get -y install software-properties-common python-software-properties
RUN add-apt-repository ppa:ubuntu-toolchain-r/test
RUN apt-get update
RUN apt-get -y install curl autoconf automake libtool pkg-config build-essential nodejs npm git libspatialite-dev sqlite3 gcc-5 g++-5

RUN mkdir /code
WORKDIR /code

RUN git clone https://github.com/openvenues/libpostal
RUN mkdir /code/postaldata
RUN cd /code/libpostal && ./bootstrap.sh && ./configure --datadir=/code/postaldata
RUN cd /code/libpostal && make && make install && ldconfig


COPY server.js /code
COPY package.json /code

RUN npm install -g node-gyp
RUN npm install

CMD ["nodejs", "server.js"]

