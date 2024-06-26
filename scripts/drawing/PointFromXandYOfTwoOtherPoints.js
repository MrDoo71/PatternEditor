class PointFromXandYOfTwoOtherPoints extends DrawingObject {

    //firstPoint
    //secondPoint

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.secondPoint);

        this.p = new GeoPoint( this.firstPoint.p.x, this.secondPoint.p.y );

        this.line1 = new GeoLine( this.firstPoint.p, this.p );
        this.line2 = new GeoLine( this.secondPoint.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    drawLine( g, drawingOptions ) 
    {
        if ( this.lineVisible() )
        {
            if ( this.line1 ) 
                this.drawALine( g, drawingOptions, this.line1 );

            if ( this.line2 ) 
                this.drawALine( g, drawingOptions, this.line2 );
        }
    }


    draw( g, drawOptions ) {
        //TODO check that there is no option to draw a line as part of this tool. 
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
               + ' point at X from ' + this.refOf( this.firstPoint ) +  " and Y from " + this.refOf( this.secondPoint );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
    }    
}
