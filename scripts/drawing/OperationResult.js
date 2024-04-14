class OperationResult extends DrawingObject {

    //basePoint
    //fromOperation

    constructor(data) {
        super(data);
        this.data.name = data.derivedName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.drawing.getObject(d.basePoint);

        if (typeof this.fromOperation === "undefined")
            this.fromOperation = this.drawing.getObject(d.fromOperation);

        //if this.basePoint is a point... (if a curve, this is the midpoint)
        if ( this.basePoint.p )
            this.p = this.fromOperation.applyOperationToPoint( this.basePoint.p );

        const operation = this.fromOperation;
        const applyOperationToPointFunc = function( p ) {
            return operation.applyOperationToPoint( p );
        };

        if ( this.basePoint.curve instanceof GeoSpline )
        {
            //so we get this captured and can just pass the function around
            this.curve = this.basePoint.curve.applyOperation( applyOperationToPointFunc );
        }

        //If the basePoint is a Point that is showing its construction line, then don't perform
        //the operation on that construction line.
        if ( ( this.basePoint instanceof Line ) && ( this.basePoint.line instanceof GeoLine ) ) //untested?
        {
            this.line = this.basePoint.line.applyOperation( applyOperationToPointFunc );
        }

        if (   ( this.basePoint.arc instanceof GeoArc ) //untested?
            || ( this.basePoint.arc instanceof GeoEllipticalArc ) )
        {
            this.arc = this.basePoint.arc.applyOperation( applyOperationToPointFunc );
        }

        //TODO This line would be useful if the operation, or operation result is selected. 
        //THOUGH, if the operation is a rotate then drawing an arc would be useful. 
        //this.operationLine = new GeoLine(this.basePoint.p, this.p);

        if (( this.line ) || ( this.curve ) || ( this.arc ))
        {
            if ( ! this.data.lineStyle )
                this.data.lineStyle = this.basePoint.data.lineStyle;

            if ( ! this.data.color )    
                this.data.color = this.basePoint.data.color;
        }

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust( this.p );
    }

    
    pointAlongPath( length ) {

        if ( this.arc )
            return this.arc.pointAlongPath( length );

        if ( this.curve )
            return this.curve.pointAlongPath( length );
            
        throw new Error( "pointAlongPath not implemented for this operation result. " );
    }


    getColor() {
        return this.basePoint.getColor();
    }

    
    getLineStyle() {
        return this.basePoint.getLineStyle();
    }


    draw( g, drawOptions ) {
        //g is the svg group

        //We might have operated on a point, spline (or presumably line)

        if (( this.p ) && ( ! this.curve ) && ( ! this.arc ))
            this.drawDot( g, drawOptions );

        if ( this.curve )
            this.drawCurve( g, drawOptions ); 

        if ( this.arc )
            this.drawArc( g, drawOptions );             

        if ( this.line )
            this.drawLine( g, drawOptions ); 
            
        if ( this.p )
            this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'Result of ' + this.refOf( this.fromOperation )
                + ' on ' + this.refOf( this.basePoint ); 
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.fromOperation );
    }    

}
