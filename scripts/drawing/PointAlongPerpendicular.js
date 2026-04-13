class PointAlongPerpendicular extends PointDrawingObject {

    //firstPoint
    //secondPoint
    //length
    //angle


    calculate(bounds) {
        const d = this.data;

        if ( this.firstPoint === undefined )
            this.firstPoint = this.drawing.getObject(d.firstPoint);
        if ( this.secondPoint === undefined )
            this.secondPoint = this.drawing.getObject(d.secondPoint);
        if ( this.length === undefined )
            this.length = this.drawing.newFormula(d.length);
        if ( this.angle === undefined )
            this.angle = this.drawing.newFormula(d.angle);
            
        const baseLine = new GeoLine( this.firstPoint.p, this.secondPoint.p );    
        const totalAngle = this.angle.value() + 90 + baseLine.angleDeg();
        //Convert degrees to radians
        this.p = this.firstPoint.p.pointAtDistanceAndAngleDeg( this.length.value(), totalAngle );
        this.line = new GeoLine(this.firstPoint.p, this.p);
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g , drawOptions ) {
        //g is the svg group
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        let h = this.nameOf() + ': '
                + this.data.length.htmlLength( asFormula ) 
                + " from " + this.refOf( this.firstPoint ) 
                + " perpendicular to the line to " + this.refOf( this.secondPoint );

        if (    ( this.data.angle.constant )
             && ( this.data.angle.constant != 0 ) )
            h += " additional angle " + this.data.angle.htmlAngle( asFormula );

        return h;
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    


	//Return [ a, b ] where a and b are the names of the drawing objects at either end of the line
	//This is used when suggesting possible intersection points. 
	getLinePointsNames()
	{
		return [ this.firstPoint.data.name, this.data.name ];
	}    
}
