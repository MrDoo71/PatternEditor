

class OperationResult extends DrawingObject {

    //basePoint
    //fromOperation

    constructor(data) {
        super(data);
        this.data.name = data.derivedName;
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.fromOperation === "undefined")
            this.fromOperation = this.patternPiece.getObject(d.fromOperation);

        //Convert degrees to radians
        this.p = this.fromOperation.applyOperationToPoint( this.basePoint );
        this.line = new GeoLine(this.basePoint.p, this.p);
        bounds.adjust( this.p );
    }


    draw(g) {
        //g is the svg group
        this.drawLine( g, this ); //TODO put an arrow head on this!
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: Operation result: ';
         //+ this.data.length.value() + 
           //             " from " + this.basePoint.data.name +
             //            " angle:" + this.data.angle.value() +
               //          " suffix:" + this.data.suffix;
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
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.fromOperation );
    }    

}
