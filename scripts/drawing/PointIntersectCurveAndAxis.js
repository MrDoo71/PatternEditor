class PointIntersectCurveAndAxis extends DrawingObject {

    //basePoint
    //curve
    //angle

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.drawing.getObject(d.basePoint);

        if (typeof this.curve === "undefined")
            this.curve = this.drawing.getObject(d.curve);

        if (typeof this.angle === "undefined")
            this.angle = this.drawing.newFormula(d.angle);

        let angleDeg = this.angle.value();
        if ( angleDeg >= 360 )
            angleDeg -= 360;
        else if ( angleDeg < 0 )
            angleDeg += 360;


        //Rather than use an arbitrarily long line (which was causing issues)
        //calculate the max length of line. The line cannot be longer than
        //the bounding box encompassing the basePoint and the curve. 
        const tempBounds = new Bounds();
        tempBounds.adjust( this.basePoint.p );
        this.curve.adjustBounds( tempBounds );
        const maxLineLength = tempBounds.diagonaglLength() * 1.25;
        
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( maxLineLength, angleDeg );

        const line = new GeoLine( this.basePoint.p, otherPoint );

        const lineSI = line.asShapeInfo();
        const curveSI = this.curve.asShapeInfo();

        const intersections = Intersection.intersect(lineSI, curveSI);        

        if ( intersections.points.length === 0 )
        {
            throw new Error( "No intersections found. " );
        }
        else
        {
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        this.line = new GeoLine( this.basePoint.p, this.p );

        this.adjustBounds( bounds );
    }
    
        
    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }

    
    draw(g, drawOptions ) {
        //g is the svg group
        this.drawLine(g, drawOptions ); 
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'intersect curve ' + this.refOf( this.curve )
                + " with line from " + this.refOf( this.basePoint )
                + " at angle " + this.angle.htmlAngle( asFormula );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.curve );
        dependencies.add( this, this.angle );
    }    

}
