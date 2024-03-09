//(c) Copyright 2019 Jason Dore
//
//This library collates the various geometric calclulation requirements
//of the drawing objects into a small number of primitives. 
//
//This library then generally uses other libraries to perform those 
//geometric calculations where they are non trivial
//(e.g. intersection of lines with splines).
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

class DrawingObject /*abstract*/ {
    
    constructor(data) {
        this.data = data;
        this.contextMenu = data.contextMenu;
    }

    drawLabel( g, drawingOptions ) {

        if ( ! drawingOptions.label )
            return;

        //g - the svg group we want to add the text to
        //o - the drawing object

        const d = this.data; //the original json data

        if (   ( this.p )
            && ( typeof this.p.x === "number" ) )
        {
            const labelPosition = this.labelPosition();

            if ( labelPosition.drawLine )
                g.append("line")
                .attr("x1", this.p.x)
                .attr("y1", this.p.y)
                .attr("x2", labelPosition.labelLineX )
                .attr("y2", labelPosition.labelLineY )
                .attr("stroke-width", this.getStrokeWidth( false ) )
                .attr("class", "labelLine" );

            let labelText = d.name;
            try {
                if ( this.showLength() === "label" )
                    labelText += " " + this.getLengthAndUnits();
            } catch ( e ) {                
            }

            const t = g.append("text")
                        .attr("class","labl")
                        .attr("x", labelPosition.labelX )
                        .attr("y", labelPosition.labelY )
                        .attr("font-size", labelPosition.fontSize + "px")
                        .text( labelText );

            if ( drawingOptions.overrideLineColour )
                t.attr("style", "fill:"+ drawingOptions.overrideLineColour ); //using style overrides the stylesheet, whereas fill does not. 
        }

        if (( this.showLength() === "line" ) && this.lineVisible())
            this.drawLengthAlongLine( g, drawingOptions );
    }


    drawLengthAlongLine( g, drawingOptions )
    {
        let path;
        if ( this.line )
            path = this.line;
        else if ( this.curve )
            path = this.curve;
        else if ( this.arc )
            path = this.arc;
        else 
            throw new Error( "Unknown type to add length along line" );

        const lengthAndUnits = this.getLengthAndUnits();

        this.drawing.drawLabelAlongPath( g, path, lengthAndUnits, false ); //no fontSize, so semantic zoom font size. 
    }
s

    labelPosition() {

        if ( ! this.p )
            return null;

        const d = this.data; //the original json data
        const fontSize = Math.round( 1300 / scale / fontsSizedForScale )/100;
        let fudge = 1.0; //0.75*mx because we use a smaller font than seamly2d

        //This is different to seamly2d behaviour, we'll actually reduce mx/my a bit if you zoom in
        if ( fontsSizedForScale > 1 )
            fudge = (1 + 1/fontsSizedForScale) /2;

        let mx = (typeof d.mx === "undefined") ? 0 : d.mx;
        let my = (typeof d.my === "undefined") ? 0 : d.my;

        //some odd data exists out there in operation results of splines e.g. 3 Button Sack rev.1
        if (( mx >= 2147480000 ) || ( my >= 2147480000 ))
        {
            mx = 0;
            my = 0;
        }

        const pos = { labelX: this.p.x + fudge * mx,
                    labelY: this.p.y + fudge * ( my + fontSize ),
                    labelLineX: this.p.x + fudge * mx,  //line goes to left of label
                    labelLineY: this.p.y + fudge * ( my + 0.5 * fontSize ), //line always goes to vertical midpoint of text
                    fontSize: fontSize
                    };

        //TODO adjust the labelLine to be cleverer, intersecting a boundary box around the text.      
        
        if (( mx <= 0 ) && ( d.name ))
            pos.labelLineX = this.p.x + fudge * ( mx + 0.5 * d.name.length * fontSize ); //otherwise line goes to center of label

        if ( my <= 0 )
            pos.labelLineY = this.p.y + fudge * ( my + fontSize ); //align to bottom of text

        const minLineLength = 2 * fontSize;

        pos.drawLine =    ( Math.abs( this.p.x - pos.labelX ) > minLineLength )
                       || ( Math.abs( this.p.y - pos.labelY ) > minLineLength );

        //TODO drawing a line can become newly desirable because of zooming, but we won't have added it. 

        return pos;
    }


    getLengthAndUnits()
    {
        let l;

        if ( this.line )
            l = this.line.length;
        else if (( this.curve ) && ( typeof this.curve.pathLength === "function" ))
            l = this.curve.pathLength();
        else if (( this.arc ) && ( typeof this.arc.pathLength === "function" ))
            l = this.arc.pathLength();

        if ( l !== undefined )
        {
            const patternUnits = this.drawing.pattern.units;
            const precision = patternUnits === "mm" ? 10.0 : 100.0;
            l = Math.round( precision * l ) / precision;            
            return l + " " + patternUnits;    
        }
            
        throw new Error( "Unknown length" );
    }


    drawDot( g, drawingOptions ) {

        if ( ! drawingOptions.dot )
            return; 

        const isOutline = drawingOptions.outline;
        g.append("circle")
            .attr("cx", this.p.x)
            .attr("cy", this.p.y)
            .attr("r", Math.round( ( isOutline ? 1200 : 400 ) / scale ) /100 );
    }


