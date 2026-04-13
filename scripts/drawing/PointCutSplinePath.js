class PointCutSplinePath extends PointDrawingObject {

    //splinePath
    //length


    calculate(bounds) {
        const d = this.data;

        if ( this.curve === undefined )
            this.curve = this.drawing.getObject(d.splinePath);

        if ( this.length === undefined )
            this.length = this.drawing.newFormula(d.length);

        this.p = this.curve.pointAlongPath( this.length.value() );
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + this.data.length.htmlLength( asFormula ) 
                + " along path " + this.refOf( this.curve );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.curve );
        dependencies.add( this, this.length );
    }    

}
