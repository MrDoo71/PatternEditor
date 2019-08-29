class DrawingObject {
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

    getColor() {
        return this.data.color;
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
