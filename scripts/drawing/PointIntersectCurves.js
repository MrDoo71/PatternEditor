class PointIntersectCurves extends DrawingObject {

    //curve1
    //curve2
    //verticalCrossPoint
    //horizontalCrossPoint

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.curve1 === "undefined")
            this.curve1 = this.drawing.getObject(d.curve1);
            
        if (typeof this.curve2 === "undefined")
            this.curve2 = this.drawing.getObject(d.curve2);

        const curve1SI = this.curve1.asShapeInfo();
        const curve2SI = this.curve2.asShapeInfo();

        const intersections = Intersection.intersect(curve1SI, curve2SI);
        
        if ( intersections.points.length === 0 )
        {
            this.p = new GeoPoint(0,0);
            throw new Error( "No intersections found. " );
        }        
        else if ( intersections.points.length === 1 )
        {
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        else if ( intersections.points.length > 1 )    
        {
            //Vertical correction has first dibs. verticalCrossPoint=="One" means highest point; horizontalCrossPoint=="One" means leftmost point
            let minXPnt, maxXPnt, minYPnt, maxYPnt;
            let selectedPoint;
            for ( const intersect of intersections.points )
            {
                if (( ! minXPnt ) || ( intersect.x < minXPnt.x ))
                    minXPnt = intersect;
                if (( ! maxXPnt ) || ( intersect.x > maxXPnt.x ))
                    maxXPnt = intersect;
                if (( ! minYPnt ) || ( intersect.y < minYPnt.y ))
                    minYPnt = intersect;
                if (( ! maxYPnt ) || ( intersect.y > maxYPnt.y ))
                    maxYPnt = intersect;
            }
            if ( minYPnt !== maxYPnt )
            {
                if ( this.data.verticalCrossPoint === "One" )
                    selectedPoint = minYPnt;
                else
                    selectedPoint = maxYPnt;
            }
            else
            {
                if ( this.data.horizontalCrossPoint === "One" )
                    selectedPoint = minXPnt;
                else
                    selectedPoint = maxXPnt;
            }
            this.p = new GeoPoint( selectedPoint.x, selectedPoint.y );
        }

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, drawOptions ) {
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        //TODO use a better name for this.curve, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'intersect curve ' + this.refOf( this.curve1 ) 
                + " with " + this.refOf( this.curve2 );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.curve1 );
        dependencies.add( this, this.curve2 );
    }    

}
