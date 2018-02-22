GEOCODER
========

A super simple [geocoder and reverse geocoder for the Netherlands](https://geocoder.sandbox.lizard.net/).

Based on [BAG extract CSV](https://data.nlextract.nl/bag/csv/).

### Why use this? 

- Because it's easier to install than most [full-blown](https://wiki.openstreetmap.org/wiki/Nominatim) [geocoding](https://github.com/pelias/) [solutions](https://github.com/komoot/photon).

- Because there are no usage limits.

- It's free and MIT licensed.

- It's quite fast.


### Why not use this?

- It's reeeally simple. Probably too simple for your use case. For example, typing only a city name doesn't parse, only full addresses do.

- It works for the Netherlands only.

- No support.

- Not battle-tested.


### Examples:


[Adres + woonplaats](https://geocoder.sandbox.lizard.net/geocode?q=vinkenburgstraat%202,utrecht):

`https://geocoder.sandbox.lizard.net/geocode?q=vinkenburgstraat%202,utrecht`

[Lengte + breedtegraad (EPSG:4326)](https://geocoder.sandbox.lizard.net/reverse?lat=5.11742319815075&lon=52.09201977197619):

`https://geocoder.sandbox.lizard.net/reverse?lat=5.11742319815075&lon=52.09201977197619`

[Postcode + huisnummer](https://geocoder.sandbox.lizard.net/postcode?postcode=3512AB&huisnummer=2):

`https://geocoder.sandbox.lizard.net/postcode?postcode=3512AB&huisnummer=2`



Installation (without Docker)
-----------------------------

On Ubuntu/Debian:
```bash
$ sudo apt-get install curl autoconf automake libtool pkg-config build-essential nodejs npm git libspatialite-dev sqlite3 nodejs-legacy
```

On MacOS:
```bash
$ brew install curl autoconf automake libtool pkg-config
```

Install libpostal (C lib):
```bash
$ git clone https://github.com/openvenues/libpostal
$ cd libpostal
$ ./bootstrap.sh
$ ./configure --datadir=[...some dir with a few GB of space...]
$ make
$ sudo make install

# On Linux it's probably a good idea to run
$ sudo ldconfig
```

Then, install node 9.5.0 and the JS dependencies:
```bash
$ sudo npm install -g node-gyp n
$ sudo n 9.5.0
$ npm install
```

Copy the spatialite file into `db/`.

Run the server (port 3000 by default):
```bash
$ node server.js
```


With Docker
-----------

Build the image:

```bash
$ docker build -t geocoder .
```

Building involves compiling `libpostal` and installation of several Ubuntu packages, so the process might take up to or even over 15 minutes to complete.

Next, run a container from our newly built geocoder image:

```bash
$ docker run -d --name mygeocoder -v /path/to/your/spatialite/db/directory/:/code/db -p 3000:3000 geocoder
```

Note: This command will run the container, name it 'mygeocoder' and will mount a volume into the container on `/code/db`, which is the location where the Node.js process will look for a file called `bagadres.spatialite`. This file needs to be prepared, see the 'spatialite preparation' section in this readme for more info.




Example queries
---------------

Normal geocoding, accepts address + city:
```bash
$ curl http://localhost:3000/geocode?q=peppeldonk%2015,%20helmond

{"straatnaam":"peppeldonk","huisnummer":"15","huisnummertoevoeging":"","postcode":"5708AP","woonplaats":"helmond","gemeente":"Helmond","provincie":"Noord-Brabant","lon":"5.62753660400647","lat":"51.4833656206657","object_type":"VBO","object_id":"0794010000123493","geometry":{"type":"Point","coordinates":[5.62753660400647,51.4833656206657]}}
```

Postcode geocoding, accepts postcode + huisnummer:
```bash
$ curl http://localhost:3000/postcode?postcode=5216GV&huisnummer=31

{"straatnaam":"Philippus de Montestraat","huisnummer":"31","huisnummertoevoeging":"","postcode":"5216GV","woonplaats":"'s-Hertogenbosch","gemeente":"'s-Hertogenbosch","provincie":"Noord-Brabant","lon":"5.31464820939035","lat":"51.682194039915","object_type":"VBO","object_id":"0796010000386976","geometry":{"type":"Point","coordinates":[5.31464820939035,51.68219403991499]}}
```

Reverse geocoding, accepts a lat/lon (EPSG:4326):
```bash
$ curl http://localhost:3000/reverse?lat=5.592062&lon=51.4

{"straatnaam":"de Plaetse","huisnummer":"70","huisnummertoevoeging":"","postcode":"5591TX","woonplaats":"Heeze","gemeente":"Heeze-Leende","provincie":"Noord-Brabant","lon":"5.59048640064042","lat":"51.3982902573836","object_type":"VBO","object_id":"1658010000000594"}
```



Spatialite preparation
----------------------

**NOTE: A pre-prepared spatialite file [is available here](https://drive.google.com/file/d/1XNcAhJL265zYraob6ommVBhQNp0xx-pm/view?usp=sharing) (~1GB, zipped)**

Download and unzip the data:

```bash
$ wget https://data.nlextract.nl/bag/csv/bag-adressen-laatst.csv.zip
$ unzip bag-adressen-laatst.csv.zip
```


Initialize the spatialite database:

```bash
$ spatialite bagadres.spatialite
```


Open it with sqlite3 and load the CSV file into a table called bagadres.
Don't forget to set the separator to ';':

```bash
$ sqlite3 bagadres.spatialite
sqlite> .separator ";"
sqlite> .import ./bagadres.csv bagadres
```

Convert all strings to lowercase:
```bash
sqlite> UPDATE bagadres SET openbareruimte = LOWER(openbareruimte), gemeente = LOWER(gemeente) huisnummertoevoeging = LOWER(huisnummertoevoeging) woonplaats = LOWER(woonplaats) provincie = LOWER(provincie);
```


Open the database with spatialite again:

```
$ spatialite bagadres.spatialite
```


Then execute the following SQL to add a POINT geometry column:

```sql
SELECT AddGeometryColumn('bagadres','geometry',4326,'POINT',2);
```


Then fill that column with data from the lat and lon columns:

```sql
UPDATE bagadres SET geometry = GeomFromText('POINT('||"lon"||' '||"lat"||')',4326);
```


Create a spatial index:

```sql
SELECT CreateSpatialIndex('bagadres', 'geometry');
```


And some other indices:

```sql
CREATE INDEX openbareruimte ON bagadres (openbareruimte);
CREATE INDEX bagadres_openbareruimte_huisnummer_woonplaats ON bagadres (openbareruimte, huisnummer, woonplaats);
CREATE INDEX postcode_huisnummer ON bagadres (postcode, huisnummer);
```

Geocoding examples:

```sql
SELECT * FROM bagadres WHERE openbareruimte="De Ruijterkade" AND huisnummer="10";
SELECT * FROM bagadres WHERE postcode="5708AP" AND huisnummer="15";
```


Reverse geocoding:

```sql
SELECT * FROM bagadres WHERE (PtDistWithin(bagadres.geometry, MakePoint(5.592062, 51.471299, 4326), 300));
```


Copy the resulting file `bagadres.spatialite` to the folder `db/`.



TODO
----

- Create a shell script which does the Spatialite preparation automatically.
- Base the Dockerfile on Alpine Linux or another smaller base image.


Query scratchpad
----------------


### FAST (~2 ms with 8973049 records, uses spatial index)

```sql
SELECT openbareruimte, ST_Distance(geometry,
  MakePoint(5.592062, 51.471299)) AS distance
FROM bagadres
WHERE distance < 0.005
  AND ROWID IN (
    SELECT ROWID FROM SpatialIndex
    WHERE f_table_name = 'bagadres' 
    AND search_frame = 
      BuildCircleMbr(5.592062, 51.471299, 0.005))
ORDER BY distance;
```



### SLOW (>5 seconds with 8973049 records, not using spatial index)

```sql
SELECT 
    openbareruimte
FROM 
    bagadres 
WHERE 
    (
        PtDistWithin(bagadres.geometry, MakePoint(5.592062, 51.471299, 4326), 0.05)
    )
```
