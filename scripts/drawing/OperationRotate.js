

class OperationRotate extends DrawingObject {

    //operationName
    //suffix
    //angle
    //center

    constructor(data) {
        super(data);
        this.data.name = data.operationName;
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.patternPiece.getObject(d.center);
            
        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);            
    }


    draw(g) {
        //g is the svg group
        //this.drawLine( g, this ); //TODO put an arrow head on this!
        //this.drawDot( g, this );
        //this.drawLabel( g, this );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'Move rotate: ' 
                + " center: " + this.center.ref() 
                + " angle:" + this.data.angle.html( asFormula ) 
                + " suffix:" + this.data.suffix;
    }


    applyOperationToPoint( p )
    {
        return p.rotate( this.center.p, this.angle.value() );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle );
    }    

}
