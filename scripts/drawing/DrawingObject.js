class DrawingObject /*abstract*/ {
    
    constructor(data) {
        this.data = data;
    }

    drawLabel( g, isOutline ) {

        if ( isOutline )
            return; //it would be confusing to be able to click on text that you can't see to select something. 

        //g - the svg group we want to add the text to
        //o - the drawing object
        var d = this.data; //the original json data
        if (typeof this.p.x !== "number")
            return;

        g.append("text")
            .attr("x", this.p.x + (typeof d.mx === "undefined" ? 0 : ( d.mx/ scale) ) )
            .attr("y", this.p.y + (typeof d.my === "undefined" ? 0 : ( d.my/ scale ) ) )
            .text(d.name)
            .attr("font-size", Math.round( ( 1200 / scale ))/100 + "px");
    }


    drawDot( g, isOutline ) {
        g.append("circle")
            .attr("cx", this.p.x)
            .attr("cy", this.p.y)
            .attr("r", Math.round( ( isOutline ? 1200 : 400 ) / scale ) /100 );
    }


    drawLine( g, isOutline ) {
        if ( this.lineVisible() && this.line ) //If there was an error, line may not be set. 
        {
            var l = g.append("line")
                     .attr("x1", this.line.p1.x)
                     .attr("y1", this.line.p1.y)
                     .attr("x2", this.line.p2.x)
                     .attr("y2", this.line.p2.y)
                     .attr("stroke-width", this.getStrokeWidth( isOutline ) );

            if ( ! isOutline )
                l.attr("stroke", this.getColor() )
                 .attr("class", this.getLineStyle() );
        }
    }


    drawPath( g, path, isOutline ) {
        if ( this.lineVisible() )
        {
            var p = g.append("path")
                    .attr("d", path )
                    .attr("fill", "none")
                    .attr("stroke-width", this.getStrokeWidth( isOutline) );

            if ( ! isOutline )        
                p.attr("stroke", this.getColor() )
                 .attr("class", this.getLineStyle() );
        }
    }    


    drawCurve( g, isOutline ) {
        if ( this.lineVisible() && this.curve )
            this.drawPath( g, this.curve.svgPath(), isOutline );
    }


    ref() {
        return '<span class="ps-ref">' + this.data.name + '</span>';
    }


    refOf( anotherDrawingObject ) {
        if ( ! anotherDrawingObject )
            return "???";

        if ( ! anotherDrawingObject.ref )
            return "????";

        return anotherDrawingObject.ref();
    }


    getStrokeWidth( isOutline, isSelected )
    {
        return Math.round( 1000 * ( isOutline ? 7.0 : ( isSelected ? 3.0 : 1.0 ) ) / scale / fontsSizedForScale ) /1000;
    }


    getColor() {
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
