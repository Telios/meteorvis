import {Entry, SpaceObject} from "../entities/spaceObject.js";

async function fetchWithProgress(url, progressCallback) {
    const response = await fetch(url);
    const contentLength = +response.headers.get("Content-Length");
    const reader = response.body.getReader();

    let data = new Uint8Array(contentLength);
    let position = 0;

    while (true) {
        const {done, value} = await reader.read();

        if (done) {
            break;
        }

        progressCallback(position / contentLength);

        data.set(value, position);
        position += value.length;
    }

    if (position !== contentLength) {
        console.log("warning: received less bytes than ContentLength");
    }
    return new TextDecoder("utf-8").decode(data);
}

export class Database{
    static NUMBERS = ["diameter", "epoch", "e", "a", "i", "ma", "om", "w", "tp", "q", "n", "per_d", "per_y"];

    constructor() {
        this.db = null;
        this.spaceObjects = [];
        this.entries = [];
    }

    parseSync(content) {
        const lines = content.split("\n");
        const numLines = lines.length;
        const header = lines[0].replaceAll("\"", "").split(",");
        const isNumber = header.map(colHeader => Database.NUMBERS.includes(colHeader));
        console.log("header: ", header, ", is number: ", isNumber);
        let numAdded = 0;
        for (let rowIndex = 1; rowIndex < lines.length; rowIndex++) {
            const row = lines[rowIndex].split(",");
            const spaceObject = new SpaceObject();
            for (let colIndex = 0; colIndex < header.length; colIndex++) {
                const colName = header[colIndex];
                spaceObject[colName] = isNumber[colIndex] ? +row[colIndex] : row[colIndex];
            }

            try {
                spaceObject.calcEphemeris();
            } catch (error) {
                console.warn("row ", row, "produced error ", error, "SKIP");
                continue;
            }

            this.spaceObjects.push(spaceObject);
            this.entries.push(new Entry(numAdded, spaceObject));
            numAdded++;
        }
    }

    // TODO do parsing in a way that does not block event processing/UI updates
    async initWithCsv(path = "./data/sbdb_query_results.csv", callbacks) {

        const {onDownloadProgress, onParseProgress, onDownloadFinished, onParseFinished} = callbacks;

        const loadStart = performance.now();
        const content = await fetchWithProgress(path, onDownloadProgress);
        const loadEnd = performance.now();

        if (onDownloadFinished !== undefined){
            onDownloadFinished();
        }

        const parseStart = performance.now();
        this.parseSync(content);
        const parseEnd = performance.now();

        if (onParseFinished !== undefined) {
            onParseFinished();
        }

        console.log("DONE with loading and parsing data",
            "\nload took", (loadEnd - loadStart) / 1000, "s",
            "\nparse took", (parseEnd - parseStart) / 1000, "s");
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