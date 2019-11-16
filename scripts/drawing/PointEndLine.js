/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        this.p = this.basePoint.p.pointAtDistanceAndAngle(this.length.value(), Math.PI * 2 * this.angle.value() / 360);
        this.line = new GeoLine(this.basePoint.p, this.p);
        bounds.adjustForLine(this.line);
    }


    draw(g) {
        //g is the svg group
        this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.value() + " from " + this.basePoint.data.name + " angle:" + this.data.angle.value();
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    

}
