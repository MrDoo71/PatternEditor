class TrueDartResult extends DrawingObject {

    //fromOperation

    constructor(data) {
        super(data);
        this.name = this.data.name;
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.fromOperation === "undefined")
            this.fromOperation = this.patternPiece.getObject(d.fromOperation);

        if ( this.name === this.fromOperation.data.trueDartResult1 )
            this.p = this.fromOperation.td1;
        else
            this.p = this.fromOperation.td3;

            /*
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
        else if ( this.basePoint.line instanceof GeoLine ) //untested?
        {
            this.line = this.basePoint.line.applyOperation( applyOperationToPointFunc );
        }
        //TODO we might also have operated on an arc, circle, ellipse? Some might required a different approach that needs to be aligned with original behaviour

        //This line would be useful if the operation, or operation result is selected. 
        //this.operationLine = new GeoLine(this.basePoint.p, this.p);
        */

        bounds.adjust( this.p );
    }


    getColor() {
        return this.basePoint.getColor();
    }

    
    getLineStyle() {
        return this.basePoint.getLineStyle();
    }


    draw( g, isOutline ) {

        if ( this.p )
            this.drawDot( g, isOutline );

        //if ( this.line )
        //    this.drawLine( g, isOutline ); 
            
        if ( this.p )
            this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'Dart point from ' + this.refOf( this.fromOperation );
    }


    setDependencies( dependencies ) {
        //dependencies.add( this, this.basePoint );

        //TODO add a dependency on D1/D3 depeending on
        dependencies.add( this, this.fromOperation );
    }    

}
