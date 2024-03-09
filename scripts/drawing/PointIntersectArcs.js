class PointIntersectArcs extends DrawingObject {

    //firstArc
    //secondArc
    //crossPoint

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstArc === "undefined")
            this.firstArc = this.drawing.getObject(d.firstArc);
            
        if (typeof this.secondArc === "undefined")
            this.secondArc = this.drawing.getObject(d.secondArc);

        const arc1SI = this.firstArc.asShapeInfo();
        const arc2SI = this.secondArc.asShapeInfo();

        const intersections = Intersection.intersect(arc1SI, arc2SI);

        if ( intersections.points.length === 0 )
        {
            throw new Error( "No intersections found. " );
        }
        else if ( intersections.points.length === 1 )
        {
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        else
        {
            //TODO A5 in the test should be (0,0) as the point of intersection is not during the specified angle of the arcs.
            //For each intersection point
            //TODO check that GeoLine( this.firstArc.center.p, p1)).angleDeg() between this.firstArc.arc.angle1 and this.firstArc.arc.angle2
            //and similar for secondArc

            //What is the angle in the first arc of the intersection point?
            //One = smallest angle in the first arc.
            //Two = largest angle in the first arc.
            const p1 = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
            const p2 = new GeoPoint( intersections.points[1].x, intersections.points[1].y );
            const angle1 = (new GeoLine( this.firstArc.center.p, p1)).angle;
            const angle2 = (new GeoLine( this.firstArc.center.p, p2)).angle;

            if ( this.data.crossPoint === "One" )
            {
                if ( angle1 < angle2 )
                    this.p = p1;
                else
                    this.p = p2;
            }            
            else 
            {
                if ( angle1 < angle2 )
                    this.p = p2;
                else
                    this.p = p1;
            }
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
        return this.nameOf() + ': '
                + 'intersect arcs ' + this.refOf( this.firstArc )
                + " and " + this.refOf( this.secondArc )
                + ( this.data.crossPoint === "One" ? "" : " - second point");
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstArc );
        dependencies.add( this, this.secondArc );
    }    

}
