
export class VisService {
    defaultSize = 1;
    defaultColor = 0xffffff;

    constructor(db) {
        this.db = db;
        this.selectedSpaceObjects = [];
    }

    showOnlyPHAs() {
        this.selectedSpaceObjects = this.db.getPHAs();
    }

    showOnlyNEOs() {
        this.selectedSpaceObjects = this.selectedSpaceObjects.filter(so => so.isNEO());
    }

    showSelectedSpaceObjectDetails() {
        // TODO
    }

    showSelectedSpaceObjectOrbit() {
        // TODO
    }

    resetSelected() {
        this.selectedSpaceObjects = this.db.spaceObjects;

        // TODO default size and color
    }

    changeSelectedSpaceObjectsSize() {
        // TODO
    }

    changeSelectedSpaceObjectsColor() {
        // TODO
    }

    setSelectedSpaceObjectsByName(name) {
        this.selectedSpaceObjects = this.db.getSpaceObjectsByName(name);
    }

    getComplement(spaceObjects) {
        return this.db.spaceObjects.filter(so => !spaceObjects.includes(so));
    }

}