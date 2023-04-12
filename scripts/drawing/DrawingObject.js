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

    drawLabel( g, isOutline ) {

        if ( isOutline )
            return; //it would be confusing to be able to click on text that you can't see to select something. 

        //g - the svg group we want to add the text to
        //o - the drawing object

        if ( ! this.p )
            return;
        
        if (typeof this.p.x !== "number")
            return;

        var d = this.data; //the original json data

        {
            var labelPosition = this.labelPosition();

            if ( labelPosition.drawLine )
                g.append("line")
                .attr("x1", this.p.x)
                .attr("y1", this.p.y)
                .attr("x2", labelPosition.labelLineX )
                .attr("y2", labelPosition.labelLineY )
                .attr("stroke-width", this.getStrokeWidth( false ) )
                .attr("class", "labelLine" );

            g.append("text")
            .attr("x", labelPosition.labelX )
            .attr("y", labelPosition.labelY )
            .text(d.name)
            .attr("font-size", labelPosition.fontSize + "px");
        }
    }


    labelPosition() {

        if ( ! this.p )
            return null;

        //console.log( "Scale: " + scale + " fontsSizedForScale:" + fontsSizedForScale );    

        var d = this.data; //the original json data
        var fontSize = Math.round( 1300 / scale / fontsSizedForScale )/100;
        var fudge = 1.0; //0.75*mx because we use a smaller font than seamly2d

        //This is different to seamly2d behaviour, we'll actually reduce mx/my a bit if you zoom in
        if ( fontsSizedForScale > 1 )
            fudge = (1 + 1/fontsSizedForScale) /2;

        var mx = (typeof d.mx === "undefined") ? 0 : d.mx;
        var my = (typeof d.my === "undefined") ? 0 : d.my;

        //some odd data exists out there in operation results of splines e.g. 3 Button Sack rev.1
        if (( mx >= 2147480000 ) || ( my >= 2147480000 ))
        {
            mx = 0;
            my = 0;
        }

        var pos = { labelX: this.p.x + fudge * mx,
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

        var minLineLength = 2 * fontSize;

        pos.drawLine =    ( Math.abs( this.p.x - pos.labelX ) > minLineLength )
                       || ( Math.abs( this.p.y - pos.labelY ) > minLineLength );

        //TODO drawing a line can become newly desirable because of zooming, but we won't have added it. 

        return pos;
    }


    drawDot( g, isOutline ) {
        g.append("circle")
            .attr("cx", this.p.x)
            .attr("cy", this.p.y)
            .attr("r", Math.round( ( isOutline ? 1200 : 400 ) / scale ) /100 );
    }


    drawLine( g, isOutline ) {
        if ( ( this.lineVisible() /*|| isOutline*/ ) && this.line ) //If there was an error, line may not be set. 
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
        if ( this.lineVisible() )//|| isOutline )
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
        if ( ( this.lineVisible() /*|| isOutline*/ ) && this.curve )
            this.drawPath( g, this.curve.svgPath(), isOutline );
    }


    drawArc( g, isOutline ) {
        
        if ( ( this.lineVisible() /*|| isOutline*/ ) && this.arc )
        {
                if ( this.lineVisible() )
                {
                    if (    ( this.arc instanceof GeoEllipticalArc )
                         && ( this.arc.useSvgEllipse() ) )
                    {
                        var p = g.append("ellipse")
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
                        this.drawPath( g, this.arc.svgPath(), isOutline );    
                }

                this.drawLabel(g, isOutline);
        }            
    }


    ref() {
        return '<a class="ps-ref">' + this.data.name + '</a>';
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

        if (( this.data.color === "black" ) && ( iskDarkMode ) )
            return "white";

        if (( this.data.color === "white" ) && ( ! iskDarkMode ) )
            return "black";
          
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


    setIsMemberOfGroup( group )
    {
        if ( ! this.memberOf )        
            this.memberOf = [];

        this.memberOf.push( group );
    }


    isVisible( options )
    {
        if ( this.memberOf )   
        {
            var isVisible = false;

            this.memberOf.forEach( 
                function(g) { 
                if ( g.visible ) 
                    isVisible = true; 
            } ); 

            if ( ! isVisible )
                return false; //We are in 1+ groups, but none were visible.
        }

        if ( options.targetPiece )
        {
            var isVisible = false;

            //if this obj doesn't match a detailNode then return false
            //if ( options.targetPiece.nodesByName[ this.data.name ] )
            //    isVisible = true;

            //TODO or if ! this.UsedByObjects
            //return false
            //if ( this.usedByPieces contains options.targetPiece )
            //return true else return false

            options.targetPiece.detailNodes.forEach( 
                function(n) { 
                    if ( n.dObj === this ) 
                        isVisible = true; 
            }, this ); 

            if ( ! isVisible )
                return false;
        }

        return true;
    }
}
