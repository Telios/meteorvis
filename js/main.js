//import * as THREE from 'three';
import {VisService} from "./utils/visService.js";
import {GUI} from "./utils/gui.js";
import {Engine} from "./engine.js"
import {SpaceObject} from './entities/spaceObject.js';
import {Database} from './utils/database.js';

//TODO use git lfs or some other non-temporary means of saving this
// another option: directly pull from Small-Body Database Query (https://ssd.jpl.nasa.gov/tools/sbdb_query.html)
const DATASET_PATH = "https://media.githubusercontent.com/media/pkomon-tgm/rtvis2023-dataset/main/sbdb_query_results.csv";
const db = new Database();
await db.initWithCsv(DATASET_PATH);

function getSpaceObjectsForSunAndPlanets() {

    const sun = new SpaceObject();
    sun.full_name = "Sun";
    sun.epoch = 0;
    sun.a = 0;
    sun.e = 0;
    sun.i = 0;
    sun.om = 0;
    sun.w = 0;
    sun.ma = 0;
    sun.diameter = 1391400;

    const mercury = new SpaceObject();
    mercury.full_name = "Mercury";
    mercury.epoch = 2458426.5;
    mercury.a = 3.870968969437096e-1;
    mercury.e = 2.056515875393916e-1;
    mercury.i = 7.003891682749818;
    mercury.om = 4.830774804443502e1;
    mercury.w = 2.917940253442659e1;
    mercury.ma = 2.56190975209273e2;
    mercury.diameter = 2440.5 * 2;

    const venus = new SpaceObject();
    venus.full_name = "Venus";
    venus.epoch = 2458426.5;
    venus.a = 7.233458663591554e-1;
    venus.e = 6.762510759617694e-3;
    venus.i = 3.394567787211735;
    venus.om = 7.662534150657346e1;
    venus.w = 5.474567447560867e1;
    venus.ma = 2.756687596099721e2;
    venus.diameter = 12756;

    const earth = new SpaceObject();
    earth.full_name = "Earth";
    earth.epoch = 2458426.500000000;
    earth.a = 1.000618919441359E+00;
    earth.e = 1.676780871638673E-02;
    earth.i = 0;
    earth.om = 1.888900932218542E+02;
    earth.w = 2.718307282052625E+02;
    earth.ma = 3.021792498388233E+02;
    earth.diameter = 12742;

    const mars = new SpaceObject();
    mars.full_name = "Mars";
    mars.epoch = 2458426.5;
    mars.a = 1.52371401537107;
    mars.e = 9.336741335309606e-2;
    mars.i = 1.848141099825311;
    mars.om = 4.950420572080223e1;
    mars.w = 2.866965847685386e2;
    mars.ma = 2.538237617924876e1;
    mars.diameter = 3390 * 2;

    const jupiter = new SpaceObject();
    jupiter.full_name = "Jupiter";
    jupiter.epoch = 2458426.5;
    jupiter.a = 5.20180355911023;
    jupiter.e = 4.89912558249006e-2;
    jupiter.i = 1.303560894624275;
    jupiter.om = 1.005203828847816e2;
    jupiter.w = 2.73736301845404e2;
    jupiter.ma = 2.31939544389401e2;
    jupiter.diameter = 69911 * 2;

    const saturn = new SpaceObject();
    saturn.full_name = "Saturn";
    saturn.epoch = 2458426.5;
    saturn.a = 9.577177295536776;
    saturn.e = 5.101889921719987e-2;
    saturn.i = 2.482782449972317;
    saturn.om = 1.136154964073247e2;
    saturn.w = 3.394422648650336e2;
    saturn.ma = 1.870970898012944e2;
    saturn.diameter = 58232 * 2;

    const uranus = new SpaceObject();
    uranus.full_name = "Uranus";
    uranus.epoch = 2458426.5;
    uranus.a = 1.914496966635462e1;
    uranus.e = 4.832662948112808e-2;
    uranus.i = 7.697511134483724e-1;
    uranus.om = 7.414239045667875e1;
    uranus.w = 9.942704504702185e1;
    uranus.ma = 2.202603033874267e2;
    uranus.diameter = 25362 * 2;

    const neptune = new SpaceObject();
    neptune.full_name = "Neptune";
    neptune.epoch = 2458426.5;
    neptune.a = 3.00962226342805e1;
    neptune.e = 7.36257118719377e-3;
    neptune.i = 1.774569249829094;
    neptune.om = 1.318695882492132e2;
    neptune.w = 2.586226409499831e2;
    neptune.ma = 3.152804988924479e2;
    neptune.diameter = 24622 * 2;

    return [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune];
}

async function main() {
    const objects = getSpaceObjectsForSunAndPlanets();
    const objectColors = {
        "Sun": [1.0, 1.0, 0.0, 1.0], //sun
        "Mercury": [148/255, 148/255, 148/255, 1.0], //mercury
        "Earth": [108/255, 123/255, 72/255, 1.0], //earth
        "Mars": [223/255, 169/255, 100/255, 1.0], //mars
        "Venus": [250/255, 177/255, 118/255, 1.0], //venus
        "Uranus": [206/255, 236/255, 249/255, 1.0], //uranus
        "Neptune": [134/255, 122/255, 185/255, 1.0], //neptune
        "Saturn": [220/255, 197/255, 146/255, 1.0], //saturn
        "Jupiter": [179/255, 174/255, 132/255, 1.0], //jupiter
    };

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
    const visService = new VisService(db, infoPanel, engine, objects.length);
    visService.resetAll();
    visService.updateInfoPanel();
    gui.speedController.onChange((value) => {
        engine.setJdPerSecond(value);
    });
    gui.searchController.onChange((value) => {
        visService.setNameFilter(value)
    });
    gui.hideComplementsController.onChange((value) => {
        visService.setHideComplementsFilter(value);
    });
    gui.asteroidSizeController.onChange((value) => {
        visService.setParticleSize(value);
    });
    gui.objectClassController.onChange((value) => {
        visService.setObjectClassFilter(value);
    });
    gui.minDiameterController.onChange((value) => {
        visService.setMinimumDiameterFilter(value);
    });
    gui.minSpeedController.onChange((value) => {
        visService.setMinimumSpeedFilter(value);
    });

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
    await engine.setAndUploadSpaceObjects([...objects, ...db.spaceObjects]);
    await engine.webGpuContext.device.queue.onSubmittedWorkDone(); //wait until current queue is done
    const uploadEndTime = performance.now();
    console.log("...done in ", (uploadEndTime - uploadStartTime), "ms");

    objects.forEach((obj, i) => {
        engine.renderPipeline.setParticleSize(i, Math.min(Math.sqrt(obj.diameter * visService.particleSize), 1000));
        console.log(obj.full_name, objectColors[obj.full_name]);
        engine.renderPipeline.setParticleColor(i, objectColors[obj.full_name]);

    });

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

await main();