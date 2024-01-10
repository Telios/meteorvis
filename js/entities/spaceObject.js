export class SpaceObject{
    constructor(spkid, full_name, diameter, epoch, e, a, q, i, om, w, ma, ad, n, tp, per, per_y, obj_class, pha, orbit_id) {
        this.spkid = spkid;
        this.full_name = full_name;
        this.diameter = diameter;
        this.epoch = epoch;
        this.e = e;
        this.a = a;
        this.q = q;
        this.i = i;
        this.om = om;
        this.w = w;
        this.ma = ma;
        this.ad = ad;
        this.n = n;
        this.tp = tp;
        this.per = per;
        this.per_y = per_y;
        this.obj_class = obj_class;
        this.pha = pha;
        this.orbit_id = orbit_id;
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
        })
    }
}