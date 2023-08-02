class PointOfTriangle extends DrawingObject {

    //firstPoint
    //secondPoint
    //p1Line1
    //p2Line1

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.patternPiece.getObject(d.p1Line1);
        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.patternPiece.getObject(d.p2Line1);

            
        var axisLine = new GeoLine( this.p1Line1.p, this.p2Line1.p );    

        //otherLine is the hypotenous of the right angled triangle
        var otherLine = new GeoLine( this.firstPoint.p, this.secondPoint.p );

        //how long should we extend the axis line? 
        const l1 = new GeoLine( this.firstPoint.p, this.p1Line1.p );
        const l2 = new GeoLine( this.firstPoint.p, this.p2Line1.p );
        const l3 = new GeoLine( this.secondPoint.p, this.p1Line1.p );
        const l4 = new GeoLine( this.secondPoint.p, this.p2Line1.p );
        const maxDistance = Math.max( l1.length, l2.length, l3.length, l4.length ) + otherLine.length;

        //Now we work out another point along the axis line that forms the right angle triangle 
        //with the otherLine.
        //
        //The trick here is to observe that all these points, for any axisLine will form an arc
        //centered on the midpoint of otherLine with radiu of half length of otherLine

        var midpoint = this.firstPoint.p.pointAtDistanceAndAngleRad( otherLine.length/2, otherLine.angle );
        var arc = new GeoArc( midpoint, otherLine.length/2, 0, 360 );    

        var intersectionPoint = axisLine.intersect( otherLine );
        var extendedAxis;
        //if intersectionPoint is along the line, then we'll have to triangles to choose from
        
        if ( (new GeoLine( this.firstPoint.p, intersectionPoint )).length < otherLine.length )
            extendedAxis = new GeoLine( intersectionPoint, intersectionPoint.pointAtDistanceAndAngleRad( otherLine.length*2, axisLine.angle ) );
        else
            extendedAxis = new GeoLine( this.p1Line1.p, this.p1Line1.p.pointAtDistanceAndAngleRad( maxDistance, axisLine.angle ) );

        this.p = extendedAxis.intersectArc( arc );


        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + " Point along " + this.refOf( this.p1Line1 )
                + "-" + this.refOf( this.p2Line1 )
                + " that forms a right angle triangle with line  " + this.refOf( this.firstPoint )
                + "-" + this.refOf( this.secondPoint );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
    }    

}
