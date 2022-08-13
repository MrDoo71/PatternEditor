class PointIntersectArcAndAxis extends DrawingObject {

    //arc (provided as "curve"), and may be an arc or a spline (by observation)
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

        var curveOrArc = ( this.arc.arc ) ? this.arc.arc : this.arc.curve ;
        
        //TODO replace 1000 with a calculation of the longest line that may be needed
        //var boundingBox = this.basePoint.p.getBoundingBox();
        //boundingBox.extend( curveOrArc )
        //var maxLineLength = boundingBox.diagonalLength() * 1.1;
        //use this below instead of 500.
        //Do the same elsewhere where 1000 is used as infinite
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( 500/*infinite*/, angleDeg );

        var longLine = new GeoLine( this.basePoint.p, otherPoint );

        this.p = longLine.intersectArc( curveOrArc );

        this.line = new GeoLine( this.basePoint.p, this.p );

        bounds.adjust(this.p);
    }


    draw(g, isOutline) {
        //g is the svg group
        this.drawLine(g, isOutline);
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
    }


    html( asFormula ) {
        //TODO use a better name for this.curve, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'intersect arc ' + this.refOf( this.arc )
                + " with line from " + this.refOf( this.basePoint ) 
                + " at angle " + this.angle.htmlAngle( asFormula );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.arc );
        dependencies.add( this, this.angle );
    }    

}
