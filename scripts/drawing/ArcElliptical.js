//define(function (require) {
//    require('./DrawingObject');
//    require('../geometry');
//});

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
        var d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.patternPiece.getObject(d.center);
        if (typeof this.angle1 === "undefined")
            this.angle1 = this.patternPiece.newFormula(d.angle1);
        if (typeof this.angle2 === "undefined")
            this.angle2 = this.patternPiece.newFormula(d.angle2);
        if (typeof this.radius1 === "undefined")
            this.radius1 = this.patternPiece.newFormula(d.radius1);
        if (typeof this.radius2 === "undefined")
            this.radius2 = this.patternPiece.newFormula(d.radius2);
        if (typeof this.rotationAngle === "undefined")
            this.rotationAngle = this.patternPiece.newFormula(d.rotationAngle);

        this.arc = new GeoEllipticalArc( this.center.p, 
                                         this.radius1.value(),
                                         this.radius2.value(), 
                                         this.angle1.value(), 
                                         this.angle2.value(),
                                         this.rotationAngle.value() );

        this.p = this.arc.pointAlongPathFraction( 0.5 );
        bounds.adjust( this.p );
        bounds.adjust( this.arc.pointAlongPathFraction( 0 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.25 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.5 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.75 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 1 ) );
    }


    pointAlongPath( length )
    {
        return this.arc.pointAlongPath( length );
    }
    

    asShapeInfo()
    {
        return this.arc.asShapeInfo();
    }


    draw(g) {
        var d = this.data;
        var p = g.append("path")
              .attr("d", this.arc.svgPath() )
              .attr("fill", "none")
              .attr("stroke-width", 1 / scale)
              .attr("stroke", this.getColor() );

        this.drawLabel(g, this);
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'elliptical arc with center ' + this.data.center.ref()
                + " radius-x " + this.data.radius1.html( asFormula ) 
                + " radius-y " + this.data.radius2.html( asFormula ) 
                + " from angle " + this.data.angle1.html( asFormula ) 
                + " to " + this.data.angle2.html( asFormula )
                + " rotation angle " + this.data.rotationAngle.html( asFormula ) ;
    }

    
    setDependencies( dependencies )
    {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle1 );
        dependencies.add( this, this.angle2 );
        dependencies.add( this, this.rotationAngle );
        dependencies.add( this, this.radius1 );
        dependencies.add( this, this.radius2 );
    }    
}
