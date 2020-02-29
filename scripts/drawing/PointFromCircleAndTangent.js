class PointFromCircleAndTangent extends DrawingObject {

    //center
    //tangent
    //crossPoint
    //radius

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        var d = this.data;

        if (typeof this.tangent === "undefined")
            this.tangent = this.patternPiece.getObject(d.tangent);

        if (typeof this.arc === "undefined")
            this.center = this.patternPiece.getObject(d.center); 

        if (typeof this.radius === "undefined")
            this.radius = this.patternPiece.newFormula(d.radius);

        this.crossPoint = d.crossPoint;

        var circle = new GeoArc( this.center.p, this.radius.value(), 0, 360 );

        var tangentIntersections = circle.getPointsOfTangent( this.tangent.p );
        
        //TODO what is the real logic for crossPoint One vs Two
        if ( this.crossPoint === "One" ) 
            this.p = tangentIntersections[1];
        else 
            this.p = tangentIntersections[0];
            
        this.line = new GeoLine( this.tangent.p, this.p );

        bounds.adjust(this.p);
    }


    draw(g, isOutline) {
        this.drawLine(g, isOutline);
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + 'point on circle with center ' + this.center.ref() 
                + ' radius ' + this.radius.html( asFormula ) 
                + ' of tangent from point ' + this.tangent.ref()
                + ' crosspoint:' + this.crossPoint;
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.tangent );
        dependencies.add( this, this.center );
        dependencies.add( this, this.radius );
    }    

}
