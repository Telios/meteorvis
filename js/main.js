//import * as THREE from 'three';
import {VisService} from "./utils/visService.js";
import {GUI} from "./utils/gui.js";
import {Engine} from "./render.js"

const THREE = Spacekit.THREE;
import {Entry, SpaceObject} from './entities/spaceObject.js';
import {Database} from './utils/database.js';
import {spaceObjectsToEphemeris, testOrbitPipeline} from "./orbit-pipeline.js";
const db = new Database();
await db.init();

async function main() {
    const gui = new GUI();

    /*const viz = new Spacekit.Simulation(document.getElementById("mainContainer"), {
        basePath: 'https://typpo.github.io/spacekit/src',
        startPaused: true,
        jdPerSecond: 150.0,
        maxNumParticles: 150000,
        particlesDefaultSize: 2,
        particleTextureUrl: './sprites/smallparticle.png',
        debug: {
            showAxes: false,
            showGrid: false,
            showStats: true,
        },
    });*/


    const COLOR_WHITE = [1.0, 1.0, 1.0, 1.0];

    const engine = new Engine(document.getElementById("mainContainer"));
    await engine.init({
        particleTextureUrl: "./sprites/smallparticle.png",
        particleDefaultSize: 20,
        particleDefaultColor: COLOR_WHITE,
    });

    const infoPanel = gui.infoPanel();
    const visService = new VisService(db, infoPanel, engine);
    visService.resetAll();
    visService.updateInfoPanel();
    gui.speedController.onChange((value) => { engine.setJdPerSecond(value); });
    gui.searchController.onChange((value) => { visService.setNameFilter(value) });
    gui.hideComplementsController.onChange((value) => { visService.setHideComplementsFilter(value); });
    gui.asteroidSizeController.onChange((value) => { visService.setParticleSize(value); });
    gui.objectClassController.onChange((value) => { visService.setObjectClassFilter(value); });
    gui.minDiameterController.onChange((value) => { visService.setMinimumDiameterFilter(value); });
    gui.minSpeedController.onChange((value) => { visService.setMinimumSpeedFilter(value); });

    function toggleSimulationPause() {
        const pauseButton = document.getElementById("pauseButton");
        const pauseButtonIcon = pauseButton.querySelector(".bi");
        if (engine.isPaused) {
            engine.start();
            pauseButtonIcon.classList.remove("bi-play-fill");
            pauseButtonIcon.classList.add("bi-pause-fill");
        } else {
            engine.stop();
            pauseButtonIcon.classList.remove("bi-pause-fill");
            pauseButtonIcon.classList.add("bi-play-fill");
        }

    }

    document.getElementById("pauseButton").addEventListener("click", toggleSimulationPause);
    document.getElementById("incrSpeedButton").addEventListener("click", () => {
        engine.setJdPerSecond(engine.getJdPerSecond() + 1);
    });
    document.getElementById("decrSpeedButton").addEventListener("click", () => {
        engine.setJdPerSecond(engine.getJdPerSecond() - 1);
    });


    function updateTimeDisplay() {
        // duration of a gregorian day is the same as julian day, can just use jd per seconds
        const speedDisplay = document.getElementById("timeDisplayDaysPerSecond");
        speedDisplay.innerHTML = engine.getJdPerSecond();

        const timeDisplayJd = document.getElementById("timeDisplayJd");
        timeDisplayJd.innerHTML = engine.getJd().toFixed(4);

        const timeDisplayGregorian = document.getElementById("timeDisplayGregorian");
        let date = engine.getDate();
        timeDisplayGregorian.innerHTML = date.getUTCFullYear()
            + "-" + String(date.getUTCMonth() + 1).padStart(2, "0")
            + "-" + String(date.getUTCDate()).padStart(2, "0");
    }

    //viz.stop();
    engine.onTick = () => {
        updateTimeDisplay();
    };


    // Create a background using Yale Bright Star Catalog data.
    //viz.createStars();

    // Create our first object - the sun - using a preset space object.
    /*const sun = viz.createObject('sun', Spacekit.SpaceObjectPresets.SUN);

    // Then add some planets
    const mercury = viz.createObject('mercury', Spacekit.SpaceObjectPresets.MERCURY);
    const venus = viz.createObject('venus', Spacekit.SpaceObjectPresets.VENUS);
    const earth = viz.createObject('earth', Spacekit.SpaceObjectPresets.EARTH);
    const mars = viz.createObject('mars', Spacekit.SpaceObjectPresets.MARS);
    const jupiter = viz.createObject('jupiter', Spacekit.SpaceObjectPresets.JUPITER);
    const saturn = viz.createObject('saturn', Spacekit.SpaceObjectPresets.SATURN);
    const uranus = viz.createObject('uranus', Spacekit.SpaceObjectPresets.URANUS);
    const neptune = viz.createObject('neptune', Spacekit.SpaceObjectPresets.NEPTUNE);*/
    //const skybox = viz.createStars({minSize /* optional */: 3 /* default */});

    //const skybox = viz.createSkybox(Spacekit.SkyboxPresets.NASA_TYCHO);


    console.log("loading particles... prepare to destroy your computer");
    //db.spaceObjects.forEach((spaceObject, i) => {
    //    const idx = asteroids.addParticle(spaceObject.Ephemeris);
    //    asteroids.setParticleSize(Math.max(Math.sqrt(spaceObject.diameter / 10), 2), idx);
    //    asteroids.hideParticle(idx);
        //asteroids.setParticleSize(0, idx);
    //    db.entries.push(new Entry(idx, spaceObject));
    //});
    //console.log(asteroids)

    //await testOrbitPipeline(db.spaceObjects, 2400000);
    //return;

    console.log("upload orbit data...");
    const uploadStartTime = performance.now();
    await engine.setAndUploadSpaceObjects(db.spaceObjects);
    await engine.webGpuContext.device.queue.onSubmittedWorkDone(); //wait until current queue is done
    const uploadEndTime = performance.now();
    console.log("...done in ", (uploadEndTime - uploadStartTime), "ms");

    setTimeout(() => engine.run(), 0);



    //db.spaceObjects.forEach((spaceObject, i) => {
        /*const obj = viz.createObject('asteroid' + i, {
            ephem: spaceObject.Ephemeris,
            hideOrbit: true,
            theme: {
                color: 0xFFFFFF,
            }
        });*/

        //viz.particles.setParticleSize((Math.min(Math.max(Math.sqrt(spaceObject.diameter / 10), 1.5), 10)), obj._particleIndex);
        //db.entries.push(new Entry(obj, spaceObject));
    //});

    //TODO
    /*db.getPHAEntries().forEach((entry, i) => {
        viz.particles.setParticleColor( 0xFF0000, entry.vizObj._particleIndex);
        viz.particles.setParticleSize(5, entry.vizObj._particleIndex);
    });*/



}

main();