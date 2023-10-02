class OperationFlipByLine extends DrawingObject {

    //operationName
    //suffix
    //p1Line1
    //p2Line1
  

    constructor(data) {
        super(data);
        this.data.name = data.operationName;
        this.axis = data.axis;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.drawing.getObject(d.p1Line1);

        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.drawing.getObject(d.p2Line1);

        this.line = new GeoLine( this.p1Line1.p, this.p2Line1.p );

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

        this.drawLine( g, drawOptions );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + 'Flip over line ' + this.refOf( this.p1Line1 ) 
                + "-" + this.refOf( this.p2Line1 ) 
                + " applying suffix '" + this.data.suffix + "'";
    }


    applyOperationToPoint( p ) {

        return this.flipPoint( p, this.line );
    }


    flipPoint( p, line ) {
        
        //image the point of view rotated such that this.line is on the x-axis at 0deg. 
        //if the line is at 45deg, rotate the line and the source point by -45 deg. flip the y component, then rotate back by +45. 

        const p0 = p.rotate( this.line.p1, -this.line.angleDeg() );

        const p0f = new GeoPoint( p0.x, this.line.p1.y - ( p0.y - this.line.p1.y ) );

        const result = p0f.rotate( this.line.p1, this.line.angleDeg() );

        return result;
    }

    
    setDependencies( dependencies ) {
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
    }    

}
