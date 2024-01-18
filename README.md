# MeteorVis

... where we actually visualizinge asteroids (mainly).

MeteorVis is a web-based client-side using webGPU.

## How to run
Open `index.html`.
That's it.
Only compatible with Google Chrome, as it currently is the only browser currently supporting webGPU.

Demo is available [here](https://telios.github.io/meteorvis/).<br>
This might load a little, since it needs to download 160MB of data, convert it to our internal representation and initilize GPU buffers.

## How does it work
We are visualizing the JPL small-body database, which contains 1.3 million objects.
Each object has an orbit that is a curve (most are ellipsoids) it moves along over time.
We calculate positions along the orbit over time in a webGPU compute shader and render each one as a billboard (in a webGPU render pipeline).
Calculating the positions in the compute shader enables further GPU-based data analysis, but as of writing this, it is not utilized.
