class PointAlongLine extends DrawingObject {
    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);

        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);

        this.baseLine = new GeoLine(this.firstPoint.p, this.secondPoint.p);
        this.p = this.firstPoint.p.pointAtDistanceAndAngle(this.length.value(this.baseLine.length), this.baseLine.angle);
        this.line = new GeoLine(this.firstPoint.p, this.p);
        
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
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }
    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.html() + " along line from " + this.firstPoint.data.name + " to " + this.secondPoint.data.name;
    }
}
