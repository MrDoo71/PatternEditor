class OperationMove extends DrawingObject {

    //operationName
    //suffix
    //angle
    //length

    constructor(data) {
        super(data);
        this.data.name = data.operationName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);
            
        if (typeof this.angle === "undefined")
            this.angle = this.drawing.newFormula(d.angle);
            
        //Convert degrees to radians
        //this.p = this.basePoint.p.pointAtDistanceAndAngleRad(this.length.value(), Math.PI * 2 * this.angle.value() / 360);
        //this.line = new GeoLine(this.basePoint.p, this.p);
        //bounds.adjustForLine(this.line);
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        //Done by OperationResult
    }


    draw( g, drawOptions ) {
        //g is the svg group
        //this.drawLine( g ); //TODO put an arrow head on this!
        //this.drawDot( g );
        //this.drawLabel( g );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                    + 'Move ' + this.data.length.htmlLength( asFormula ) 
                    //" from " + this.basePoint.data.name +
                    + " at angle " + this.data.angle.htmlAngle( asFormula ) 
                    + " applying suffix '" + this.data.suffix + "'";
    }


    applyOperationToPoint( p ) {
        //Convert degrees to radians
        const result = p.pointAtDistanceAndAngleDeg( this.length.value(), this.angle.value() );
        //var line = new GeoLine( source.p, result.p );
        return result;
    }


    setDependencies( dependencies ) {
        //dependencies.add( this, this.basePoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    

}
