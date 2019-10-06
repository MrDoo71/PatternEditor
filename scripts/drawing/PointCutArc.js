define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});

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
        
        bounds.adjust(this.p);
    }

    draw(g) {
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.html() + " along arc " + this.arc.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.arc );
        dependencies.add( this, this.length );
    }    

}
