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

        //Rather than use an arbitrarily long line (which was causing issues)
        //calculate the max length of line. The line cannot be longer than
        //the bounding box encompassing the basePoint and the curve. 
        var tempBounds = new Bounds();
        tempBounds.adjust( this.basePoint.p );
        this.arc.adjustBounds( tempBounds );
        var maxLineLength = tempBounds.diagonaglLength() * 1.25;
        
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( maxLineLength, angleDeg );

        var longLine = new GeoLine( this.basePoint.p, otherPoint );

        this.p = longLine.intersectArc( curveOrArc );

        this.line = new GeoLine( this.basePoint.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
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
