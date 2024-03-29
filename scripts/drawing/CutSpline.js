class CutSpline extends DrawingObject { //TODO for consistency should be PointCutSpline ???

    //curve
    //length

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.curve === "undefined")
            this.curve = this.drawing.getObject(d.spline);

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);

        //Note tha this.curve might be something like a SplineSimple, but it might also be an OperationResult
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
                + " along curve " + this.refOf( this.curve );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.curve );
        dependencies.add( this, this.length );
    }    

}
