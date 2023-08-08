class PointShoulder extends DrawingObject {

    //pShoulder
    //p1Line1
    //p2Line1

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.shoulderPoint === "undefined")
            this.shoulderPoint = this.drawing.getObject(d.shoulderPoint);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.drawing.getObject(d.p1Line1);

        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.drawing.getObject(d.p2Line1);

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);

        //Find the point that is length away from the shoulderPoint along
        //the line p1Line1-p2line1.
            
        var axisLine = new GeoLine( this.p1Line1.p, this.p2Line1.p );    
        var arc = new GeoArc( this.shoulderPoint.p, this.length.value(), 0, 360  );      
        var offset = new GeoLine( this.shoulderPoint.p, this.p1Line1.p );
        var extendedAxisLength = this.length.value() + offset.length;
        var extendedAxis = new GeoLine( this.p1Line1.p, this.p1Line1.p.pointAtDistanceAndAngleRad( extendedAxisLength, axisLine.angle ) );

        try {
            this.p = extendedAxis.intersectArc( arc );
        } catch (e) {
            //Maybe the axisLine is going in the wrong direction, and therefore extending it's length didn't help.
            //Try reversing axisLine...
            var axisLine = new GeoLine( this.p2Line1.p, this.p1Line1.p );    
            var arc = new GeoArc( this.shoulderPoint.p, this.length.value(), 0, 360  );      
            var offset = new GeoLine( this.shoulderPoint.p, this.p2Line1.p );
            var extendedAxisLength = this.length.value() + offset.length;
            var extendedAxis = new GeoLine( this.p2Line1.p, this.p2Line1.p.pointAtDistanceAndAngleRad( extendedAxisLength, axisLine.angle ) );
            this.p = extendedAxis.intersectArc( arc );    
        }

        this.line = new GeoLine( this.shoulderPoint.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
            + " Point along " + this.refOf( this.p1Line1 ) 
            + "-" + this.refOf( this.p2Line1 )
            + " being " + this.length.htmlLength( asFormula ) 
            + " from " + this.refOf( this.shoulderPoint );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.shoulderPoint );
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
        dependencies.add( this, this.length );
    }    

}
