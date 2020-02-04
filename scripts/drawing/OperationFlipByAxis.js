

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
        var d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.patternPiece.getObject(d.center);
    }


    draw(g) {
        //g is the svg group
        //this.drawLine( g, this ); //TODO put an arrow head on this!
        //this.drawDot( g, this );
        //this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: Flip operation: axis:' + this.axis + 
                        " around " + this.center.data.name +
                         //" angle:" + this.data.angle.value() +
                         " suffix:" + this.data.suffix;
    }


    applyOperationToPoint( source )
    {
        var result = new GeoPoint( source.p.x, source.p.y );

        if (    ( this.axis === "Vertical" ) 
             || ( this.axis === "vertical" )) //just in case.
            result.x = this.center.p.y - ( source.p.x - this.center.p.x );
        else
            result.y = this.center.p.y - ( source.p.y - this.center.p.y );

        //console.log("Axis:" + this.axis );
        //console.log( "Center y " + this.center.p.y );
        //console.log( "Source y " + source.p.y );
        //console.log( "Result y " + result.y );

        return result;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.center );
    }    

}
