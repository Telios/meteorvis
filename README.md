# MeteorVis

... where we are actually visualizing asteroids.

MeteorVis is a web-based client-side interactive 3D visualization of asteroids traversing their orbits over time.

## How to run
Serve root directory of this repository via local webserver. (needed because of CORS) <br>
Only compatible with Google Chrome, as it currently is the only browser currently supporting webGPU.

Demo is available [here](https://telios.github.io/meteorvis/).<br>
This might load a little, since it needs to download 160MB of data, convert it to our internal representation and initilize GPU buffers.

## Data used
We are visualizing the [JPL small-body database](https://ssd.jpl.nasa.gov/tools/sbdb_query.html), which contains roughly 1.3 million entries.
Each entry corresponds to an asteroid and contains name, object category (PHA/NEO), diameter and orbit parameters (i.e. parameters of the curves they are moving along).

## How does it work
We calculate positions along the orbit over time in a webGPU compute shader and render each asteroid at their respective position as billboard (in a webGPU render pipeline).
Calculating the positions in the compute shader enables further GPU-based data analysis, but as of writing this, it is not yet utilized.

## Technology used
This framework is largely inspired by [spacekit.js](https://typpo.github.io/spacekit/), which is based on the WebGL framework [THREE.js](https://threejs.org/).
While spacekit.js provides a rich set of features, its scalability in terms of how many objects it can handle is limited.
In our tests, our solution outperformed spacekit.js by a factor of 5.

Packages we also used were
 - [THREE.js](https://threejs.org/) for math (classes Vector3, Matrix4, Quaternion)
 - [julian](https://github.com/stevebest/julian) for conversions from and to [Julian Date](https://en.wikipedia.org/wiki/Julian_day), which is a common date format in astronomy
 - [spacekit.js](https://typpo.github.io/spacekit/) for precalculating some orbit parameters that do not change over time, which are subsequently used in the shader (class Ephemeris)
 - [dat.GUI](https://github.com/dataarts/dat.gui) for IMGUI-style control panel at the top right
 - [Bootstrap 5 Icon](https://icons.getbootstrap.com/) for play button icon and spinner for loading
