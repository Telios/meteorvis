export class SpaceObject{
    constructor(full_name, diameter, epoch, e, a, i, ma, om, w, pha, orbit_id, tp) {
        this.full_name = full_name;
        this.diameter = diameter;
        this.epoch = epoch;
        this.e = e;
        this.a = a;
        this.i = i;
        this.ma = ma;
        this.om = om;
        this.w = w;
        this.pha = pha;
        this.orbit_id = orbit_id;
        this.tp = tp;
    }

    get Ephemeris() {
        return new Spacekit.Ephem({
            epoch: this.epoch,
            a: this.a,
            e: this.e,
            i: this.i,
            om: this.om,
            w: this.w,
            ma: this.ma,
            tp: this.tp,
        })
    }
}