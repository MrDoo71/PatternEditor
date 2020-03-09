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
        var d = this.data;

        if (typeof this.center1 === "undefined")
            this.center1 = this.patternPiece.getObject(d.center1);
            
        if (typeof this.center2 === "undefined")
            this.center2 = this.patternPiece.getObject(d.center2);

        if (typeof this.radius1 === "undefined")
            this.radius1 = this.patternPiece.newFormula(d.radius1);

        if (typeof this.radius2 === "undefined")
            this.radius2 = this.patternPiece.newFormula(d.radius2);

        //Also this.data.crossPoint    
        var circle1 = new GeoArc( this.center1.p, this.radius1.value(), 0, 360 );
        var circle2 = new GeoArc( this.center2.p, this.radius2.value(), 0, 360 );

        var arc1SI = circle1.asShapeInfo();
        var arc2SI = circle2.asShapeInfo();

        var intersections = Intersection.intersect(arc1SI, arc2SI);
        
        //intersections.points.forEach(console.log);    
        
        if ( intersections.points.length === 0 )
        {
            throw "No intersections found. ";
        }
        else if ( intersections.points.length === 1 )
        {
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        else
        {
            //NB: this is a subset of the logic that applies to PointIntersectArcs.
            //What is the angle in the first arc of the intersection point?
            //One = smallest angle in the first arc.
            //Two = largest angle in the first arc.
            var p1 = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
            var p2 = new GeoPoint( intersections.points[1].x, intersections.points[1].y );
            var angle1 = (new GeoLine( circle1.center, p1)).angle;
            var angle2 = (new GeoLine( circle1.center, p2)).angle;

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

        bounds.adjust(this.p);
    }


    draw(g, isOutline) {
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
    }


    html( asFormula ) {
        //TODO use a better name for this.arc, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'intersect circles ' + this.center1.ref() 
                + " radius " + this.radius1.html( asFormula ) 
                + " and " + this.center2.ref() 
                + " radius " + this.radius2.html( asFormula )
                + ( this.data.crossPoint === "One" ? "" : " - second point");
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.center1 );
        dependencies.add( this, this.center2 );
        dependencies.add( this, this.radius1 );
        dependencies.add( this, this.radius2 );
    }    

}
