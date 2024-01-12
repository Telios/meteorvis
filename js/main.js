//import * as THREE from 'three';
const THREE = Spacekit.THREE;
import {SpaceObject} from './entities/spaceObject.js';


const config = {
    locateFile: filename => `./js/${filename}`
}

const sqlPromise = initSqlJs({
    locateFile: file => `./js/${file}`
});
const dataPromise = fetch("./data/data.db").then(res => res.arrayBuffer());
const [SQL, buf] = await Promise.all([sqlPromise, dataPromise])
const db = new SQL.Database(new Uint8Array(buf));

const query = `SELECT * FROM data`;
const res = db.exec(query);

let counter = 0
let spaceObjects = [];
console.log(res)
res[0].values.forEach(row => {
    counter++;
    let spaceObject = new SpaceObject(...row);
    if (counter == 1) {
        console.log(spaceObject)
    }
    spaceObjects.push(spaceObject);
});

console.log(spaceObjects);
/*
async function loadJSON(url) {
    const response = await fetch(url);
    return await response.json();
}
const data = await loadJSON("data/data3.json");
console.log(data);
*/

function main() {
    const viz = new Spacekit.Simulation(document.getElementById("mainContainer"), {
        basePath: 'https://typpo.github.io/spacekit/src',
        startPaused: true,
        jdPerSecond: 10.0,
        maxNumParticles: 2000000,
        particleDefaultSize: 2,
        particleTextureUrl: './data/meteor_texture.png',
        debug: {
            showAxes: false,
            showGrid: false,
            showStats: true,
        },
    });

    let vizPaused = true;
    function toggleSimulationPause() {
        vizPaused = !vizPaused;
        const pauseButton = document.getElementById("pauseButton");
        const pauseButtonIcon = pauseButton.querySelector(".bi");
        if (vizPaused) {
            viz.stop();
            pauseButtonIcon.classList.remove("bi-pause-fill");
            pauseButtonIcon.classList.add("bi-play-fill");

        } else {
            viz.start();
            pauseButtonIcon.classList.remove("bi-play-fill");
            pauseButtonIcon.classList.add("bi-pause-fill");
        }

    }
    document.getElementById("pauseButton").addEventListener("click", toggleSimulationPause);
    document.getElementById("incrSpeedButton").addEventListener("click", () => {
        viz.setJdPerSecond(viz.getJdPerSecond() + 1);
    });
    document.getElementById("decrSpeedButton").addEventListener("click", () => {
        viz.setJdPerSecond(viz.getJdPerSecond() - 1);
    });


    function updateTimeDisplay() {
        // duration of a gregorian day is the same as julian day, can just use jd per seconds
        const speedDisplay = document.getElementById("timeDisplayDaysPerSecond");
        speedDisplay.innerHTML = viz.getJdPerSecond();

        const timeDisplayJd = document.getElementById("timeDisplayJd");
        timeDisplayJd.innerHTML = viz.getJd().toFixed(4);

        const timeDisplayGregorian = document.getElementById("timeDisplayGregorian");
        let date = viz.getDate();
        timeDisplayGregorian.innerHTML = date.getUTCFullYear()
            + "-" + String(date.getUTCMonth() + 1).padStart(2, "0")
            + "-" + String(date.getUTCDate()).padStart(2, "0");
    }

    //viz.stop();
    viz.onTick = () => {
        updateTimeDisplay();
    };

    // Create a background using Yale Bright Star Catalog data.
    //viz.createStars();

    // Create our first object - the sun - using a preset space object.
    const sun = viz.createObject('sun', Spacekit.SpaceObjectPresets.SUN);

    // Then add some planets
    const mercury = viz.createObject('mercury', Spacekit.SpaceObjectPresets.MERCURY);
    const venus = viz.createObject('venus', Spacekit.SpaceObjectPresets.VENUS);
    const earth = viz.createObject('earth', Spacekit.SpaceObjectPresets.EARTH);
    const mars = viz.createObject('mars', Spacekit.SpaceObjectPresets.MARS);
    const jupiter = viz.createObject('jupiter', Spacekit.SpaceObjectPresets.JUPITER);
    const saturn = viz.createObject('saturn', Spacekit.SpaceObjectPresets.SATURN);
    const uranus = viz.createObject('uranus', Spacekit.SpaceObjectPresets.URANUS);
    const neptune = viz.createObject('neptune', Spacekit.SpaceObjectPresets.NEPTUNE);
    //const skybox = viz.createStars({minSize /* optional */: 3 /* default */});

    //const skybox = viz.createSkybox(Spacekit.SkyboxPresets.NASA_TYCHO);

    console.log("Adding particles to simulation...");
    const startTime = performance.now();
    spaceObjects.forEach((spaceObject, i) => {
        // Simulation uses particle system for rendering per default
        viz.createObject("obj-" + i, {
            ephem: spaceObject.Ephemeris,
            hideOrbit: true, //disabling this leads to very long runtimes, probably samples every orbit on CPU
            theme: {
                color: 0xFFFFFF
            }
        });
    });
    console.log("...took " + ((performance.now() - startTime) / 1000).toFixed(3) + "ms");

    //console.log("roadster", roadster);
    //console.log("roadster THREE.js objects", roadster.get3jsObjects());

    /*
    const objects = [sun, mercury, venus, earth, mars, jupiter, saturn, uranus, neptune, roadster];
    let boundingObjects =
        Promise.all(objects.map(object => object.getBoundingObject()))
            .then((values) => {
                values.forEach((object, i) => {
                    object.userData.spacekitRef = objects[i];
                })
                boundingObjects = values;
            });

    // Create a shape object
    /*const obj = viz.createShape('myobj', {
        position: [3 + 4, 1, -5],
        shape: {
            // Example shape file -
            // http://astro.troja.mff.cuni.cz/projects/asteroids3D/web.php?page=db_asteroid_detail&asteroid_id=1046
            shapeUrl: 'models/shape.obj', // Cacus
        },
        rotation: {
            lambdaDeg: 251,
            betaDeg: -63,
            period: 3.755067,
            yorp: 1.9e-8,
            phi0: 0,
            jd0: 2443568.0,
        },
        debug: {
            showAxes: true,
        },
    });*/

    /*
    const camera = viz.getViewer().camera;
    const raycaster = new THREE.Raycaster();

    function onClick(event) {

        const elementWidth = 800;
        const elementHeight = 600;

        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both components
        const pointer = new THREE.Vector2();
        pointer.x = (event.clientX / elementWidth) * 2 - 1;
        pointer.y = -(event.clientY / elementHeight) * 2 + 1;
        console.log("clicked ", pointer);
        raycaster.setFromCamera(pointer, camera);
        //console.log(boundingObjects);
        const allIntersects = raycaster.intersectObjects(boundingObjects, false);
        console.log("all intersections", allIntersects);
        console.log("object intersections", allIntersects.filter(intersect => intersect.object.type !== "Line"));

        const material = new THREE.LineBasicMaterial({color: 0x0000ff});

        const lineStart = raycaster.ray.origin.clone();
        const lineEnd = raycaster.ray.direction.clone().multiplyScalar(100).add(lineStart);
        const bufferGeometry = new THREE.BufferGeometry().setFromPoints([lineStart, lineEnd]);
        const line = new THREE.Line(bufferGeometry, material);
        viz.getScene().add(line);

        console.log(raycaster.ray)
    }


    document.getElementById("mainContainer").onclick = onClick;
    */
}

main();