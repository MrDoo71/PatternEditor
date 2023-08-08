class PerpendicularPointAlongLine extends DrawingObject {

    //basePoint
    //firstPoint
    //secondPoint

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.drawing.getObject(d.basePoint);
        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.p1Line1);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.p2Line1);

        var line = new GeoLine(this.firstPoint.p, this.secondPoint.p);
        
        var baseLine = new GeoLine( this.basePoint.p, this.basePoint.p.pointAtDistanceAndAngleDeg( 1, line.angleDeg() + 90 ) );

        this.p = line.intersect(baseLine);
        this.line = new GeoLine( this.basePoint.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {
        //g is the svg group
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'Point along line ' + this.refOf( this.firstPoint ) + ' - ' + this.refOf( this.secondPoint )
                + ' where it is perpendicular to ' + this.refOf( this.basePoint );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.basePoint );
    }    

}
