

class PointSingle extends DrawingObject {

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;
        this.p = new GeoPoint(d.x, d.y);
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
            + " point at x:" + this.data.x + ", y:" + this.data.y + " from origin"; //TODO add units
    }


    setDependencies( dependencies ) {
    }    

}
