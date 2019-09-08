class Line extends DrawingObject {

    //firstPoint
    //secondPoint

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);

        this.line = new GeoLine(this.firstPoint.p, this.secondPoint.p);
        bounds.adjustForLine(this.line);
    }


    draw(g) {
        var d = this.data;
        g.append("line")
            .attr("x1", this.line.p1.x)
            .attr("y1", this.line.p1.y)
            .attr("x2", this.line.p2.x)
            .attr("y2", this.line.p2.y)
            .attr("stroke-width", 1 / scale)
            .attr("stroke", this.getColor() );
        //TODO we could display the derived name Line_A1_A2 at the mid-point along the line?       

        //TODO for all lines we could draw a thicker invisible line do make it easier to click on the line.
    }


    html() {
        return 'line ' + '<span class="ps-name">' + this.firstPoint.data.name + '</span>' + " - " + '<span class="ps-name">' + this.secondPoint.data.name + '</span>';
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
    }    
}
