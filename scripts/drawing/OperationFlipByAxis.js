class OperationFlipByAxis extends DrawingObject {

    //operationName
    //suffix
    //center
    //axis

    constructor(data) {
        super(data);
        this.data.name = data.operationName;
        this.axis = data.axis;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.drawing.getObject(d.center);

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        //Done by OperationResult
    }


    draw( g, drawOptions ) {
        //g is the svg group
        //this.drawLine( g ); //TODO put an arrow head on this!
        //this.drawDot( g );
        //this.drawLabel( g );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'Flip ' + this.axis 
                + " around " + this.refOf( this.center ) 
                         //" angle:" + this.data.angle.value() +
                + " applying suffix '" + this.data.suffix + "'";
    }


    applyOperationToPoint( p ) {
        return this.flipPoint( p, this.center.p );
    }


    flipPoint( p, center ) {
        const result = new GeoPoint( p.x, p.y );

        if (    ( this.axis === "Vertical" ) 
             || ( this.axis === "vertical" )) //just in case.
            result.x = center.x - ( p.x - center.x );
        else
            result.y = center.y - ( p.y - center.y );

        return result;
    }

    
    setDependencies( dependencies ) {
        dependencies.add( this, this.center );
    }    

}
