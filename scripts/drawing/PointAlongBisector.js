/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

class PointAlongBisector extends DrawingObject {

    //firstPoint
    //secondPoint
    //thirdPoint
    //length

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);
        if (typeof this.thirdPoint === "undefined")
            this.thirdPoint = this.patternPiece.getObject(d.thirdPoint);
        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);
            
        var line1 = new GeoLine( this.secondPoint.p, this.firstPoint.p );    
        var line2 = new GeoLine( this.secondPoint.p, this.thirdPoint.p );    

        //TODO test what happens when this crosses the equator! i.e. one point is just below the equator and one just above (and in either direction)
        var bisectingAngle = ( line1.angleDeg() + line2.angleDeg() ) /2;

        //Convert degrees to radians
        this.p = this.secondPoint.p.pointAtDistanceAndAngle( this.length.value(), Math.PI * 2 * bisectingAngle / 360 );
        this.line = new GeoLine(this.secondPoint.p, this.p);
        bounds.adjustForLine(this.line);
    }


    draw(g) {
        //g is the svg group
        this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.value() + " along line bisecting " 
             + this.secondPoint.data.name + "-" + this.firstPoint.data.name + " and " + this.secondPoint.data.name + "-" + this.thirdPoint.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.thirdPoint );
        dependencies.add( this, this.length );
    }    

}
