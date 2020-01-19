

class OperationRotate extends DrawingObject {

    //operationName
    //suffix
    //angle
    //center

    constructor(data) {
        super(data);
        this.data.name = data.operationName;
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.patternPiece.getObject(d.center);
            
        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);            
    }


    draw(g) {
        //g is the svg group
        //this.drawLine( g, this ); //TODO put an arrow head on this!
        //this.drawDot( g, this );
        //this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: Move rotate: ' +
                         " center: " + this.center.data.name +
                         " angle:" + this.data.angle.value() +
                         " suffix:" + this.data.suffix;
    }


    applyOperationToPoint( source )
    {
        //Convert degrees to radians
        
        var centerToSourceLine = new GeoLine( this.center.p, source.p );
        var distance = centerToSourceLine.getLength();
        var angle =  ( Math.PI * 2 * ( centerToSourceLine.angleDeg() + this.angle.value() ) / 360 );

        var result = this.center.p.pointAtDistanceAndAngle( distance, angle );
        //var line = new GeoLine( source.p, result.p );
        return result;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle );
    }    

}
