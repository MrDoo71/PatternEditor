define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});

class SplineUsingControlPoints extends DrawingObject {

    //startPoint - the spline start
    //startControlPoint
    //endPoint - the spline end
    //endControlPoint

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.startPoint === "undefined")
            this.startPoint = this.patternPiece.getObject(d.point1);

        if (typeof this.startControlPoint === "undefined")
            this.startControlPoint = this.patternPiece.getObject(d.point2);

        if (typeof this.endControlPoint === "undefined")
            this.endControlPoint = this.patternPiece.getObject(d.point3);

        if (typeof this.endPoint === "undefined")
            this.endPoint = this.patternPiece.getObject(d.point4);

        this.curve = new GeoSpline( [ { point: this.startPoint.p, outControlPoint: this.startControlPoint.p },
                                      { inControlPoint: this.endControlPoint.p,  point: this.endPoint.p } ] );

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;

        bounds.adjust( this.startPoint );
        bounds.adjust( this.endPoint );
        bounds.adjust( this.midPoint ); 
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw(g) {
        var d = this.data;
        var p = g.append("path")
              .attr("d", this.curve.svgPath() )
              .attr("fill", "none")
              .attr("stroke-width", 1 / scale)
              .attr("stroke", this.getColor() );

        //Where should we draw the label? half way along the curve?
        //this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: spline from ' + this.startPoint.data.name + " using control point " + this.startControlPoint.data.name
            + " to " + this.endPoint.data.name + " using control point " + this.endControlPoint.data.name;
    }

    
    setDependencies( dependencies )
    {
        dependencies.add( this, this.startPoint );
        dependencies.add( this, this.startControlPoint );
        dependencies.add( this, this.endPoint );
        dependencies.add( this, this.endControlPoint );
    }    
}
