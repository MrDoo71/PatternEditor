/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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

        this.p = this.curve.pointAlongPath( this.length.value() );
        
        bounds.adjust(this.p);
    }

    draw(g) {
        //this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.html() + " along curve " + this.curve.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.curve );
        dependencies.add( this, this.length );
    }    

}
