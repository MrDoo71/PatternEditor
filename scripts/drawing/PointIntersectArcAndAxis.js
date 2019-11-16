/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/


class PointIntersectArcAndAxis extends DrawingObject {

    //arc (provided as "curve")
    //basePoint
    //angle

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.arc === "undefined")
            this.arc = this.patternPiece.getObject(d.curve); //An anomaly, would be better if this were arc.

        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);

            //TODO replace 1000 with a calculation of the longest line that may be needed
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngle( 1000/*infinite*/, Math.PI * this.angle.value() / 180 );

        var longLine = new GeoLine( this.basePoint.p, otherPoint );

        this.p = longLine.intersectArc( this.arc.arc );
        this.line = new GeoLine( this.basePoint.p, this.p );

        bounds.adjust(this.p);
    }

    draw(g) {
        //g is the svg group
        this.drawLine(g, this);
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        //TODO use a better name for this.curve, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: intersect arc ' + this.arc.data.derivedName + " with line from " + this.basePoint.data.name + " at angle " + this.angle.value();
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.arc );
        dependencies.add( this, this.angle );
    }    

}
