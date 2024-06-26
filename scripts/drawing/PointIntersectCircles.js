class PointIntersectCircles extends DrawingObject {

    //center1     ??? Confirm
    //radiu1   ??? Confirm
    //center2   ??? Confirm
    //radius2  ??? Confirm
    //crossPoint    ??? Confirm

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.center1 === "undefined")
            this.center1 = this.drawing.getObject(d.center1);
            
        if (typeof this.center2 === "undefined")
            this.center2 = this.drawing.getObject(d.center2);

        if (typeof this.radius1 === "undefined")
            this.radius1 = this.drawing.newFormula(d.radius1);

        if (typeof this.radius2 === "undefined")
            this.radius2 = this.drawing.newFormula(d.radius2);

        //Also this.data.crossPoint    
        const circle1 = new GeoArc( this.center1.p, this.radius1.value(), 0, 360 );
        const circle2 = new GeoArc( this.center2.p, this.radius2.value(), 0, 360 );

        const arc1SI = circle1.asShapeInfo();
        const arc2SI = circle2.asShapeInfo();

        let intersections = Intersection.intersect(arc1SI, arc2SI);

        const myIntersections = circle1.intersect( circle2 );

        //This is just a conservative switchover to our own intersection code. 
        //Need to test more widely for first and second intersection points. 
        if (( intersections.points.length === 0 ) && ( myIntersections.length !== 0 ))
        {
            intersections = { status: "Intersection", points: myIntersections };
            console.log( "Using alternative intersect method.");
        }        
        
        if ( intersections.points.length === 0 )
        {
            throw new Error( "No intersections found. " );
        }
        else if ( intersections.points.length === 1 )
        {
            //surely there must always be two intersects, unless they just touch
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        else
        {
            /* we do not know what logic valentina/seamly uses

            the smallest angle, except that if angle1 beween 270 and 360 and angle2 between 0 and 90 then add 360 to angle2. */

            //NB: this is a subset of the logic that applies to PointIntersectArcs.
            //What is the angle in the first arc of the intersection point?
            //One = smallest angle in the first arc.
            //Two = largest angle in the first arc.
            const p1 = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
            const p2 = new GeoPoint( intersections.points[1].x, intersections.points[1].y );
            let angle1 = (new GeoLine( circle1.center, p1)).angleDeg();
            let angle2 = (new GeoLine( circle1.center, p2)).angleDeg();
            if (( angle1 >= 270 ) && ( angle2 > 0 ) && ( angle2 < 90 ))
                angle2 += 360;
            else if (( angle2 >= 270 ) && ( angle1 > 0 ) && ( angle1 < 90 ))
                angle1 += 360;

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
                + 'intersect circles ' + this.refOf( this.center1 ) 
                + " radius " + this.radius1.htmlAngle( asFormula ) 
                + " and " + this.refOf( this.center2 ) 
                + " radius " + this.radius2.htmlLength( asFormula )
                + ( this.data.crossPoint === "One" ? "" : " - second point");
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.center1 );
        dependencies.add( this, this.center2 );
        dependencies.add( this, this.radius1 );
        dependencies.add( this, this.radius2 );
    }    

}
