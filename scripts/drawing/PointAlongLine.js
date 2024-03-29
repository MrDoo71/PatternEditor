class PointAlongLine extends DrawingObject {

    //firstPoint
    //secondPoint
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

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);

        this.baseLine = new GeoLine(this.firstPoint.p, this.secondPoint.p);
        this.p = this.firstPoint.p.pointAtDistanceAndAngleRad(this.length.value(this.baseLine.length), this.baseLine.angle);
        this.line = new GeoLine(this.firstPoint.p, this.p);
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g, drawOptions ) {
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        
        return this.nameOf() + ': '
                + this.data.length.htmlLength( asFormula, this.baseLine? this.baseLine.length : 0 ) 
                + " along line from " + this.refOf( this.firstPoint )
                + " to " + this.refOf( this.secondPoint );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.length );
    }    

}
