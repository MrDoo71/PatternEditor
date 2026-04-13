class PointFromCircleAndTangent extends PointDrawingObject {

    //center
    //tangent
    //crossPoint
    //radius

    calculate(bounds) {
        const d = this.data;

        if ( this.tangent === undefined )
            this.tangent = this.drawing.getObject(d.tangent);

        if ( this.arc ===  undefined )
            this.center = this.drawing.getObject(d.center); 

        if ( this.radius === undefined )
            this.radius = this.drawing.newFormula(d.radius);

        this.crossPoint = d.crossPoint;

        const circle = new GeoArc( this.center.p, this.radius.value(), 0, 360 );

        const tangentIntersections = circle.getPointsOfTangent( this.tangent.p );
        
        //TODO what is the real logic for crossPoint One vs Two
        if ( this.crossPoint === "One" ) 
            this.p = tangentIntersections[1];
        else 
            this.p = tangentIntersections[0];
            
        this.line = new GeoLine( this.tangent.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, drawOptions ) {
        this.drawLine(g, drawOptions );
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'point on circle with center ' + this.refOf( this.center ) 
                + ' radius ' + this.radius.htmlLength( asFormula ) 
                + ' of tangent from point ' + this.refOf( this.tangent )
                + ' crosspoint:' + this.crossPoint;
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.tangent );
        dependencies.add( this, this.center );
        dependencies.add( this, this.radius );
    }    

	getLinePointsNames()
	{
		return [ this.tangent.data.name, this.data.name ];
	}    

}
