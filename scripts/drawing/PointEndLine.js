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
            this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);
            
        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);

        //Convert degrees to radians
        this.p = this.basePoint.p.pointAtDistanceAndAngleDeg( this.length.value(), this.angle.value() );
        this.line = new GeoLine(this.basePoint.p, this.p);
        
        bounds.adjustForLine(this.line);
    }


    draw( g, isOutline ) {
        this.drawLine( g, isOutline );
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
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
