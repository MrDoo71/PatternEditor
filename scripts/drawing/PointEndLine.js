class PointEndLine extends DrawingObject {

    //basePoint
    //length
    //angle

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.drawing.getObject(d.basePoint);

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);
            
        if (typeof this.angle === "undefined")
            this.angle = this.drawing.newFormula(d.angle);

        this.p = this.basePoint.p.pointAtDistanceAndAngleDeg( this.length.value(), this.angle.value() );
        this.line = new GeoLine(this.basePoint.p, this.p);
        
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
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + this.data.length.htmlLength( asFormula ) 
                + " from " + this.refOf( this.basePoint ) 
                + " angle " + this.data.angle.htmlAngle( asFormula );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    

}
