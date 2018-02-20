GEOCODER
========

A super simple geocoder and reverse geocoder for the Netherlands.

Based on BAG extract CSV.



Installation
------------

On Ubuntu/Debian:
```bash
$ sudo apt-get install curl autoconf automake libtool pkg-config build-essential
```

On MacOS
```bash
$ brew install curl autoconf automake libtool pkg-config
```

```bash
git clone https://github.com/openvenues/libpostal
cd libpostal
./bootstrap.sh
./configure --datadir=[...some dir with a few GB of space...]
make
sudo make install

# On Linux it's probably a good idea to run
sudo ldconfig
```

```bash
$ sudo npm install -g node-gyp
$ yarn install
```




Running
-------

Node.js installation required!


```bash
$ node server.js
```


Spatialite preparation
----------------------

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
