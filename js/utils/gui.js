export class GUI {
    constructor() {
        this.gui = new dat.GUI();
        this.gui.width = 450;
        this.init();
    }

    init() {
        var GuiObject = function() {
            this['Search by name'] = '';
            this['Object class'] = 'All';
            this['Particle size'] = 2;
            this['Show orbits'] = false;
            this['Days per second'] = 150.0;
            this['Minimum diameter [km]'] = 0;
            this['Minimum speed [km/s]'] = 0;
        };
        let guiObject = new GuiObject();
        let visOptions = this.gui.addFolder('Visualization');
        let filterOptions = this.gui.addFolder('Filters');

        this.objectClassController = filterOptions.add(guiObject, 'Object class', ['PHA', 'NEO', 'All']);
        this.asteroidSizeController = visOptions.add(guiObject, 'Particle size', 1, 10);
        this.showOrbitsController = visOptions.add(guiObject, 'Show orbits');
        this.minDiameterController = filterOptions.add(guiObject, 'Minimum diameter [km]', 0, 1000);
        this.minSpeedController = filterOptions.add(guiObject, 'Minimum speed [km/s]', 0, 1000);
        this.speedController = this.gui.add(guiObject, 'Days per second', 0, 1000);
        this.searchController = this.gui.add(guiObject, 'Search by name');

        this.searchController.onChange((value) => { this.updateSearch(value); });
        this.objectClassController.onChange((value) => { this.updateObjectClassSelected(value); });
        this.asteroidSizeController.onChange((value) => { this.updateAsteroidSize(value); });
        this.showOrbitsController.onChange((value) => { this.updateShowOrbits(value); });
        this.speedController.onChange((value) => { this.updateSpeed(value); });
        this.minDiameterController.onChange((value) => { this.updateMinDiameter(value); });
        this.minSpeedController.onChange((value) => { this.updateMinSpeed(value); });

    }

    updateSearch(value) {
        this.search = value;
    }

    updateObjectClassSelected(value) {
        this.objectClassSelected = value;
    }

    updateAsteroidSize(value) {
        this.asteroidSize = value;
    }

    updateShowOrbits(value) {
        this.showOrbits = value;
    }

    updateSpeed(value) {
        this.speed = value;
    }

    updateMinDiameter(value) {
        this.minDiameter = value;
    }

    updateMinSpeed(value) {
        this.minSpeed = value;
    }

    infoPanel() {
        return jsPanel.create({
            theme: {
                bgPanel: '#fff',
                colorHeader: '#2c2c2c',
                bgContent: '#2c2c2c',
                colorContent: '#fff',
            },
            headerTitle: 'Info',
            panelSize: {
                width: () => { return window.innerWidth * 0.17 },
                height: () => { return window.innerHeight * 0.7 }
            },
            dragit: {
                snap: true,
                opacity: 0.3,
            },
            syncMargins: true,
            borderRadius: '.8rem',
            position: "left-center",
        });
    }


}