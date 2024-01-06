//import * as THREE from 'three';
const THREE = Spacekit.THREE;

function main() {
    const viz = new Spacekit.Simulation(document.getElementById("mainContainer"), {
        basePath: 'https://typpo.github.io/spacekit/src',
        debug: {
            showAxes: true,
            showGrid: true,
            showStats: true,
        },
    });

    //viz.stop();

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

    const roadster = viz.createSphere('roadster', {
        labelText: 'Tesla Roadster',
        ephem: new Spacekit.Ephem({
            // These parameters define orbit shape.
            a: 1.324870564730606E+00,
            e: 2.557785995665682E-01,
            i: 1.077550722804860E+00,

            // These parameters define the orientation of the orbit.
            om: 3.170946964325638E+02,
            w: 1.774865822248395E+02,
            ma: 1.764302192487955E+02,

            // Where the object is in its orbit.
            epoch: 2458426.500000000,
        }, 'deg'),
        radius: 0.05,
    });
    console.log("roadster", roadster);
    console.log("roadster THREE.js objects", roadster.get3jsObjects());

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
}

main();