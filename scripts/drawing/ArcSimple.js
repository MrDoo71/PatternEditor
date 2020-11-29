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
        var d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.patternPiece.getObject(d.center);
        if (typeof this.angle1 === "undefined")
            this.angle1 = this.patternPiece.newFormula(d.angle1);
        if (typeof this.angle2 === "undefined")
            this.angle2 = this.patternPiece.newFormula(d.angle2);
        if (typeof this.radius === "undefined")
            this.radius = this.patternPiece.newFormula(d.radius);

        this.arc = new GeoArc( this.center.p, this.radius.value(), this.angle1.value(), this.angle2.value() );

        this.p = this.arc.pointAlongPathFraction( 0.5 );

        bounds.adjust( this.p );
        bounds.adjust( this.arc.pointAlongPathFraction( 0 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.25 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.5 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.75 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 1 ) );
    }


    pointAlongPath( length ) {
        return this.arc.pointAlongPath( length );
    }
    

    asShapeInfo() {
        return this.arc.asShapeInfo();
    }


    draw( g, isOutline ) {

        this.drawArc( g, isOutline );
        this.drawLabel(g, isOutline);
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
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