    drawLine( g, drawingOptions ) {

        const isOutline = drawingOptions.outline;
        
        if ( this.lineVisible() && this.line ) //If there was an error, line may not be set. 
        {
            const l = g.append("line")
                     .attr("x1", this.line.p1.x)
                     .attr("y1", this.line.p1.y)
                     .attr("x2", this.line.p2.x)
                     .attr("y2", this.line.p2.y)
                     .attr("stroke-width", this.getStrokeWidth( isOutline ) );

            if ( ! isOutline )
                l.attr("stroke", drawingOptions.overrideLineColour ? drawingOptions.overrideLineColour : this.getColor() )
                 .attr("class", drawingOptions.overrideLineStyle ? drawingOptions.overrideLineStyle : this.getLineStyle() );
        }
    }


    drawPath( g, path, drawingOptions ) {

        const isOutline = drawingOptions.outline;

        if ( this.lineVisible() )
        {
            const p = g.append("path")
                    .attr("d", path )
                    .attr("fill", "none")
                    .attr("stroke-width", this.getStrokeWidth( isOutline) );

            if ( ! isOutline )        
                p.attr("stroke", drawingOptions.overrideLineColour ? drawingOptions.overrideLineColour : this.getColor() )
                 .attr("class", drawingOptions.overrideLineStyle ? drawingOptions.overrideLineStyle : this.getLineStyle() );
        }
    }    


    drawCurve( g, drawingOptions ) {

        if ( ( this.lineVisible() ) && this.curve )
            this.drawPath( g, this.curve.svgPath(), drawingOptions );
    }


    drawArc( g, drawingOptions ) {

        const isOutline = drawingOptions.outline;
        
        if ( ( this.lineVisible() /*|| isOutline*/ ) && this.arc )
        {
                if ( this.lineVisible() )
                {
                    if (    ( this.arc instanceof GeoEllipticalArc )
                         && ( this.arc.useSvgEllipse() ) )
                    {
                        const p = g.append("ellipse")
                        .attr("transform", "rotate(" + this.arc.rotationAngle + ")" )
                        .attr("cx", this.arc.center.x )
                        .attr("cy", this.arc.center.y )
                        .attr("rx", this.arc.radius1 )
                        .attr("ry", this.arc.radius2 )
                        .attr("fill", "none")
                        .attr("stroke-width", this.getStrokeWidth( isOutline) );
    
                        if ( ! isOutline )
                            p.attr("stroke", this.getColor() )
                            .attr("class", this.getLineStyle() );    
                    }
                    else
                        this.drawPath( g, this.arc.svgPath(), drawingOptions );    
                }

                //Labels that are along the line  should only show if we're drawing the line
                this.drawLabel(g, drawingOptions);
        }            
    }


    sanitiseForHTML ( s ) {

        if ( ! typeof s === "string" )
            s = "" + s;

        return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    };


    ref() {
        return '<a class="ps-ref">' + this.sanitiseForHTML( this.data.name ) + '</a>';
    }


    nameOf() {
        return '<span class="ps-name">' + this.sanitiseForHTML( this.data.name ) + '</span>'
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

        //Actually, we'll handle this in the stylesheet
        //if (( this.data.color === "black" ) && ( typeof iskDarkMode !== "undefined" ) && iskDarkMode )
        //    return "white";
        //if (( this.data.color === "white" ) && ( typeof iskDarkMode !== "undefined" )&& ( ! iskDarkMode ) )
        //    return "black";
          
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
        return this.drawing.add(data);
    }


    pointAlongLine(data) {
        data.objectType = "pointAlongLine";
        data.firstPoint = this;
        return this.drawing.add(data);
    }


    lineTo(data) {
        data.objectType = "line";
        data.firstPoint = this;
        return this.drawing.add(data);
    }


    pointLineIntersect(data) {
        data.objectType = "pointLineIntersect";
        data.p1Line1 = this;
        return this.drawing.add(data);
    }


    setIsMemberOfGroup( group )
    {
        if ( ! this.memberOf )        
            this.memberOf = [];

        this.memberOf.push( group );
    }


    showLength()
    {
        if (   this.data.showLength !== undefined 
            && this.data.showLength !== "none" )
            return this.data.showLength;

        if ( this.memberOf )   
            for( const g of this.memberOf )
            {
                if ( g.showLength !== "none" ) 
                    return g.showLength;
            }

        return "none";
    }


    isVisible( options )
    {
        if ( this.memberOf )   
        {
            let isVisible = false;

            this.memberOf.forEach( 
                function(g) { 
                if ( g.visible ) 
                    isVisible = true; 
            } ); 

            if ( ! isVisible )
                return false; //We are in 1+ groups, but none were visible.
        }

        if ( options?.targetPiece )
        {
            //TODO get rid of this now that we have skipDrawing
            if ( options.downloadOption ) //see elsewhere where we use the same control.
                return false; //Should targetPiece mean we don't display any drawing objects? 

            let isVisible = false;

            //if this obj doesn't match a detailNode then return false
            //if ( options.targetPiece.nodesByName[ this.data.name ] )
            //    isVisible = true;

            //TODO or if ! this.UsedByObjects
            //return false
            //if ( this.usedByPieces contains options.targetPiece )
            //return true else return false

            if ( options.targetPiece.detailNodes )
                for( const n of options.targetPiece.detailNodes )
                {
                    if ( n.dObj === this ) 
                        isVisible = true; 
                }

            if ( ! isVisible )
                return false;
        }

        return true;
    }

    escapeHtml(unsafe) 
    {
        return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }
}
