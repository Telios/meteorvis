export class SpaceObject{
    ephem = undefined;

    constructor(full_name, diameter, epoch, e, a, i, ma, om, w, pha, orbit_id, tp, q, neo, n, ad, GM, BV, UB, IR, H, G, condition_code, orbit_class, per_d, per_y) {
        this.full_name = full_name; // name
        this.diameter = diameter; // object diameter (sphere model) in km
        this.epoch = epoch; // epoch of osculation in JD (Julian Day)
        this.e = e; // eccentricity
        this.a = a; // semi-major axis in AU
        this.i = i; // inclination in deg
        this.ma = ma; // mean anomaly at epoch in deg
        this.om = om; // longitude of the ascending node in deg
        this.w = w; // argument of perihelion in deg
        this.pha = pha; // Potentially Hazardous Asteroid (PHA) flag
        this.orbit_id = orbit_id; // orbit ID
        this.tp = tp; // time of perihelion passage in TDB
        this.q = q; // perihelion distance in AU
        this.neo = neo; // Near-Earth Object (NEO) flag
        this.n = n; // mean motion in deg/d
        this.ad = ad; // aphelion distance in AU
        this.GM = GM; // standard gravitational parameter in km^3/s^2
        this.BV = BV; // color index B-V in mag
        this.UB = UB; // color index U-B in mag
        this.IR = IR; // color index I-R in mag
        this.H = H; // absolute magnitude
        this.G = G; // magnitude slope parameter
        this.condition_code = condition_code; // orbit condition code MPC U parameter
        this.orbit_class = orbit_class; // orbit class
        this.per_d = per_d; // period in d (time to orbit the sun)
        this.per_y = per_y; // period in y
    }

    calcEphemeris() {
        this.ephem = new Spacekit.Ephem({
            epoch: this.epoch,
            a: this.a,
            e: this.e,
            i: this.i,
            om: this.om,
            w: this.w,
            ma: this.ma,
            tp: this.tp,
            n: this.n,
        }, 'deg');
    }

    get Ephemeris() {
        if (this.ephem === undefined) {
            this.calcEphemeris();
        }
        return this.ephem;
    }

    isPHA() {
        return this.pha === "Y";
    }

    isNEO() {
        return this.neo === "Y";
    }

    meanVelocity() {
        const semi_major_axis = this.a
        const semi_minor_axis = this.a * Math.sqrt(1 - this.e * this.e)
        const h = Math.pow(semi_major_axis - semi_minor_axis, 2) / Math.pow(semi_major_axis + semi_minor_axis, 2)
        const orbit_length = Math.PI * (semi_major_axis + semi_minor_axis) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))
        const orbit_length_km = orbit_length * 149875970.7
        const per_s = this.per_d * 24 * 60 * 60
        return orbit_length_km / per_s;
    }

}

export class Entry{
    constructor(idx, spaceObject) {
        this.idx = idx;
        this.spaceObject = spaceObject;
    }
}