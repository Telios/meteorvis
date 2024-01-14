
export class VisService {
    defaultSize = 1;
    defaultColor = 0xffffff;

    constructor(db, infoPanel, engine) {
        this.db = db;
        this.selectedSpaceObjects = [];
        this.selectedSpaceObjects.push(db.spaceObjects[0]);
        this.infoPanel = infoPanel;
        this.engine = engine;
        this.selectedEntries = [];
        this.entries = this.db.entries;
        this.currentFilers = {};
        this.particleSize = 30;
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

    changeSelectedSpaceObjectsSize() {
        // TODO
    }

    changeSelectedSpaceObjectsColor() {
        // TODO
    }

    highlightFilteredObjects() {
        this.selectedEntries.forEach(entry => {
            this.engine.renderPipeline.setParticleSize(entry.idx, 300);
            this.engine.renderPipeline.setParticleColor(entry.idx, [1, 0, 0, 1])
        });
        if (this.currentFilers.hideComplements) {
            this.hideComplements();
        }
    }

    setObjectClassFilter(objectClass) {
        this.currentFilers.objectClass = objectClass;
        this.applyFilters();
    }

    setNameFilter(name) {
        this.currentFilers.name = name;
        this.applyFilters();
    }

    setMinimumSpeedFilter(minSpeed) {
        this.currentFilers.minSpeed = minSpeed;
        this.applyFilters();
    }

    setMinimumDiameterFilter(minDiameter) {
        this.currentFilers.minDiameter = minDiameter;
        this.applyFilters();
    }

    setHideComplementsFilter(hideComplements) {
        this.currentFilers.hideComplements = hideComplements;
        this.applyFilters();
    }

    applyFilters() {
        this.resetAll();
        console.log(this.currentFilers)
        let now = new Date();
        let entries = this.entries;
        console.log("Before filtering: " + entries.length)
        if (this.currentFilers.objectClass) {
            console.log("Filtering by class: " + this.currentFilers.objectClass)
            if (this.currentFilers.objectClass === "PHA") {
                entries = entries.filter(entry => entry.spaceObject.pha === "Y");
            } else if (this.currentFilers.objectClass === "NEO") {
                entries = entries.filter(entry => entry.spaceObject.neo === "Y");
            }
        }
        if (this.currentFilers.name !== "" && this.currentFilers.name !== undefined) {
            console.log("Filtering by name: " + this.currentFilers.name)
            entries = entries.filter(entry => entry.spaceObject.full_name.includes(this.currentFilers.name));
        }
        if (this.currentFilers.minSpeed) {
            console.log("Filtering by min speed: " + this.currentFilers.minSpeed)
            entries = entries.filter(entry => entry.spaceObject.meanVelocity() >= this.currentFilers.minSpeed);
        }
        if (this.currentFilers.minDiameter) {
            console.log("Filtering by min diameter: " + this.currentFilers.minDiameter)
            entries = entries.filter(entry => entry.spaceObject.diameter >= this.currentFilers.minDiameter);
        }
        this.selectedEntries = entries;
        console.log("After filtering: " + this.selectedEntries.length)
        let end = new Date();
        let time = end.getTime() - now.getTime();
        console.log('Filtering execution time: ' + time);
        this.highlightFilteredObjects();
    }


    resetAll() {
        this.db.entries.forEach(entry => {
            this.engine.renderPipeline.setParticleSize(entry.idx, (Math.min(Math.max(Math.sqrt(entry.spaceObject.diameter * this.particleSize), 20), 200)));
            this.engine.renderPipeline.setParticleColor(entry.idx, [1, 1, 1, 1])
        });
    }

    hideComplements() {
        let complementEntries = this.getComplement(this.selectedEntries);
        complementEntries.forEach(entry => {
            this.engine.renderPipeline.setParticleSize(entry.idx, 0);
        });
    }

    setParticleSize(size) {
        this.particleSize = size;
        let notSelectedEntries = this.getComplement(this.selectedEntries);
        notSelectedEntries.forEach(entry => {
            this.engine.renderPipeline.setParticleSize(entry.idx, (Math.min(Math.max(Math.sqrt(entry.spaceObject.diameter * this.particleSize), 20), 200)));
        });
    }


    getComplement(entries) {
        let now= new Date();
        let idxsToRemove = entries.map(entry => entry.idx);
        let maskedArray = new Array(this.db.entries.length).fill(false);
        idxsToRemove.forEach(idx => {
            maskedArray[idx] = true;
        })
        let complement = []
        for (let i = 0; i < maskedArray.length; i++) {
            if (!maskedArray[i]) {
                complement.push(this.entries[i]);
            }
        }
        let end    = new Date();
        let time = end.getTime() - now.getTime();
        console.log('Execution time: ' + time);
        return complement;
    }

    updateInfoPanel() {
        let content = `<div class="info-panel">Name: ${this.selectedSpaceObjects[0].full_name}</div>
        <div class="info-panel-body">
            <ul>
                <li class="custom-ls">Eccentricity: ${this.selectedSpaceObjects[0].e.toFixed(3)}</li>
                <li class="custom-ls">PHA: ${this.selectedSpaceObjects[0].pha}</li>
                <li class="custom-ls">NEO: ${this.selectedSpaceObjects[0].neo}</li>
                <li class="custom-ls">Mean velocity: ${this.selectedSpaceObjects[0].meanVelocity().toFixed(2)} km/s</li>
                <li class="custom-ls">Diameter: ${this.selectedSpaceObjects[0].diameter.toFixed(2)} km</li>
                <li class="custom-ls">Semi-major-axis: ${this.selectedSpaceObjects[0].a.toFixed(2)} au</li>
                <li class="custom-ls">Period: ${this.selectedSpaceObjects[0].per_y.toFixed(2)} years</li>
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