GEOCODER
========

A super simple geocoder and reverse geocoder for the Netherlands.

Based on BAG extract CSV.


Running
-------

```bash
$ node server.js
```

Querying
--------

```bash
$ curl http://localhost:3000/reverse?lat=5.592062&lon=51.4

{"straatnaam":"de Plaetse","huisnummer":"70","huisnummertoevoeging":"","postcode":"5591TX","woonplaats":"Heeze","gemeente":"Heeze-Leende","provincie":"Noord-Brabant","lon":"5.59048640064042","lat":"51.3982902573836","object_type":"VBO","object_id":"1658010000000594"}
```

```bash
$ curl http://localhost:3000/geocode?postcode=5216GV&huisnummer=31

{"straatnaam":"Philippus de Montestraat","huisnummer":"31","huisnummertoevoeging":"","postcode":"5216GV","woonplaats":"'s-Hertogenbosch","gemeente":"'s-Hertogenbosch","provincie":"Noord-Brabant","lon":"5.31464820939035","lat":"51.682194039915","object_type":"VBO","object_id":"0796010000386976","geometry":{"type":"Point","coordinates":[5.31464820939035,51.68219403991499]}}
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
