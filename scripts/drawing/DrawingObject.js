class DrawingObject /*abstract*/ {
    
    constructor(data) {
        this.data = data;
    }

    drawLabel( g ) {
        //g - the svg group we want to add the text to
        //o - the drawing object
        var d = this.data; //the original json data
        if (typeof this.p.x !== "number")
            return;

        g.append("text")
            .attr("x", this.p.x + (typeof d.mx === "undefined" ? 0 : ( d.mx/ scale) ) )
            .attr("y", this.p.y + (typeof d.my === "undefined" ? 0 : ( d.my/ scale ) ) )
            .text(d.name)
            .attr("font-size", Math.round(100 / scale)/10 + "px");
    }


    drawDot( g ) {
        //var d = o.data; //the original json data
        g.append("circle")
            .attr("cx", this.p.x)
            .attr("cy", this.p.y)
            .attr("r", Math.round( 40 / scale ) /10 );
    }


    drawLine( g ) {
        if ( this.lineVisible() && this.line ) //If there was an error, line may not be set. 
            g.append("line")
                .attr("x1", this.line.p1.x)
                .attr("y1", this.line.p1.y)
                .attr("x2", this.line.p2.x)
                .attr("y2", this.line.p2.y)
                .attr("stroke-width", this.getStrokeWidth() )
                .attr("stroke", this.getColor() )
                .attr("class", this.getLineStyle() );
    }


    drawPath( g, path ) {
        if ( this.lineVisible() )
            g.append("path")
              .attr("d", path )
              .attr("fill", "none")
              .attr("stroke-width", this.getStrokeWidth() )
              .attr("stroke", this.getColor() )
              .attr("class", this.getLineStyle() );
    }    


    drawCurve( g ) {
        if ( this.lineVisible() && this.curve )
            this.drawPath( g, this.curve.svgPath() );
    }


    ref() {
        return '<span class="ps-ref">' + this.data.name + '</span>';
    }


    getStrokeWidth()
    {
        if ( this == selectedObject )
            return 4 /fontsSizedForScale;

        return 1 / scale;
    }


    getColor() {
        if ( this == selectedObject )
            return "yellow";

        return this.data.color;
    }

    
    getLineStyle()
    {
        return this.data.lineStyle;
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
