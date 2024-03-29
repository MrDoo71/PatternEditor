class PointAlongBisector extends DrawingObject {

    //firstPoint
    //secondPoint
    //thirdPoint
    //length

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.secondPoint);
        if (typeof this.thirdPoint === "undefined")
            this.thirdPoint = this.drawing.getObject(d.thirdPoint);
        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);
            
        const line1 = new GeoLine( this.secondPoint.p, this.firstPoint.p );    
        const line2 = new GeoLine( this.secondPoint.p, this.thirdPoint.p );    

        //TODO test what happens when this crosses the equator! i.e. one point is just below the equator and one just above (and in either direction)
        const bisectingAngle = ( line1.angleDeg() + line2.angleDeg() ) /2;

        //Convert degrees to radians
        this.p = this.secondPoint.p.pointAtDistanceAndAngleDeg( this.length.value(), bisectingAngle );
        this.line = new GeoLine(this.secondPoint.p, this.p);

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g, drawOptions ) {
        //g is the svg group
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + this.data.length.htmlLength( asFormula ) 
                + " along line bisecting " + this.refOf( this.secondPoint ) 
                + "-" + this.refOf( this.firstPoint )
                + " and " + this.refOf( this.secondPoint ) 
                + "-" + this.refOf( this.thirdPoint );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.thirdPoint );
        dependencies.add( this, this.length );
    }    

}
