class PointIntersectCurveAndAxis extends PointDrawingObject {

    //basePoint
    //curve
    //angle

    calculate(bounds) {
        const d = this.data;

        if ( this.basePoint === undefined )
            this.basePoint = this.drawing.getObject(d.basePoint);

        if ( this.curve === undefined )
            this.curve = this.drawing.getObject(d.curve);

        if ( this.angle === undefined )
            this.angle = this.drawing.newFormula(d.angle);

        let angleDeg = this.angle.value();
        if ( angleDeg >= 360 )
            angleDeg -= 360;
        else if ( angleDeg < 0 )
            angleDeg += 360;


        //Rather than use an arbitrarily long line (which was causing issues)
        //calculate the max length of line. The line cannot be longer than
        //the bounding box encompassing the basePoint and the curve. 
        const tempBounds = new Bounds();
        tempBounds.adjust( this.basePoint.p );
        this.curve.adjustBounds( tempBounds );
        const maxLineLength = tempBounds.diagonaglLength() * 1.25;
        
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( maxLineLength, angleDeg );

        const line = new GeoLine( this.basePoint.p, otherPoint );

        const lineSI = line.asShapeInfo();
        const curveSI = this.curve.asShapeInfo();

        const intersections = Intersection.intersect(lineSI, curveSI);        

        if ( intersections.points.length === 0 )
        {
            throw new Error( "No intersections found. " );
        }
        else
        {
            //nb, there may be multiple intersect points, but we only use the first. 
            //2026 March - (closest)
            const from = this.basePoint.p;
            const closest = intersections.points.reduce((best, p) => {
            const dx = p.x - from.x, dy = p.y - from.y;
            const d = dx * dx + dy * dy;
            if (!best || d < best.d) {
                return { p: p, d: d };
            }
            return best;
            }, null);

            this.p = new GeoPoint( closest.p.x, closest.p.y );
            //this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        this.line = new GeoLine( this.basePoint.p, this.p );

        this.adjustBounds( bounds );
    }
    
        
    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }

    
    draw( g, drawOptions ) {
        //g is the svg group
        this.drawLine(g, drawOptions ); 
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'intersect curve ' + this.refOf( this.curve )
                + " with line from " + this.refOf( this.basePoint )
                + " at angle " + this.angle.htmlAngle( asFormula );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.curve );
        dependencies.add( this, this.angle );
    }    

}
