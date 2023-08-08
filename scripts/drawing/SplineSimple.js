/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

class SplineSimple extends DrawingObject {

    //startPoint - the spline start
    //endPoint - the spline end
    //angle1
    //angle2 
    //length1
    //length2

    constructor(data) {
        super(data);

        //TODO output a useful spline ID
        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.startPoint === "undefined")
            this.startPoint = this.drawing.getObject(d.point1);

        if (typeof this.endPoint === "undefined")
            this.endPoint = this.drawing.getObject(d.point4);

        if (typeof this.angle1 === "undefined")
            this.angle1 = this.drawing.newFormula(d.angle1);

        if (typeof this.angle2 === "undefined")
            this.angle2 = this.drawing.newFormula(d.angle2);

        if (typeof this.length1 === "undefined")
            this.length1 = this.drawing.newFormula(d.length1);

        if (typeof this.length2 === "undefined")
            this.length2 = this.drawing.newFormula(d.length2);

        this.curve = new GeoSpline( [ { inAngle: undefined, inLength: undefined, point: this.startPoint.p, outAngle: this.angle1.value(), outLength: this.length1.value() },
                                       { inAngle: this.angle2.value(), inLength: this.length2.value(), point: this.endPoint.p, outAngle: undefined, outLength: undefined } ] );

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        this.curve.adjustBounds( bounds );
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw( g, drawOptions ) {
        
        if ( this.lineVisible() )
            this.drawPath( g, this.curve.svgPath(), drawOptions );

        this.drawLabel( g, drawOptions );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'spline from ' + this.refOf( this.startPoint ) 
                + " angle " + this.angle1.htmlAngle( asFormula ) 
                + " length " + this.length1.htmlLength( asFormula )
            + " to " + this.refOf( this.endPoint ) 
            + " angle " + this.angle2.htmlAngle( asFormula ) 
            + " length " + this.length2.htmlLength( asFormula );
    }

    
    setDependencies( dependencies )
    {
        dependencies.add( this, this.startPoint );
        dependencies.add( this, this.endPoint );
        dependencies.add( this, this.angle1 );
        dependencies.add( this, this.angle2 );
        dependencies.add( this, this.length1 );
        dependencies.add( this, this.length2 );
    }    
}
