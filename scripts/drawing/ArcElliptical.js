class ArcElliptical extends DrawingObject {

    //center
    //angle1
    //angle2
    //radius1
    //radius2
    //rotationAngle

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
        if (typeof this.radius1 === "undefined")
            this.radius1 = this.drawing.newFormula(d.radius1);
        if (typeof this.radius2 === "undefined")
            this.radius2 = this.drawing.newFormula(d.radius2);
        if (typeof this.rotationAngle === "undefined")
            this.rotationAngle = this.drawing.newFormula(d.rotationAngle);

        this.arc = new GeoEllipticalArc( this.center.p, 
                                         this.radius1.value(),
                                         this.radius2.value(), 
                                         this.angle1.value(), 
                                         this.angle2.value(),
                                         this.rotationAngle.value() );
   
        this.p = this.arc.pointAlongPathFraction( 0.5 );

        this.adjustBounds( bounds );
    }

    
    adjustBounds( bounds )
    {
        bounds.adjust( this.p );
        this.arc.adjustBounds( bounds );
    }


    pointAlongPath( length )
    {
        return this.arc.pointAlongPath( length );
    }
    

    asShapeInfo()
    {
        return this.arc.asShapeInfo();
    }


    draw( g, drawOptions ) {
        this.drawArc( g, drawOptions );        
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'elliptical arc with center ' + this.refOf( this.center )
                + " radius-x " + this.radius1.htmlLength( asFormula ) 
                + " radius-y " + this.radius2.htmlLength( asFormula ) 
                + " from angle " + this.angle1.htmlAngle( asFormula ) 
                + " to " + this.angle2.htmlAngle( asFormula )
                + " rotation angle " + this.rotationAngle.htmlAngle( asFormula ) ;
    }

    
    setDependencies( dependencies ) {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle1 );
        dependencies.add( this, this.angle2 );
        dependencies.add( this, this.rotationAngle );
        dependencies.add( this, this.radius1 );
        dependencies.add( this, this.radius2 );
    }    
}
