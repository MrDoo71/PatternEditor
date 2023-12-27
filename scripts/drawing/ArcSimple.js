class ArcSimple extends DrawingObject {

    //center
    //angle1
    //angle2
    //radius 

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = data.derivedName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.drawing.getObject(d.center);
        if (typeof this.angle1 === "undefined")
            this.angle1 = this.drawing.newFormula(d.angle1);
        if (typeof this.angle2 === "undefined")
            this.angle2 = this.drawing.newFormula(d.angle2);
        if (typeof this.radius === "undefined")
            this.radius = this.drawing.newFormula(d.radius);

        this.arc = new GeoArc( this.center.p, this.radius.value(), this.angle1.value(), this.angle2.value() );

        this.p = this.arc.pointAlongPathFraction( 0.5 );

        this.adjustBounds( bounds );
    }

    
    adjustBounds( bounds )
    {
        bounds.adjust( this.p ); //not necessarily

        if ( this.arc )
            this.arc.adjustBounds( bounds );
    }


    pointAlongPath( length ) {
        return this.arc.pointAlongPath( length );
    }
    

    asShapeInfo() {
        return this.arc.asShapeInfo();
    }


    draw( g, drawOptions ) {

        this.drawArc( g, drawOptions );
        //this.drawLabel(g, drawOptions ); Only do the label if the line style!=none
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'arc with center ' + this.refOf( this.center )
                + " radius " + this.radius.htmlLength( asFormula ) 
                + " from angle " + this.angle1.htmlAngle( asFormula ) 
                + " to " + this.angle2.htmlAngle( asFormula );
    }

    
    setDependencies( dependencies ) {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle1 );
        dependencies.add( this, this.angle2 );
        dependencies.add( this, this.radius );
    }    
}
