

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
        var d = this.data;

        //if (typeof this.basePoint === "undefined")
        //    this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);
            
        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);
            
        //Convert degrees to radians
        //this.p = this.basePoint.p.pointAtDistanceAndAngle(this.length.value(), Math.PI * 2 * this.angle.value() / 360);
        //this.line = new GeoLine(this.basePoint.p, this.p);
        //bounds.adjustForLine(this.line);
    }


    draw(g) {
        //g is the svg group
        //this.drawLine( g, this ); //TODO put an arrow head on this!
        //this.drawDot( g, this );
        //this.drawLabel( g, this );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                    + 'Move operation: ' + this.data.length.html( asFormula ) 
                    //" from " + this.basePoint.data.name +
                    + " angle:" + this.data.angle.html( asFormula ) 
                    + " suffix:" + this.data.suffix;
    }


    applyOperationToPoint( source )
    {
        //Convert degrees to radians
        var result = source.p.pointAtDistanceAndAngle(this.length.value(), Math.PI * 2 * this.angle.value() / 360);
        //var line = new GeoLine( source.p, result.p );
        return result;
    }


    setDependencies( dependencies )
    {
        //dependencies.add( this, this.basePoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    

}
