
export class VisService {
    defaultSize = 1;
    defaultColor = 0xffffff;

    constructor(db, infoPanel) {
        this.db = db;
        this.selectedSpaceObjects = [];
        this.selectedSpaceObjects.push(db.spaceObjects[0]);
        this.infoPanel = infoPanel;
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

    updateInfoPanel() {
        console.log(this.infoPanel)
        console.log(this.infoPanel.content);
        let content = `<div class="info-panel">Name: ${this.selectedSpaceObjects[0].full_name}</div>
        <div class="info-panel-body">
            <ul>
                <li>Eccentricity: ${this.selectedSpaceObjects[0].e.toFixed(3)}</li>
                <li>PHA: ${this.selectedSpaceObjects[0].pha}</li>
                <li>NEO: ${this.selectedSpaceObjects[0].neo}</li>
                <li>Mean velocity: ${this.selectedSpaceObjects[0].meanVelocity().toFixed(2)} km/s</li>
                <li>Diameter: ${this.selectedSpaceObjects[0].diameter.toFixed(2)} km</li>
                <li>Semi-major-axis: ${this.selectedSpaceObjects[0].a.toFixed(2)} au</li>
                <li>Period: ${this.selectedSpaceObjects[0].per_y.toFixed(2)} years</li>
            </ul>
        </div>
        <div class="info-panel-footer">
            <p>
                <strong>Eccentricity...</strong> is a measure of how much an orbit deviates from a perfect circle (e = 0).
                <br>
                <br>
                <strong>PHA...</strong> indicates if the asteroid is a potential hazardous asteroid N -> no, Y - yes.
                <br>
                <br>
                <strong>NEO...</strong> indicates if the solar system object is a near earth object N -> no, Y - yes.
                <br>
                <br>
                <strong>Mean velocity...</strong> is the average velocity of an object.
                <br>
                <br>
                <strong>Diameter...</strong> is the diameter of the object (assuming it is spherical).
                <br>
                <br>
                <strong>Semi-major-axis...</strong> is the half of the major axis of the elliptical orbit; also the mean distance from the Sun.
                <br>
                <br>
                <strong>Period...</strong> is the time needed for a body to revolve around the sun.
                <br>
                <br>
                See <a href="https://ssd.jpl.nasa.gov/glossary">NASA JPL glossary</a> for more information.
            </p>
        </div>`;
        this.infoPanel.content.insertAdjacentHTML('beforeend', content);
    }

}