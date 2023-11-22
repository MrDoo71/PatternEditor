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
        const d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.drawing.getObject(d.center);
        if (typeof this.angle1 === "undefined")
            this.angle = this.drawing.newFormula(d.angle1);
        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);
        if (typeof this.radius === "undefined")
            this.radius = this.drawing.newFormula(d.radius);

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
        return this.nameOf() + ': '
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
