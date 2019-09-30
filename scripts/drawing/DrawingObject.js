class DrawingObject /*abstract*/ {
    constructor(data) {
        this.data = data;
    }

    drawLabel(g, o) {
        //g - the svg group we want to add the text to
        //o - the drawing object
        var d = o.data; //the original json data
        if (typeof o.p.x !== "number")
            return;
        g.append("text")
            .attr("x", o.p.x + (typeof d.mx === "undefined" ? 0 : d.mx))
            .attr("y", o.p.y + (typeof d.my === "undefined" ? 0 : d.my))
            .text(d.name)
            .attr("font-size", (10 / scale) + "px");
    }

    drawDot(g, o) {
        var d = o.data; //the original json data
        g.attr("class", "j-point");
        g.append("circle")
            .attr("cx", o.p.x)
            .attr("cy", o.p.y)
            .attr("r", 4 / scale);
    }

    drawLine(g, o) {
        if ( this.lineVisible() )
            g.append("line")
                .attr("x1", this.line.p1.x)
                .attr("y1", this.line.p1.y)
                .attr("x2", this.line.p2.x)
                .attr("y2", this.line.p2.y)
                .attr("stroke-width", 1 / scale)
                .attr("stroke", this.getColor() );
    }

    getColor() {
        return this.data.color;
    }

    lineVisible() {
        return this.data.lineStyle !== "none";
    }

    pointEndLine(data) {
        data.objectType = "pointEndLine";
        data.basePoint = this;
        return this.patternPiece.add(data);
    }

    pointAlongLine(data) {
        data.objectType = "pointAlongLine";
        data.firstPoint = this;
        return this.patternPiece.add(data);
    }

    lineTo(data) {
        data.objectType = "line";
        data.firstPoint = this;
        return this.patternPiece.add(data);
    }

    pointLineIntersect(data) {
        data.objectType = "pointLineIntersect";
        data.p1Line1 = this;
        return this.patternPiece.add(data);
    }
}
