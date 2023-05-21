class SplineUsingControlPoints extends DrawingObject {

    //startPoint - the spline start
    //startControlPoint
    //endPoint - the spline end
    //endControlPoint

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.startPoint === "undefined")
            this.startPoint = this.patternPiece.getObject(d.point1);

        if (typeof this.startControlPoint === "undefined")
            this.startControlPoint = this.patternPiece.getObject(d.point2);

        if (typeof this.endControlPoint === "undefined")
            this.endControlPoint = this.patternPiece.getObject(d.point3);

        if (typeof this.endPoint === "undefined")
            this.endPoint = this.patternPiece.getObject(d.point4);

        this.curve = new GeoSpline( [ { point: this.startPoint.p, outControlPoint: this.startControlPoint.p },
                                      { inControlPoint: this.endControlPoint.p,  point: this.endPoint.p } ] );

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        this.curve.adjustBounds( bounds );
    }

    
    asShapeInfo() {
        return this.curve.asShapeInfo();
    }


    draw( g, drawOptions ) {

        if ( this.lineVisible() )
            this.drawPath( g, this.curve.svgPath(), drawOptions );

        //Where should we draw the label? half way along the curve?
        //this.drawDot(g, drawOptions);
        this.drawLabel( g, drawOptions );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
            + 'spline from ' + this.refOf( this.startPoint )
            + " using control point " + this.refOf( this.startControlPoint )
            + " to " + this.refOf( this.endPoint )
            + " using control point " + this.refOf( this.endControlPoint );
    }

    
    setDependencies( dependencies )
    {
        dependencies.add( this, this.startPoint );
        dependencies.add( this, this.startControlPoint );
        dependencies.add( this, this.endPoint );
        dependencies.add( this, this.endControlPoint );
    }    
}
