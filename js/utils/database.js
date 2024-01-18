import {Entry, SpaceObject} from "../entities/spaceObject.js";
export class Database{
    static NUMBERS = ["diameter", "epoch", "e", "a", "i", "ma", "om", "w", "tp", "q", "n", "per_d", "per_y"];

    constructor() {
        this.db = null;
        this.spaceObjects = [];
        this.entries = [];
    }

    async initWithCsv(path = "./data/sbdb_query_results.csv") {
        const csvResponse = await fetch(path);
        const content = await csvResponse.text();
        const lines = content.split("\n");
        const header = lines[0].replaceAll("\"", "").split(",");
        const isNumber = header.map(colHeader => Database.NUMBERS.includes(colHeader));
        console.log("header: ", header, ", is number: ", isNumber);
        let numAdded = 0;
        for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
            const row = lines[rowIndex].split(",");
            const spaceObject = new SpaceObject();
            for (let colIndex = 0; colIndex < header.length; colIndex++) {
                const colName = header[colIndex];
                const colValue = isNumber[colIndex] ? +row[colIndex] : row[colIndex];
                spaceObject[colName] = colValue;
            }

            try {
                const x = spaceObject.Ephemeris;
            } catch (error) {
                console.warn("row ", row, "produced error ", error, "SKIP");
                continue;
            }

            this.spaceObjects.push(spaceObject);
            this.entries.push(new Entry(numAdded, spaceObject));
            numAdded++;
        }
        console.log("read ", lines.length, " lines");
    }

    async init() {
        const config = {
            locateFile: filename => `./js/${filename}`
        }

        const sqlPromise = initSqlJs({
            locateFile: file => `./js/${file}`
        });
        const dataPromise = fetch("./data/data.db").then(res => res.arrayBuffer());
        const [SQL, buf] = await Promise.all([sqlPromise, dataPromise])
        this.db = new SQL.Database(new Uint8Array(buf));
        this.loadSpaceObjects();
        console.log("Database initialized");
    }

    query(query) {
        const res = this.db.exec(query);
        return res[0].values;
    }

    loadSpaceObjects() {
        const query = `SELECT * FROM data`;
        const res = this.query(query);
        res.forEach((row, idx) => {
            let spaceObject = new SpaceObject(...row);
            this.spaceObjects.push(spaceObject);
            this.entries.push(new Entry(idx, spaceObject));
        });
    }

    getEntriesByName(name) {
        return this.entries.filter(entry => entry.spaceObject.full_name.includes(name));
    }

    getPHAs() {
        return this.entries.filter(entry => entry.spaceObject.pha === 'Y');
    }

    getNEOs() {
        return this.entries.filter(entry => entry.spaceObject.neo === 'Y');
    }

    getEntriesByOrbitId(orbit_id) {
        return this.entries.filter(entry => entry.spaceObject.orbit_id === orbit_id);
    }

    getNEOEntries() {
        return this.entries.filter(entry => entry.spaceObject.neo === 'Y');
    }

    getPHAEntries() {
        return this.entries.filter(entry => entry.spaceObject.pha === 'Y');
    }

    getComplementNEOEntries() {
        return this.entries.filter(entry => !(entry.spaceObject.neo === 'Y'));
    }

    getComplementPHAEntries() {
        return this.entries.filter(entry => !(entry.spaceObject.pha === 'Y'));
    }

}