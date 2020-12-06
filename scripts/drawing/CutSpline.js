class CutSpline extends DrawingObject { //TODO for consistency should be PointCutSpline ???

    //curve
    //length

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.curve === "undefined")
            this.curve = this.patternPiece.getObject(d.spline);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);

        //Note tha this.curve might be something like a SplineSimple, but it might also be an OperationResult
        this.p = this.curve.pointAlongPath( this.length.value() );
        
        bounds.adjust(this.p);
    }


    draw( g, isOutline ) {
        //this.drawLine( g );
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + this.data.length.htmlLength( asFormula ) 
                + " along curve " + this.refOf( this.curve );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.curve );
        dependencies.add( this, this.length );
    }    

}
