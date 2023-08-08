class PointAlongPerpendicular extends DrawingObject {

    //firstPoint
    //secondPoint
    //length
    //angle

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.secondPoint);
        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);
        if (typeof this.angle === "undefined")
            this.angle = this.drawing.newFormula(d.angle);
            
        var baseLine = new GeoLine( this.firstPoint.p, this.secondPoint.p );    
        var totalAngle = this.angle.value() + 90 + baseLine.angleDeg();
        //Convert degrees to radians
        this.p = this.firstPoint.p.pointAtDistanceAndAngleDeg( this.length.value(), totalAngle );
        this.line = new GeoLine(this.firstPoint.p, this.p);
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g , drawOptions ) {
        //g is the svg group
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        var h = '<span class="ps-name">' + this.data.name + '</span>: ' 
                + this.data.length.htmlLength( asFormula ) 
                + " from " + this.refOf( this.firstPoint ) 
                + " perpendicular to the line to " + this.refOf( this.secondPoint );

        if (    ( this.data.angle.constant )
             && ( this.data.angle.constant != 0 ) )
            h += " additional angle " + this.data.angle.htmlAngle( asFormula );

        return h;
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    

}
