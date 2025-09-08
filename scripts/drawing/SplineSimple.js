
class SplineSimple extends DrawingObject {

    //startPoint - the spline start
    //endPoint - the spline end
    //angle1
    //angle2 
    //length1
    //length2

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        const d = this.data;

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

        this.controlPoint1 = this.startPoint.p.pointAtDistanceAndAngleDeg( this.length1.value(), this.angle1.value() );
        this.controlPoint2 = this.endPoint.p.pointAtDistanceAndAngleDeg( this.length2.value(), this.angle2.value() );

        this.setCurve();

        this.original = { controlPoint1 : { ...this.controlPoint1 }, 
                          controlPoint2 : { ...this.controlPoint2 } };        

        //this.curve = new GeoSpline( [ { inAngle: undefined, inLength: undefined, point: this.startPoint.p, outAngle: this.angle1.value(), outLength: this.length1.value() },
        //                               { inAngle: this.angle2.value(), inLength: this.length2.value(), point: this.endPoint.p, outAngle: undefined, outLength: undefined } ] );

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;

        this.adjustBounds( bounds );
    }


    setCurve()
    {
        this.curve = new GeoSpline( [ { point: this.startPoint.p, outControlPoint: this.controlPoint1 },
                                      { inControlPoint: this.controlPoint2,  point: this.endPoint.p } ] );
    }


    adjustBounds( bounds )
    {
        this.curve.adjustBounds( bounds );
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw( g, drawOptions ) 
    { 
        if ( this.lineVisible() )
            this.drawPath( g, this.curve.svgPath(), drawOptions );

        this.drawLabel( g, drawOptions );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        return this.nameOf() + ': '
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


    revert()
    {
        this.controlPoint1 = { ...this.original.controlPoint1 };
        this.controlPoint2 = { ...this.original.controlPoint2 };
        this.setCurve();
    }


    getControlPoints() 
    {
        const controlPoints = [];
        controlPoints.push( { //seq: 0, 
            obj: this, bp: this.startPoint.p, cp: this.controlPoint1 } );
        controlPoints.push( { //seq: 1, 
            obj: this, bp: this.endPoint.p, cp: this.controlPoint2 } );
        return controlPoints;
    }


    getControlPointDataForUpdate() 
    {
        //calculate length and angle of the modified control points
        const line1 = new GeoLine( this.startPoint.p, this.controlPoint1 );
        const line2 = new GeoLine( this.endPoint.p, this.controlPoint2 );
        
        const data = {
            ControlPoints: [ 
                {
                    //Sequence: 1, 
                    outAngle: Number( line1.angleDeg().toPrecision(8) ),
                    outLength: Number( line1.getLength().toPrecision(8) ) 
                },
                {
                    //Sequence: 2,
                    inAngle: Number( line2.angleDeg().toPrecision(8) ),
                    inLength: Number( line2.getLength().toPrecision(8) ) 
                }
            ]
        }
        return data;
    }        
}
