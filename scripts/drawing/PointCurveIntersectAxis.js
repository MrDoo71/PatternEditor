define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});


class PointCurveIntersectAxis extends DrawingObject {

    //basePoint
    //curve
    //angle

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.curve === "undefined")
            this.curve = this.patternPiece.getObject(d.curve);

        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);

        let otherPoint = this.basePoint.p.pointAtDistanceAndAngle( 1000/*infinite*/, Math.PI * this.angle.value() / 180 );

        this.line = new GeoLine( this.basePoint.p, otherPoint );

        this.p = this.line.intersectArc( this.curve.arc );

        bounds.adjust(this.p);
    }

    draw(g) {

        //TODO draw the line between basePoint and p

        //g is the svg group
        var d = this.data; //the original json data
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        //TODO use a better name for this.curve, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: intersect curve ' + this.curve.center.data.name + " with line from " + this.basePoint.data.name + " at angle " + this.angle.value();
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.curve );
        dependencies.add( this, this.angle );
    }    

}
