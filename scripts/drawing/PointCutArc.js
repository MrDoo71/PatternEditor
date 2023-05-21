class PointCutArc extends DrawingObject {

    //arc
    //length

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        var d = this.data;

        if (typeof this.arc === "undefined")
            this.arc = this.patternPiece.getObject(d.arc);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);

        this.p = this.arc.pointAlongPath( this.length.value() );
        
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
                + " along arc " + this.refOf( this.arc );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.arc );
        dependencies.add( this, this.length );
    }    

}
