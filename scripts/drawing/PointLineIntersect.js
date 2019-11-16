/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

class PointLineIntersect extends DrawingObject {

    //p1Line1
    //p2Line1
    //p1Line2
    //p2Line2

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.patternPiece.getObject(d.p1Line1);
        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.patternPiece.getObject(d.p2Line1);
        if (typeof this.p1Line2 === "undefined")
            this.p1Line2 = this.patternPiece.getObject(d.p1Line2);
        if (typeof this.p2Line2 === "undefined")
            this.p2Line2 = this.patternPiece.getObject(d.p2Line2);

        this.line1 = new GeoLine(this.p1Line1.p, this.p2Line1.p);
        this.line2 = new GeoLine(this.p1Line2.p, this.p2Line2.p);
        this.p = this.line1.intersect(this.line2);
        bounds.adjust(this.p);
    }


    draw(g) {
        //g is the svg group
        var d = this.data; //the original json data
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: intersect ' + this.p1Line1.data.name + "-" + this.p2Line1.data.name + " with " + this.p1Line2.data.name + "-" + this.p2Line2.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p1Line2 );
        dependencies.add( this, this.p2Line1 );
        dependencies.add( this, this.p2Line2 );
    }    


}
