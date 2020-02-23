/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/


class PointIntersectArcAndAxis extends DrawingObject {

    //arc (provided as "curve"), and may be an arc or a spline (ob observation)
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

        var angleDeg = this.angle.value();
        if ( angleDeg >= 360 )
            angleDeg -= 360;
        else if ( angleDeg < 0 )
            angleDeg += 360;

            //TODO replace 1000 with a calculation of the longest line that may be needed
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngle( 1000/*infinite*/, Math.PI * angleDeg / 180 );

        var longLine = new GeoLine( this.basePoint.p, otherPoint );

        try {

            if ( this.arc.arc )
                this.p = longLine.intersectArc( this.arc.arc );
            else
                this.p = longLine.intersectArc( this.arc.curve );

        } catch (e) {
            console.log( "FAILED - PointIntersectArcAndAxis: " + d.name + " - " + e.message );
            this.p = new GeoPoint(0,0);
            this.error = "No intersections found.";
            //TODO set status to failed and highlight as red
        }

        this.line = new GeoLine( this.basePoint.p, this.p );

        bounds.adjust(this.p);
    }

    draw(g) {
        //g is the svg group
        this.drawLine(g, this);
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html( asFormula ) {
        //TODO use a better name for this.curve, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'intersect arc ' + this.arc.ref()
                + " with line from " + this.basePoint.ref() 
                + " at angle " + this.angle.html( asFormula );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.arc );
        dependencies.add( this, this.angle );
    }    

}
