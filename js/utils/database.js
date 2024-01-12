import {SpaceObject} from "../entities/spaceObject.js";
export class Database{
    constructor() {
        this.db = null;
        this.spaceObjects = [];
        this.entries = [];
    }

    async init() {
        const config = {
            locateFile: filename => `./js/${filename}`
        }

        const sqlPromise = initSqlJs({
            locateFile: file => `./js/${file}`
        });
        const dataPromise = fetch("./data/data1.db").then(res => res.arrayBuffer());
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
        res.forEach(row => {
            let spaceObject = new SpaceObject(...row);
            this.spaceObjects.push(spaceObject);
        });
    }

    getSpaceObjectsByName(name) {
        return this.spaceObjects.filter(so => so.full_name === name);
    }

    getSpaceObjectsByOrbitId(orbit_id) {
        return this.spaceObjects.filter(so => so.orbit_id === orbit_id);
    }

    getSpaceObjectsByOrbitClass(orbit_class) {
        return this.spaceObjects.filter(so => so.orbit_class === orbit_class);
    }

    getPHOs() {
        return this.spaceObjects.filter(so => so.pha === 'Y');
    }

    getNEOs() {
        return this.spaceObjects.filter(so => so.neo === 'Y');
    }

    getEntriesByName(name) {
        return this.entries.filter(entry => entry.spaceObject.full_name === name);
    }

    getEntriesByOrbitId(orbit_id) {
        return this.entries.filter(entry => entry.spaceObject.orbit_id === orbit_ids);
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