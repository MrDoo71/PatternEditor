class PointFromArcAndTangent extends DrawingObject {

    //arc
    //tangent
    //crossPoint

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        var d = this.data;

        if (typeof this.tangent === "undefined")
            this.tangent = this.patternPiece.getObject(d.tangent);

        if (typeof this.arc === "undefined")
            this.arc = this.patternPiece.getObject(d.arc); 

        this.crossPoint = d.crossPoint;

        var tangentIntersections = this.arc.arc.getPointsOfTangent( this.tangent.p );
        
        //TODO what is the real logic for crossPoint One vs Two
        if ( this.crossPoint === "One" ) 
            this.p = tangentIntersections[1];
        else 
            this.p = tangentIntersections[0];
            
        this.line = new GeoLine( this.tangent.p, this.p );

        bounds.adjust(this.p);
    }


    draw(g) {
        //g is the svg group
        this.drawLine(g, this);
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + 'point on arc ' + this.arc.ref() //derivedName?
                + ' of tangent from point ' + this.tangent.ref()
                + ' crosspoint:' + this.crossPoint;
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.tangent );
        dependencies.add( this, this.arc );
    }    

}
