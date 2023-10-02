class PointIntersectArcAndLine extends DrawingObject {

    //firstPoint
    //secondPoint
    //center
    //radius

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.firstPoint);
            
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.secondPoint);

        if (typeof this.center === "undefined")
            this.center = this.drawing.getObject(d.center);

        if (typeof this.radius === "undefined")
            this.radius = this.drawing.newFormula(d.radius);

        const line = new GeoLine( this.firstPoint.p, this.secondPoint.p );
        const arc  = new GeoArc( this.center.p, this.radius.value(), 0, 360 );

        this.p = line.intersectArc( arc );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {

        //TODO draw the line between basePoint and p
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + 'intersect arc with center ' 
                + this.refOf( this.center ) 
                + ", radius " + this.radius.htmlLength( asFormula ) 
                +  " with line " + this.refOf( this.firstPoint ) 
                + "-" + this.refOf( this.secondPoint );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.center );
        dependencies.add( this, this.radius );
    }    

}
