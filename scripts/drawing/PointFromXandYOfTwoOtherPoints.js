/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

class PointFromXandYOfTwoOtherPoints extends DrawingObject {

    //firstPoint
    //secondPoint

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);

        this.p = new GeoPoint( this.firstPoint.p.x, this.secondPoint.p.y );
        //this.line = new GeoLine(this.firstPoint.p, this.secondPoint.p);
        bounds.adjust(this.p);
    }


    draw(g) {
        //TODO check that there is no option to draw a line as part of this tool. 
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return 'line ' + '<span class="ps-name">' + this.firstPoint.data.name + '</span>' + " - " + '<span class="ps-name">' + this.secondPoint.data.name + '</span>';
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
    }    
}
