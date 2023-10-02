class PointCutSplinePath extends DrawingObject {

    //splinePath
    //length

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.curve === "undefined")
            this.curve = this.drawing.getObject(d.splinePath);

        if (typeof this.length === "undefined")
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
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + this.data.length.htmlLength( asFormula ) 
                + " along path " + this.refOf( this.curve );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.curve );
        dependencies.add( this, this.length );
    }    

}
