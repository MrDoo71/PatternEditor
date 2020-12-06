class OperationResult extends DrawingObject {

    //basePoint
    //fromOperation

    constructor(data) {
        super(data);
        this.data.name = data.derivedName;
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.fromOperation === "undefined")
            this.fromOperation = this.patternPiece.getObject(d.fromOperation);

        //if this.basePoint is a point... (if a curve, this is the midpoint)
        if ( this.basePoint.p )
            this.p = this.fromOperation.applyOperationToPoint( this.basePoint.p );

        var operation = this.fromOperation;
        var applyOperationToPointFunc = function( p ) {
            return operation.applyOperationToPoint( p );
        };

        //else if this.basePoint.curve is a GeoSpline...
        if ( this.basePoint.curve instanceof GeoSpline )
        {
            //so we get this captured and can just pass the function around
            this.curve = this.basePoint.curve.applyOperation( applyOperationToPointFunc );
        }

        if ( this.basePoint.line instanceof GeoLine ) //untested?
        {
            this.line = this.basePoint.line.applyOperation( applyOperationToPointFunc );
        }

        if (   ( this.basePoint.arc instanceof GeoArc ) //untested?
            || ( this.basePoint.arc instanceof GeoEllipticalArc ) )
        {
            this.arc = this.basePoint.arc.applyOperation( applyOperationToPointFunc );
        }

        //TODO This line would be useful if the operation, or operation result is selected. 
        //this.operationLine = new GeoLine(this.basePoint.p, this.p);

        bounds.adjust( this.p );
    }

    
    pointAlongPath( length ) {
        if ( this.arc )
            return this.arc.pointAlongPath( length );
        if ( this.curve )
            return this.curve.pointAlongPath( length );
            
        throw "pointAlongPath not implemented for this operation result. ";
    }


    getColor() {
        return this.basePoint.getColor();
    }

    
    getLineStyle() {
        return this.basePoint.getLineStyle();
    }


    draw( g, isOutline ) {
        //g is the svg group

        //We might have operated on a point, spline (or presumably line)

        if (( this.p ) && ( ! this.curve ) && ( ! this.arc ))
            this.drawDot( g, isOutline );

        if ( this.curve )
            this.drawCurve( g, isOutline ); 

        if ( this.arc )
            this.drawArc( g, isOutline );             

        if ( this.line )
            this.drawLine( g, isOutline ); 
            
        if ( this.p )
            this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'Result of ' + this.refOf( this.fromOperation )
                + ' on ' + this.refOf( this.basePoint ); 
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.fromOperation );
    }    

}
