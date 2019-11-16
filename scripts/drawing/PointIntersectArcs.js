/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/


class PointIntersectArcs extends DrawingObject {

    //firstArc
    //secondArc
    //crossPoint

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        var d = this.data;

        if (typeof this.firstArc === "undefined")
            this.firstArc = this.patternPiece.getObject(d.firstArc);
            
        if (typeof this.secondArc === "undefined")
            this.secondArc = this.patternPiece.getObject(d.secondArc);

        //Also this.data.crossPoint    

        var arc1SI = this.firstArc.asShapeInfo();
        var arc2SI = this.secondArc.asShapeInfo();

        var intersections = Intersection.intersect(arc1SI, arc2SI);
        
        intersections.points.forEach(console.log);    
        
        if ( intersections.points.length === 1 )
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
            var p1 = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
            var p2 = new GeoPoint( intersections.points[1].x, intersections.points[1].y );
            var angle1 = (new GeoLine( this.firstArc.center.p, p1)).angle;
            var angle2 = (new GeoLine( this.firstArc.center.p, p2)).angle;

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

    draw(g) {
        //g is the svg group
        var d = this.data; //the original json data
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        //TODO use a better name for this.arc, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: intersect arcs ' + this.firstArc.data.name + " and " + this.secondArc.data.name
           + ( this.data.crossPoint === "One" ? "" : " - second point");
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstArc );
        dependencies.add( this, this.secondArc );
    }    

}
