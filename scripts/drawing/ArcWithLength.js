class ArcWithLength extends ArcSimple {

    //center
    //angle
    //length
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
            this.angle = this.patternPiece.newFormula(d.angle1);
        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);
        if (typeof this.radius === "undefined")
            this.radius = this.patternPiece.newFormula(d.radius);

        //circle-circ = 2 * pi * radius
        //fraction of circle = length / circle-cird
        //angle of arc  = length / circle-cird * 360
        //angle2 = angle + ( length / circle-cird * 360 )
        const endAngle = this.angle.value() + this.length.value() / (2 * Math.PI * this.radius.value() ) * 360;

        this.arc = new GeoArc( this.center.p, this.radius.value(), this.angle.value(), endAngle );

        this.p = this.arc.pointAlongPathFraction( 0.5 );

        this.adjustBounds( bounds );
    }

    
    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'arc with center ' + this.refOf( this.center )
                + " radius " + this.radius.htmlLength( asFormula ) 
                + " from angle " + this.angle.htmlAngle( asFormula ) 
                + " length " + this.length.htmlLength( asFormula );
    }

    
    setDependencies( dependencies ) {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle );
        dependencies.add( this, this.length );
        dependencies.add( this, this.radius );
    }    
}
