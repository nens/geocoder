const sqlite3 = require("spatialite").verbose();
const express = require("express");
const postal = require("node-postal");

const db = new sqlite3.Database("db/bagadres.spatialite");
const app = express();

app.get("/", function(req, res) {
    return res.json({
        message: "Try /postcode, /geocode and /reverse!"
    });
});

app.get("/geocode", function(req, res) {
    const q = req.query.q;
    let query;

    const parsedAddress = postal.parser.parse_address(q);

    const postcode = parsedAddress.find(s => {
        if (s.component === "postcode") return s;
    });

    const house_number = parsedAddress.find(s => {
        if (s.component === "house_number") return s;
    });
    const road = parsedAddress.find(s => {
        if (s.component === "road") return s;
    });

    const city = parsedAddress.find(s => {
        if (s.component === "city") return s;
    });

    if (postcode && house_number) {
        query = `
            SELECT 
                openbareruimte AS straatnaam, 
                huisnummer, 
                huisnummertoevoeging, 
                postcode, 
                woonplaats, 
                gemeente, 
                provincie, 
                lon, 
                lat, 
                AsGeoJSON(geometry) AS geom, 
                object_id, 
                object_type
            FROM bagadres
            WHERE
                postcode=? AND 
                huisnummer=?`;

        db.spatialite(function(err) {
            db.get(query, [postcode.value, house_number.value], function(
                err,
                row
            ) {
                if (!row) {
                    return res.json({
                        error: "Nothing found"
                    });
                }
                const {
                    geom,
                    lat,
                    lon,
                    straatnaam,
                    huisnummer,
                    huisnummertoevoeging,
                    postcode,
                    woonplaats,
                    gemeente,
                    provincie,
                    object_type,
                    object_id
                } = row;

                return res.json({
                    straatnaam,
                    huisnummer,
                    huisnummertoevoeging,
                    postcode,
                    woonplaats,
                    gemeente,
                    provincie,
                    lon,
                    lat,
                    object_type,
                    object_id,
                    geometry: JSON.parse(geom)
                });
            });
        });
    } else if (road && house_number && city) {
        query = `
            SELECT 
                openbareruimte AS straatnaam, 
                huisnummer, 
                huisnummertoevoeging, 
                postcode, 
                woonplaats, 
                gemeente, 
                provincie, 
                lon, 
                lat, 
                AsGeoJSON(geometry) AS geom, 
                object_id, 
                object_type
            FROM bagadres
            WHERE
                openbareruimte=? AND 
                huisnummer=? AND
                woonplaats=?`;

        console.log(road.value, house_number.value, city.value);

        db.spatialite(function(err) {
            db.get(
                query,
                [road.value, house_number.value, city.value],
                function(err, row) {
                    if (!row) {
                        return res.json({
                            error: "Nothing found"
                        });
                    }
                    const {
                        geom,
                        lat,
                        lon,
                        straatnaam,
                        huisnummer,
                        huisnummertoevoeging,
                        postcode,
                        woonplaats,
                        gemeente,
                        provincie,
                        object_type,
                        object_id
                    } = row;

                    return res.json({
                        straatnaam,
                        huisnummer,
                        huisnummertoevoeging,
                        postcode,
                        woonplaats,
                        gemeente,
                        provincie,
                        lon,
                        lat,
                        object_type,
                        object_id,
                        geometry: JSON.parse(geom)
                    });
                }
            );
        });
    } else {
        return res.json({
            error: "Provide a postcode + house number or an address + city"
        });
    }
});

app.get("/postcode", function(req, res) {
    const postcode = req.query.postcode;
    const huisnummer = req.query.huisnummer;

    if (!postcode || !huisnummer) {
        return res.json({
            error:
                "Please provide a 'postcode' (format: 1234AB) and 'huisnummer' parameter..."
        });
    }

    const query = `
        SELECT 
            openbareruimte AS straatnaam, 
            huisnummer, 
            huisnummertoevoeging, 
            postcode, 
            woonplaats, 
            gemeente, 
            provincie, 
            lon, 
            lat, 
            AsGeoJSON(geometry) AS geom, 
            object_id, 
            object_type
        FROM bagadres
        WHERE
            postcode=? AND 
            huisnummer=?`;

    db.spatialite(function(err) {
        db.get(query, [postcode, huisnummer], function(err, row) {
            if (!row) {
                return res.json({
                    error: "Nothing found"
                });
            }
            const {
                geom,
                lat,
                lon,
                straatnaam,
                huisnummer,
                huisnummertoevoeging,
                postcode,
                woonplaats,
                gemeente,
                provincie,
                object_type,
                object_id
            } = row;

            return res.json({
                straatnaam,
                huisnummer,
                huisnummertoevoeging,
                postcode,
                woonplaats,
                gemeente,
                provincie,
                lon,
                lat,
                object_type,
                object_id,
                geometry: JSON.parse(geom)
            });
        });
    });
});

app.get("/reverse", function(req, res) {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
        return res.json({
            error: "Please provide a 'lat' and 'lon' parameter..."
        });
    }

    const query = `
        SELECT 
            lat, 
            lon, 
            openbareruimte as straatnaam, 
            huisnummer, 
            huisnummertoevoeging, 
            postcode, 
            woonplaats, 
            gemeente, 
            provincie, 
            object_type, 
            object_id,
            ST_Distance(geometry, MakePoint(?, ?)) AS distance
        FROM bagadres
        WHERE distance < 0.005
          AND ROWID IN (
            SELECT ROWID FROM SpatialIndex
            WHERE f_table_name = 'bagadres' 
            AND search_frame = 
              BuildCircleMbr(?, ?, 0.005))
        ORDER BY distance`;

    db.spatialite(function(err) {
        db.get(
            query,
            [Number(lat), Number(lon), Number(lat), Number(lon)],
            function(err, row) {
                if (!row) {
                    return res.json({
                        error: "Nothing found"
                    });
                }

                const {
                    lat,
                    lon,
                    straatnaam,
                    huisnummer,
                    huisnummertoevoeging,
                    postcode,
                    woonplaats,
                    gemeente,
                    provincie,
                    object_type,
                    object_id
                } = row;

                return res.json({
                    straatnaam,
                    huisnummer,
                    huisnummertoevoeging,
                    postcode,
                    woonplaats,
                    gemeente,
                    provincie,
                    lon,
                    lat,
                    object_type,
                    object_id
                });
            }
        );
    });
});

app.listen(3000, () => console.log("Geocoder listening on port 3000!"));
