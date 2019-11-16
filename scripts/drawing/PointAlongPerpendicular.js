/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);
        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);
        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);
            
        var baseLine = new GeoLine( this.firstPoint.p, this.secondPoint.p );    
        var totalAngle = this.angle.value() + 90 + baseLine.angleDeg();
        //Convert degrees to radians
        this.p = this.firstPoint.p.pointAtDistanceAndAngle( this.length.value(), Math.PI * 2 * totalAngle / 360 );
        this.line = new GeoLine(this.firstPoint.p, this.p);
        bounds.adjustForLine(this.line);
    }


    draw(g) {
        //g is the svg group
        this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.value() + " from " + this.firstPoint.data.name + " perpendicular to the line to " + this.secondPoint.data.name + " additional angle:" + this.data.angle.value();
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    

}
