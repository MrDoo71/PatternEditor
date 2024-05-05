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

        if ( this.lineVisible() && this.line ) 
            this.drawALine( g, drawingOptions, this.line );
    }


    drawALine( g, drawingOptions, line ) {

        const isOutline = drawingOptions.outline;
        
        const l = g.append("line")
                    .attr("x1", line.p1.x)
                    .attr("y1", line.p1.y)
                    .attr("x2", line.p2.x)
                    .attr("y2", line.p2.y)
                    .attr("stroke-width", this.getStrokeWidth( isOutline ) );

        if ( ! isOutline )
            l.attr("stroke", drawingOptions.overrideLineColour ? drawingOptions.overrideLineColour : this.getColor() )
                .attr("class", drawingOptions.overrideLineStyle ? drawingOptions.overrideLineStyle : this.getLineStyle() );
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

class ArcElliptical extends DrawingObject {

    //center
    //angle1
    //angle2
    //radius1
    //radius2
    //rotationAngle

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = data.derivedName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.drawing.getObject(d.center);
        if (typeof this.angle1 === "undefined")
            this.angle1 = this.drawing.newFormula(d.angle1);
        if (typeof this.angle2 === "undefined")
            this.angle2 = this.drawing.newFormula(d.angle2);
        if (typeof this.radius1 === "undefined")
            this.radius1 = this.drawing.newFormula(d.radius1);
        if (typeof this.radius2 === "undefined")
            this.radius2 = this.drawing.newFormula(d.radius2);
        if (typeof this.rotationAngle === "undefined")
            this.rotationAngle = this.drawing.newFormula(d.rotationAngle);

        this.arc = new GeoEllipticalArc( this.center.p, 
                                         this.radius1.value(),
                                         this.radius2.value(), 
                                         this.angle1.value(), 
                                         this.angle2.value(),
                                         this.rotationAngle.value() );
   
        this.p = this.arc.pointAlongPathFraction( 0.5 );

        this.adjustBounds( bounds );
    }

    
    adjustBounds( bounds )
    {
        bounds.adjust( this.p );

        if ( this.arc )
            this.arc.adjustBounds( bounds );
    }


    pointAlongPath( length )
    {
        return this.arc.pointAlongPath( length );
    }
    

    asShapeInfo()
    {
        return this.arc.asShapeInfo();
    }


    draw( g, drawOptions ) {
        this.drawArc( g, drawOptions );        
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'elliptical arc with center ' + this.refOf( this.center )
                + " radius-x " + this.radius1.htmlLength( asFormula ) 
                + " radius-y " + this.radius2.htmlLength( asFormula ) 
                + " from angle " + this.angle1.htmlAngle( asFormula ) 
                + " to " + this.angle2.htmlAngle( asFormula )
                + " rotation angle " + this.rotationAngle.htmlAngle( asFormula ) ;
    }

    
    setDependencies( dependencies ) {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle1 );
        dependencies.add( this, this.angle2 );
        dependencies.add( this, this.rotationAngle );
        dependencies.add( this, this.radius1 );
        dependencies.add( this, this.radius2 );
    }    
}

class ArcSimple extends DrawingObject {

    //center
    //angle1
    //angle2
    //radius 

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = data.derivedName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.drawing.getObject(d.center);
        if (typeof this.angle1 === "undefined")
            this.angle1 = this.drawing.newFormula(d.angle1);
        if (typeof this.angle2 === "undefined")
            this.angle2 = this.drawing.newFormula(d.angle2);
        if (typeof this.radius === "undefined")
            this.radius = this.drawing.newFormula(d.radius);

        this.arc = new GeoArc( this.center.p, this.radius.value(), this.angle1.value(), this.angle2.value() );

        this.p = this.arc.pointAlongPathFraction( 0.5 );

        this.adjustBounds( bounds );
    }

    
    adjustBounds( bounds )
    {
        bounds.adjust( this.p ); //not necessarily

        if ( this.arc )
            this.arc.adjustBounds( bounds );
    }


    pointAlongPath( length ) {
        return this.arc.pointAlongPath( length );
    }
    

    asShapeInfo() {
        return this.arc.asShapeInfo();
    }


    draw( g, drawOptions ) {

        this.drawArc( g, drawOptions );
        //this.drawLabel(g, drawOptions ); Only do the label if the line style!=none
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'arc with center ' + this.refOf( this.center )
                + " radius " + this.radius.htmlLength( asFormula ) 
                + " from angle " + this.angle1.htmlAngle( asFormula ) 
                + " to " + this.angle2.htmlAngle( asFormula );
    }

    
    setDependencies( dependencies ) {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle1 );
        dependencies.add( this, this.angle2 );
        dependencies.add( this, this.radius );
    }    
}

class ArcWithLength extends ArcSimple {

    //center
    //angle
    //length
    //radius 

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = data.derivedName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.drawing.getObject(d.center);
        if (typeof this.angle1 === "undefined")
            this.angle = this.drawing.newFormula(d.angle1);
        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);
        if (typeof this.radius === "undefined")
            this.radius = this.drawing.newFormula(d.radius);

        //circle-circ = 2 * pi * radius
        //fraction of circle = length / circle-cird
        //angle of arc  = length / circle-cird * 360
        //angle2 = angle + ( length / circle-cird * 360 )
        const endAngle = this.angle.value() + this.length.value() / (2 * Math.PI * this.radius.value() ) * 360;

        this.arc = new GeoArc( this.center.p, this.radius.value(), this.angle.value(), endAngle );

        this.p = this.arc.pointAlongPathFraction( 0.5 );

        this.adjustBounds( bounds );
    }

    
    html( asFormula ) {
        return this.nameOf() + ': '
                + 'arc with center ' + this.refOf( this.center )
                + " radius " + this.radius.htmlLength( asFormula ) 
                + " from angle " + this.angle.htmlAngle( asFormula ) 
                + " length " + this.length.htmlLength( asFormula );
    }

    
    setDependencies( dependencies ) {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle );
        dependencies.add( this, this.length );
        dependencies.add( this, this.radius );
    }    
}

class CutSpline extends DrawingObject { //TODO for consistency should be PointCutSpline ???

    //curve
    //length

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.curve === "undefined")
            this.curve = this.drawing.getObject(d.spline);

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);

        //Note tha this.curve might be something like a SplineSimple, but it might also be an OperationResult
        this.p = this.curve.pointAlongPath( this.length.value() );
        this.adjustBounds( bounds );
    }

    
    adjustBounds( bounds )
    {        
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + this.data.length.htmlLength( asFormula ) 
                + " along curve " + this.refOf( this.curve );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.curve );
        dependencies.add( this, this.length );
    }    

}

//(c) Copyright 2019 Jason Dore
//https://github.com/MrDoo71/PatternEditor

var scale;



class Line extends DrawingObject {

    //firstPoint
    //secondPoint

    constructor(data) {
        super(data);
        this.data.name = data.derivedName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.firstPoint);
            
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.secondPoint);

        this.line = new GeoLine(this.firstPoint.p, this.secondPoint.p);

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g, drawOptions ) {
        
        this.drawLine( g, drawOptions );

        this.drawLabel( g, drawOptions );
        
        //TODO we could display the derived name Line_A1_A2 at the mid-point along the line?       

        //TODO for all lines we could draw a thicker invisible line do make it easier to click on the line.
    }


    html( asFormula ) {
        return 'line ' + this.refOf( this.firstPoint ) + " - " + this.refOf( this.secondPoint );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
    }    
}

class OperationFlipByAxis extends DrawingObject {

    //operationName
    //suffix
    //center
    //axis

    constructor(data) {
        super(data);
        this.data.name = data.operationName;
        this.axis = data.axis;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.drawing.getObject(d.center);

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        //Done by OperationResult
    }


    draw( g, drawOptions ) {
        //g is the svg group
        //this.drawLine( g ); //TODO put an arrow head on this!
        //this.drawDot( g );
        //this.drawLabel( g );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'Flip ' + this.axis 
                + " around " + this.refOf( this.center ) 
                         //" angle:" + this.data.angle.value() +
                + " applying suffix '" + this.data.suffix + "'";
    }


    applyOperationToPoint( p ) {
        return this.flipPoint( p, this.center.p );
    }


    flipPoint( p, center ) {
        const result = new GeoPoint( p.x, p.y );

        if (    ( this.axis === "Vertical" ) 
             || ( this.axis === "vertical" )) //just in case.
            result.x = center.x - ( p.x - center.x );
        else
            result.y = center.y - ( p.y - center.y );

        return result;
    }

    
    setDependencies( dependencies ) {
        dependencies.add( this, this.center );
    }    

}

class OperationFlipByLine extends DrawingObject {

    //operationName
    //suffix
    //p1Line1
    //p2Line1
  

    constructor(data) {
        super(data);
        this.data.name = data.operationName;
        this.axis = data.axis;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.drawing.getObject(d.p1Line1);

        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.drawing.getObject(d.p2Line1);

        this.line = new GeoLine( this.p1Line1.p, this.p2Line1.p );

        this.adjustBounds( bounds );
    }

    adjustBounds( bounds )
    {
        //Done by OperationResult
    }


    draw( g, drawOptions ) {
        //g is the svg group
        //this.drawLine( g ); //TODO put an arrow head on this!
        //this.drawDot( g );
        //this.drawLabel( g );

        this.drawLine( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'Flip over line ' + this.refOf( this.p1Line1 ) 
                + "-" + this.refOf( this.p2Line1 ) 
                + " applying suffix '" + this.data.suffix + "'";
    }


    applyOperationToPoint( p ) {

        return this.flipPoint( p, this.line );
    }


    flipPoint( p, line ) {
        
        //image the point of view rotated such that this.line is on the x-axis at 0deg. 
        //if the line is at 45deg, rotate the line and the source point by -45 deg. flip the y component, then rotate back by +45. 

        const p0 = p.rotate( this.line.p1, -this.line.angleDeg() );

        const p0f = new GeoPoint( p0.x, this.line.p1.y - ( p0.y - this.line.p1.y ) );

        const result = p0f.rotate( this.line.p1, this.line.angleDeg() );

        return result;
    }

    
    setDependencies( dependencies ) {
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
    }    

}

class OperationMove extends DrawingObject {

    //operationName
    //suffix
    //angle
    //length

    constructor(data) {
        super(data);
        this.data.name = data.operationName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);
            
        if (typeof this.angle === "undefined")
            this.angle = this.drawing.newFormula(d.angle);
            
        //Convert degrees to radians
        //this.p = this.basePoint.p.pointAtDistanceAndAngleRad(this.length.value(), Math.PI * 2 * this.angle.value() / 360);
        //this.line = new GeoLine(this.basePoint.p, this.p);
        //bounds.adjustForLine(this.line);
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        //Done by OperationResult
    }


    draw( g, drawOptions ) {
        //g is the svg group
        //this.drawLine( g ); //TODO put an arrow head on this!
        //this.drawDot( g );
        //this.drawLabel( g );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                    + 'Move ' + this.data.length.htmlLength( asFormula ) 
                    //" from " + this.basePoint.data.name +
                    + " at angle " + this.data.angle.htmlAngle( asFormula ) 
                    + " applying suffix '" + this.data.suffix + "'";
    }


    applyOperationToPoint( p ) {
        //Convert degrees to radians
        const result = p.pointAtDistanceAndAngleDeg( this.length.value(), this.angle.value() );
        //var line = new GeoLine( source.p, result.p );
        return result;
    }


    setDependencies( dependencies ) {
        //dependencies.add( this, this.basePoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    

}

class OperationResult extends DrawingObject {

    //basePoint
    //fromOperation

    constructor(data) {
        super(data);
        this.data.name = data.derivedName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.drawing.getObject(d.basePoint);

        if (typeof this.fromOperation === "undefined")
            this.fromOperation = this.drawing.getObject(d.fromOperation);

        //if this.basePoint is a point... (if a curve, this is the midpoint)
        if ( this.basePoint.p )
            this.p = this.fromOperation.applyOperationToPoint( this.basePoint.p );

        const operation = this.fromOperation;
        const applyOperationToPointFunc = function( p ) {
            return operation.applyOperationToPoint( p );
        };

        if ( this.basePoint.curve instanceof GeoSpline )
        {
            //so we get this captured and can just pass the function around
            this.curve = this.basePoint.curve.applyOperation( applyOperationToPointFunc );
        }

        //If the basePoint is a Point that is showing its construction line, then don't perform
        //the operation on that construction line.
        if ( ( this.basePoint instanceof Line ) && ( this.basePoint.line instanceof GeoLine ) ) //untested?
        {
            this.line = this.basePoint.line.applyOperation( applyOperationToPointFunc );
        }

        if (   ( this.basePoint.arc instanceof GeoArc ) //untested?
            || ( this.basePoint.arc instanceof GeoEllipticalArc ) )
        {
            this.arc = this.basePoint.arc.applyOperation( applyOperationToPointFunc );
        }

        //TODO This line would be useful if the operation, or operation result is selected. 
        //THOUGH, if the operation is a rotate then drawing an arc would be useful. 
        //this.operationLine = new GeoLine(this.basePoint.p, this.p);

        if (( this.line ) || ( this.curve ) || ( this.arc ))
        {
            if ( ! this.data.lineStyle )
                this.data.lineStyle = this.basePoint.data.lineStyle;

            if ( ! this.data.color )    
                this.data.color = this.basePoint.data.color;
        }

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust( this.p );
    }


    asShapeInfo()
    {
        if ( this.curve )
            return this.curve.asShapeInfo();
        else if ( this.arc )
            return this.arc.asShapeInfo();
        else    
            throw new Error( "asShapeInfo() not implemented. " );
    }    

    
    pointAlongPath( length ) {

        if ( this.arc )
            return this.arc.pointAlongPath( length );

        if ( this.curve )
            return this.curve.pointAlongPath( length );
            
        throw new Error( "pointAlongPath not implemented for this operation result. " );
    }


    getColor() {
        return this.basePoint.getColor();
    }

    
    getLineStyle() {
        return this.basePoint.getLineStyle();
    }


    draw( g, drawOptions ) {
        //g is the svg group

        //We might have operated on a point, spline (or presumably line)

        if (( this.p ) && ( ! this.curve ) && ( ! this.arc ))
            this.drawDot( g, drawOptions );

        if ( this.curve )
            this.drawCurve( g, drawOptions ); 

        if ( this.arc )
            this.drawArc( g, drawOptions );             

        if ( this.line )
            this.drawLine( g, drawOptions ); 
            
        if ( this.p )
            this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'Result of ' + this.refOf( this.fromOperation )
                + ' on ' + this.refOf( this.basePoint ); 
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.fromOperation );
    }    

}

class OperationRotate extends DrawingObject {

    //operationName
    //suffix
    //angle
    //center

    constructor(data) {
        super(data);
        this.data.name = data.operationName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.drawing.getObject(d.center);
            
        if (typeof this.angle === "undefined")
            this.angle = this.drawing.newFormula(d.angle);            
            
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        //Done by OperationResult
    }


    draw( g, drawOptions ) {
        //g is the svg group
        //this.drawLine( g ); //TODO put an arrow head on this!
        //this.drawDot( g );
        //this.drawLabel( g );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'Rotate: ' 
                + this.data.angle.htmlAngle( asFormula ) 
                + " around " + this.refOf( this.center ) 
                + " applying suffix '" + this.data.suffix + "'";
    }


    applyOperationToPoint( p ) {
        return p.rotate( this.center.p, this.angle.value() );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle );
    }    

}

class PerpendicularPointAlongLine extends DrawingObject {

    //basePoint
    //firstPoint
    //secondPoint

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.drawing.getObject(d.basePoint);
        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.p1Line1);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.p2Line1);

        const line = new GeoLine(this.firstPoint.p, this.secondPoint.p);        
        const baseLine = new GeoLine( this.basePoint.p, this.basePoint.p.pointAtDistanceAndAngleDeg( 1, line.angleDeg() + 90 ) );

        this.p = line.intersect(baseLine);
        this.line = new GeoLine( this.basePoint.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {
        //g is the svg group
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'Point along line ' + this.refOf( this.firstPoint ) + ' - ' + this.refOf( this.secondPoint )
                + ' where it is perpendicular to ' + this.refOf( this.basePoint );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.basePoint );
    }    

}

class PointAlongBisector extends DrawingObject {

    //firstPoint
    //secondPoint
    //thirdPoint
    //length

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.secondPoint);
        if (typeof this.thirdPoint === "undefined")
            this.thirdPoint = this.drawing.getObject(d.thirdPoint);
        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);
            
        const line1 = new GeoLine( this.secondPoint.p, this.firstPoint.p );    
        const line2 = new GeoLine( this.secondPoint.p, this.thirdPoint.p );    

        //TODO test what happens when this crosses the equator! i.e. one point is just below the equator and one just above (and in either direction)
        const bisectingAngle = ( line1.angleDeg() + line2.angleDeg() ) /2;

        //Convert degrees to radians
        this.p = this.secondPoint.p.pointAtDistanceAndAngleDeg( this.length.value(), bisectingAngle );
        this.line = new GeoLine(this.secondPoint.p, this.p);

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g, drawOptions ) {
        //g is the svg group
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + this.data.length.htmlLength( asFormula ) 
                + " along line bisecting " + this.refOf( this.secondPoint ) 
                + "-" + this.refOf( this.firstPoint )
                + " and " + this.refOf( this.secondPoint ) 
                + "-" + this.refOf( this.thirdPoint );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.thirdPoint );
        dependencies.add( this, this.length );
    }    

}

class PointAlongLine extends DrawingObject {

    //firstPoint
    //secondPoint
    //length

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.firstPoint);

        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.secondPoint);

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);

        this.baseLine = new GeoLine(this.firstPoint.p, this.secondPoint.p);
        this.p = this.firstPoint.p.pointAtDistanceAndAngleRad(this.length.value(this.baseLine.length), this.baseLine.angle);
        this.line = new GeoLine(this.firstPoint.p, this.p);
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g, drawOptions ) {
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        
        return this.nameOf() + ': '
                + this.data.length.htmlLength( asFormula, this.baseLine? this.baseLine.length : 0 ) 
                + " along line from " + this.refOf( this.firstPoint )
                + " to " + this.refOf( this.secondPoint );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.length );
    }    

}

class PointAlongPerpendicular extends DrawingObject {

    //firstPoint
    //secondPoint
    //length
    //angle

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.secondPoint);
        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);
        if (typeof this.angle === "undefined")
            this.angle = this.drawing.newFormula(d.angle);
            
        const baseLine = new GeoLine( this.firstPoint.p, this.secondPoint.p );    
        const totalAngle = this.angle.value() + 90 + baseLine.angleDeg();
        //Convert degrees to radians
        this.p = this.firstPoint.p.pointAtDistanceAndAngleDeg( this.length.value(), totalAngle );
        this.line = new GeoLine(this.firstPoint.p, this.p);
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g , drawOptions ) {
        //g is the svg group
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        let h = this.nameOf() + ': '
                + this.data.length.htmlLength( asFormula ) 
                + " from " + this.refOf( this.firstPoint ) 
                + " perpendicular to the line to " + this.refOf( this.secondPoint );

        if (    ( this.data.angle.constant )
             && ( this.data.angle.constant != 0 ) )
            h += " additional angle " + this.data.angle.htmlAngle( asFormula );

        return h;
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    

}

class PointCutArc extends DrawingObject {

    //arc
    //length

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.arc === "undefined")
            this.arc = this.drawing.getObject(d.arc);

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);

        this.p = this.arc.pointAlongPath( this.length.value() );
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }

    
    draw( g, drawOptions ) {
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + this.data.length.htmlLength( asFormula ) 
                + " along arc " + this.refOf( this.arc );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.arc );
        dependencies.add( this, this.length );
    }    

}

class PointCutSplinePath extends DrawingObject {

    //splinePath
    //length

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.curve === "undefined")
            this.curve = this.drawing.getObject(d.splinePath);

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);

        this.p = this.curve.pointAlongPath( this.length.value() );
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + this.data.length.htmlLength( asFormula ) 
                + " along path " + this.refOf( this.curve );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.curve );
        dependencies.add( this, this.length );
    }    

}

class PointEndLine extends DrawingObject {

    //basePoint
    //length
    //angle

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.drawing.getObject(d.basePoint);

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);
            
        if (typeof this.angle === "undefined")
            this.angle = this.drawing.newFormula(d.angle);

        this.p = this.basePoint.p.pointAtDistanceAndAngleDeg( this.length.value(), this.angle.value() );
        this.line = new GeoLine(this.basePoint.p, this.p);
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g, drawOptions ) {
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + this.data.length.htmlLength( asFormula ) 
                + " from " + this.refOf( this.basePoint ) 
                + " angle " + this.data.angle.htmlAngle( asFormula );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    

}

class PointFromArcAndTangent extends DrawingObject {

    //arc
    //tangent
    //crossPoint

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.tangent === "undefined")
            this.tangent = this.drawing.getObject(d.tangent);

        if (typeof this.arc === "undefined")
            this.arc = this.drawing.getObject(d.arc); 

        this.crossPoint = d.crossPoint;

        const tangentIntersections = this.arc.arc.getPointsOfTangent( this.tangent.p );
        
        if ( this.crossPoint === "One" ) 
            this.p = tangentIntersections[1];
        else 
            this.p = tangentIntersections[0];
            
        this.line = new GeoLine( this.tangent.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, drawOptions ) {
        this.drawLine(g, drawOptions );
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'point on arc ' + this.refOf( this.arc ) //derivedName?
                + ' of tangent from point ' + this.refOf( this.tangent )
                + ' crosspoint:' + this.crossPoint;
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.tangent );
        dependencies.add( this, this.arc );
    }    

}

class PointFromCircleAndTangent extends DrawingObject {

    //center
    //tangent
    //crossPoint
    //radius

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.tangent === "undefined")
            this.tangent = this.drawing.getObject(d.tangent);

        if (typeof this.arc === "undefined")
            this.center = this.drawing.getObject(d.center); 

        if (typeof this.radius === "undefined")
            this.radius = this.drawing.newFormula(d.radius);

        this.crossPoint = d.crossPoint;

        const circle = new GeoArc( this.center.p, this.radius.value(), 0, 360 );

        const tangentIntersections = circle.getPointsOfTangent( this.tangent.p );
        
        //TODO what is the real logic for crossPoint One vs Two
        if ( this.crossPoint === "One" ) 
            this.p = tangentIntersections[1];
        else 
            this.p = tangentIntersections[0];
            
        this.line = new GeoLine( this.tangent.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, drawOptions ) {
        this.drawLine(g, drawOptions );
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'point on circle with center ' + this.refOf( this.center ) 
                + ' radius ' + this.radius.htmlLength( asFormula ) 
                + ' of tangent from point ' + this.refOf( this.tangent )
                + ' crosspoint:' + this.crossPoint;
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.tangent );
        dependencies.add( this, this.center );
        dependencies.add( this, this.radius );
    }    

}

class PointFromXandYOfTwoOtherPoints extends DrawingObject {

    //firstPoint
    //secondPoint

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.secondPoint);

        this.p = new GeoPoint( this.firstPoint.p.x, this.secondPoint.p.y );

        this.line1 = new GeoLine( this.firstPoint.p, this.p );
        this.line2 = new GeoLine( this.secondPoint.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    drawLine( g, drawingOptions ) 
    {
        if ( this.lineVisible() )
        {
            if ( this.line1 ) 
                this.drawALine( g, drawingOptions, this.line1 );

            if ( this.line2 ) 
                this.drawALine( g, drawingOptions, this.line2 );
        }
    }


    draw( g, drawOptions ) {
        //TODO check that there is no option to draw a line as part of this tool. 
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
               + ' point at X from ' + this.refOf( this.firstPoint ) +  " and Y from " + this.refOf( this.secondPoint );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
    }    
}

class PointIntersectArcAndAxis extends DrawingObject {

    //arc (provided as "curve"), and may be an arc or a spline (by observation)
    //basePoint
    //angle

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.drawing.getObject(d.basePoint);

        if (typeof this.arc === "undefined")
            this.arc = this.drawing.getObject(d.curve); //An anomaly, would be better if this were arc.

        if (typeof this.angle === "undefined")
            this.angle = this.drawing.newFormula(d.angle);

        let angleDeg = this.angle.value();
        if ( angleDeg >= 360 )
            angleDeg -= 360;
        else if ( angleDeg < 0 )
            angleDeg += 360;

        const curveOrArc = ( this.arc.arc ) ? this.arc.arc : this.arc.curve ;

        //Rather than use an arbitrarily long line (which was causing issues)
        //calculate the max length of line. The line cannot be longer than
        //the bounding box encompassing the basePoint and the curve. 
        const tempBounds = new Bounds();
        tempBounds.adjust( this.basePoint.p );
        this.arc.adjustBounds( tempBounds );

        let maxLineLength = tempBounds.diagonaglLength() * 1.25;        
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( maxLineLength, angleDeg );
        let longLine = new GeoLine( this.basePoint.p, otherPoint );

        try {
            this.p = longLine.intersectArc( curveOrArc );

        } catch ( e ) {

            //For compatibility with Seamly2D, if the line doesn't find an intersection in the direction in 
            //which it is specified, try the other direction. 
            otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( maxLineLength, angleDeg + 180 );
            longLine = new GeoLine( this.basePoint.p, otherPoint );
            this.p = longLine.intersectArc( curveOrArc );
        }


        this.line = new GeoLine( this.basePoint.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, drawOptions ) {
        //g is the svg group
        this.drawLine(g, drawOptions );
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        //TODO use a better name for this.curve, e.g. Arc_A_nn
        return this.nameOf() + ': '
                + 'intersect arc ' + this.refOf( this.arc )
                + " with line from " + this.refOf( this.basePoint ) 
                + " at angle " + this.angle.htmlAngle( asFormula );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.arc );
        dependencies.add( this, this.angle );
    }    

}

class PointIntersectArcAndLine extends DrawingObject {

    //firstPoint
    //secondPoint
    //center
    //radius

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.firstPoint);
            
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.secondPoint);

        if (typeof this.center === "undefined")
            this.center = this.drawing.getObject(d.center);

        if (typeof this.radius === "undefined")
            this.radius = this.drawing.newFormula(d.radius);

        const line = new GeoLine( this.firstPoint.p, this.secondPoint.p );
        const arc  = new GeoArc( this.center.p, this.radius.value(), 0, 360 );

        this.p = line.intersectArc( arc );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {

        //TODO draw the line between basePoint and p
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        
        return this.nameOf() + ': '
                + 'intersect arc with center ' 
                + this.refOf( this.center ) 
                + ", radius " + this.radius.htmlLength( asFormula ) 
                +  " with line " + this.refOf( this.firstPoint ) 
                + "-" + this.refOf( this.secondPoint );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.center );
        dependencies.add( this, this.radius );
    }    

}

class PointIntersectArcs extends DrawingObject {

    //firstArc
    //secondArc
    //crossPoint

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstArc === "undefined")
            this.firstArc = this.drawing.getObject(d.firstArc);
            
        if (typeof this.secondArc === "undefined")
            this.secondArc = this.drawing.getObject(d.secondArc);

        const arc1SI = this.firstArc.asShapeInfo();
        const arc2SI = this.secondArc.asShapeInfo();

        let intersections = Intersection.intersect(arc1SI, arc2SI);

        const myIntersections = this.firstArc.arc.intersect( this.secondArc.arc );

        //This is just a conservative switchover to our own intersection code. 
        //Need to test more widely for first and second intersection points, and arcs that span 0 deg.
        if (( intersections.points.length === 0 ) && ( myIntersections.length !== 0 ))
        {
            intersections = { status: "Intersection", points: myIntersections };
            console.log( "Using alternative intersect method.");
        }

        if ( intersections.points.length === 0 )
        {
            throw new Error( "No intersections found. " );
        }
        else if ( intersections.points.length === 1 )
        {
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        else
        {
            //TODO A5 in the test should be (0,0) as the point of intersection is not during the specified angle of the arcs.
            //For each intersection point
            //TODO check that GeoLine( this.firstArc.center.p, p1)).angleDeg() between this.firstArc.arc.angle1 and this.firstArc.arc.angle2
            //and similar for secondArc

            //What is the angle in the first arc of the intersection point?
            //One = smallest angle in the first arc.
            //Two = largest angle in the first arc.
            const p1 = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
            const p2 = new GeoPoint( intersections.points[1].x, intersections.points[1].y );
            const angle1 = (new GeoLine( this.firstArc.center.p, p1)).angle;
            const angle2 = (new GeoLine( this.firstArc.center.p, p2)).angle;

            if ( this.data.crossPoint === "One" )
            {
                if ( angle1 < angle2 )
                    this.p = p1;
                else
                    this.p = p2;
            }            
            else 
            {
                if ( angle1 < angle2 )
                    this.p = p2;
                else
                    this.p = p1;
            }
        }

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, drawOptions ) {
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'intersect arcs ' + this.refOf( this.firstArc )
                + " and " + this.refOf( this.secondArc )
                + ( this.data.crossPoint === "One" ? "" : " - second point");
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.firstArc );
        dependencies.add( this, this.secondArc );
    }    

}

class PointIntersectCircles extends DrawingObject {

    //center1     ??? Confirm
    //radiu1   ??? Confirm
    //center2   ??? Confirm
    //radius2  ??? Confirm
    //crossPoint    ??? Confirm

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.center1 === "undefined")
            this.center1 = this.drawing.getObject(d.center1);
            
        if (typeof this.center2 === "undefined")
            this.center2 = this.drawing.getObject(d.center2);

        if (typeof this.radius1 === "undefined")
            this.radius1 = this.drawing.newFormula(d.radius1);

        if (typeof this.radius2 === "undefined")
            this.radius2 = this.drawing.newFormula(d.radius2);

        //Also this.data.crossPoint    
        const circle1 = new GeoArc( this.center1.p, this.radius1.value(), 0, 360 );
        const circle2 = new GeoArc( this.center2.p, this.radius2.value(), 0, 360 );

        const arc1SI = circle1.asShapeInfo();
        const arc2SI = circle2.asShapeInfo();

        let intersections = Intersection.intersect(arc1SI, arc2SI);

        const myIntersections = circle1.intersect( circle2 );

        //This is just a conservative switchover to our own intersection code. 
        //Need to test more widely for first and second intersection points. 
        if (( intersections.points.length === 0 ) && ( myIntersections.length !== 0 ))
        {
            intersections = { status: "Intersection", points: myIntersections };
            console.log( "Using alternative intersect method.");
        }        
        
        if ( intersections.points.length === 0 )
        {
            throw new Error( "No intersections found. " );
        }
        else if ( intersections.points.length === 1 )
        {
            //surely there must always be two intersects, unless they just touch
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        else
        {
            /* we do not know what logic valentina/seamly uses

            the smallest angle, except that if angle1 beween 270 and 360 and angle2 between 0 and 90 then add 360 to angle2. */

            //NB: this is a subset of the logic that applies to PointIntersectArcs.
            //What is the angle in the first arc of the intersection point?
            //One = smallest angle in the first arc.
            //Two = largest angle in the first arc.
            const p1 = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
            const p2 = new GeoPoint( intersections.points[1].x, intersections.points[1].y );
            let angle1 = (new GeoLine( circle1.center, p1)).angleDeg();
            let angle2 = (new GeoLine( circle1.center, p2)).angleDeg();
            if (( angle1 >= 270 ) && ( angle2 > 0 ) && ( angle2 < 90 ))
                angle2 += 360;
            else if (( angle2 >= 270 ) && ( angle1 > 0 ) && ( angle1 < 90 ))
                angle1 += 360;

            if ( this.data.crossPoint === "One" )
            {
                if ( angle1 < angle2 )
                    this.p = p1;
                else
                    this.p = p2;
            }            
            else 
            {
                if ( angle1 < angle2 )
                    this.p = p2;
                else
                    this.p = p1;
            }            
        }

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, drawOptions ) {
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'intersect circles ' + this.refOf( this.center1 ) 
                + " radius " + this.radius1.htmlAngle( asFormula ) 
                + " and " + this.refOf( this.center2 ) 
                + " radius " + this.radius2.htmlLength( asFormula )
                + ( this.data.crossPoint === "One" ? "" : " - second point");
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.center1 );
        dependencies.add( this, this.center2 );
        dependencies.add( this, this.radius1 );
        dependencies.add( this, this.radius2 );
    }    

}

class PointIntersectCurveAndAxis extends DrawingObject {

    //basePoint
    //curve
    //angle

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.drawing.getObject(d.basePoint);

        if (typeof this.curve === "undefined")
            this.curve = this.drawing.getObject(d.curve);

        if (typeof this.angle === "undefined")
            this.angle = this.drawing.newFormula(d.angle);

        let angleDeg = this.angle.value();
        if ( angleDeg >= 360 )
            angleDeg -= 360;
        else if ( angleDeg < 0 )
            angleDeg += 360;


        //Rather than use an arbitrarily long line (which was causing issues)
        //calculate the max length of line. The line cannot be longer than
        //the bounding box encompassing the basePoint and the curve. 
        const tempBounds = new Bounds();
        tempBounds.adjust( this.basePoint.p );
        this.curve.adjustBounds( tempBounds );
        const maxLineLength = tempBounds.diagonaglLength() * 1.25;
        
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( maxLineLength, angleDeg );

        const line = new GeoLine( this.basePoint.p, otherPoint );

        const lineSI = line.asShapeInfo();
        const curveSI = this.curve.asShapeInfo();

        const intersections = Intersection.intersect(lineSI, curveSI);        

        if ( intersections.points.length === 0 )
        {
            throw new Error( "No intersections found. " );
        }
        else
        {
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        this.line = new GeoLine( this.basePoint.p, this.p );

        this.adjustBounds( bounds );
    }
    
        
    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }

    
    draw(g, drawOptions ) {
        //g is the svg group
        this.drawLine(g, drawOptions ); 
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'intersect curve ' + this.refOf( this.curve )
                + " with line from " + this.refOf( this.basePoint )
                + " at angle " + this.angle.htmlAngle( asFormula );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.curve );
        dependencies.add( this, this.angle );
    }    

}

class PointIntersectCurves extends DrawingObject {

    //curve1
    //curve2
    //verticalCrossPoint
    //horizontalCrossPoint

    constructor(data) {
        super(data);
    }

    calculate(bounds) {
        const d = this.data;

        if (typeof this.curve1 === "undefined")
            this.curve1 = this.drawing.getObject(d.curve1);
            
        if (typeof this.curve2 === "undefined")
            this.curve2 = this.drawing.getObject(d.curve2);

        const curve1SI = this.curve1.asShapeInfo();
        const curve2SI = this.curve2.asShapeInfo();

        const intersections = Intersection.intersect(curve1SI, curve2SI);
        
        if ( intersections.points.length === 0 )
        {
            this.p = new GeoPoint(0,0);
            throw new Error( "No intersections found. " );
        }        
        else if ( intersections.points.length === 1 )
        {
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        else if ( intersections.points.length > 1 )    
        {
            //Vertical correction has first dibs. verticalCrossPoint=="One" means highest point; horizontalCrossPoint=="One" means leftmost point
            let minXPnt, maxXPnt, minYPnt, maxYPnt;
            let selectedPoint;
            for ( const intersect of intersections.points )
            {
                if (( ! minXPnt ) || ( intersect.x < minXPnt.x ))
                    minXPnt = intersect;
                if (( ! maxXPnt ) || ( intersect.x > maxXPnt.x ))
                    maxXPnt = intersect;
                if (( ! minYPnt ) || ( intersect.y < minYPnt.y ))
                    minYPnt = intersect;
                if (( ! maxYPnt ) || ( intersect.y > maxYPnt.y ))
                    maxYPnt = intersect;
            }
            if ( minYPnt !== maxYPnt )
            {
                if ( this.data.verticalCrossPoint === "One" )
                    selectedPoint = minYPnt;
                else
                    selectedPoint = maxYPnt;
            }
            else
            {
                if ( this.data.horizontalCrossPoint === "One" )
                    selectedPoint = minXPnt;
                else
                    selectedPoint = maxXPnt;
            }
            this.p = new GeoPoint( selectedPoint.x, selectedPoint.y );
        }

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, drawOptions ) {
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        //TODO use a better name for this.curve, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'intersect curve ' + this.refOf( this.curve1 ) 
                + " with " + this.refOf( this.curve2 );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.curve1 );
        dependencies.add( this, this.curve2 );
    }    

}

class PointIntersectLineAndAxis extends DrawingObject {

    //basePoint
    //p1Line1
    //p2Line1
    //angle

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.drawing.getObject(d.basePoint);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.drawing.getObject(d.p1Line1);

        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.drawing.getObject(d.p2Line1);

        if (typeof this.angle === "undefined")
            this.angle = this.drawing.newFormula(d.angle);

        const line1 = new GeoLine(this.p1Line1.p, this.p2Line1.p);

        const otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( 1, this.angle.value() );

        const line2 = new GeoLine(this.basePoint.p, otherPoint );

        this.p = line1.intersect(line2);
        this.line = new GeoLine( this.basePoint.p, this.p );
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, drawOptions ) {
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + ' intersection of ' + this.refOf( this.p1Line1 ) 
                + "-" + this.refOf( this.p2Line1 ) 
                + " with line from " + this.refOf( this.basePoint ) 
                + " at angle " + this.angle.htmlAngle( asFormula );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.angle );
    }    


}



class PointLineIntersect extends DrawingObject {

    //p1Line1
    //p2Line1
    //p1Line2
    //p2Line2

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.drawing.getObject(d.p1Line1);
        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.drawing.getObject(d.p2Line1);
        if (typeof this.p1Line2 === "undefined")
            this.p1Line2 = this.drawing.getObject(d.p1Line2);
        if (typeof this.p2Line2 === "undefined")
            this.p2Line2 = this.drawing.getObject(d.p2Line2);

        this.line1 = new GeoLine(this.p1Line1.p, this.p2Line1.p);
        this.line2 = new GeoLine(this.p1Line2.p, this.p2Line2.p);
        this.p = this.line1.intersect(this.line2);

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, drawOptions ) {
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'intersect ' + this.refOf( this.p1Line1 )
                + "-" + this.refOf( this.p2Line1 ) 
                + " with " + this.refOf( this.p1Line2 ) 
                + "-" + this.refOf( this.p2Line2 );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p1Line2 );
        dependencies.add( this, this.p2Line1 );
        dependencies.add( this, this.p2Line2 );
    }    


}



class PointOfTriangle extends DrawingObject {

    //firstPoint
    //secondPoint
    //p1Line1
    //p2Line1

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.drawing.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.drawing.getObject(d.secondPoint);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.drawing.getObject(d.p1Line1);
        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.drawing.getObject(d.p2Line1);

            
        const axisLine = new GeoLine( this.p1Line1.p, this.p2Line1.p );    

        //otherLine is the hypotenous of the right angled triangle
        const otherLine = new GeoLine( this.firstPoint.p, this.secondPoint.p );

        //how long should we extend the axis line? 
        const l1 = new GeoLine( this.firstPoint.p, this.p1Line1.p );
        const l2 = new GeoLine( this.firstPoint.p, this.p2Line1.p );
        const l3 = new GeoLine( this.secondPoint.p, this.p1Line1.p );
        const l4 = new GeoLine( this.secondPoint.p, this.p2Line1.p );
        const maxDistance = Math.max( l1.length, l2.length, l3.length, l4.length ) + otherLine.length;

        //Now we work out another point along the axis line that forms the right angle triangle 
        //with the otherLine.
        //
        //The trick here is to observe that all these points, for any axisLine will form an arc
        //centered on the midpoint of otherLine with radiu of half length of otherLine

        const midpoint = this.firstPoint.p.pointAtDistanceAndAngleRad( otherLine.length/2, otherLine.angle );
        const arc = new GeoArc( midpoint, otherLine.length/2, 0, 360 );    

        const intersectionPoint = axisLine.intersect( otherLine );
        let extendedAxis;
        //if intersectionPoint is along the line, then we'll have to triangles to choose from
        
        if ( (new GeoLine( this.firstPoint.p, intersectionPoint )).length < otherLine.length )
            extendedAxis = new GeoLine( intersectionPoint, intersectionPoint.pointAtDistanceAndAngleRad( otherLine.length*2, axisLine.angle ) );
        else
            extendedAxis = new GeoLine( this.p1Line1.p, this.p1Line1.p.pointAtDistanceAndAngleRad( maxDistance, axisLine.angle ) );

        this.p = extendedAxis.intersectArc( arc );


        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + " Point along " + this.refOf( this.p1Line1 )
                + "-" + this.refOf( this.p2Line1 )
                + " that forms a right angle triangle with line  " + this.refOf( this.firstPoint )
                + "-" + this.refOf( this.secondPoint );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
    }    

}



class PointShoulder extends DrawingObject {

    //pShoulder
    //p1Line1
    //p2Line1

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.shoulderPoint === "undefined")
            this.shoulderPoint = this.drawing.getObject(d.shoulderPoint);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.drawing.getObject(d.p1Line1);

        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.drawing.getObject(d.p2Line1);

        if (typeof this.length === "undefined")
            this.length = this.drawing.newFormula(d.length);

        //Find the point that is length away from the shoulderPoint along
        //the line p1Line1-p2line1.
            
        const axisLine = new GeoLine( this.p1Line1.p, this.p2Line1.p );    
        const arc = new GeoArc( this.shoulderPoint.p, this.length.value(), 0, 360  );      
        const offset = new GeoLine( this.shoulderPoint.p, this.p1Line1.p );
        const extendedAxisLength = this.length.value() + offset.length;
        const extendedAxis = new GeoLine( this.p1Line1.p, this.p1Line1.p.pointAtDistanceAndAngleRad( extendedAxisLength, axisLine.angle ) );

        try {
            this.p = extendedAxis.intersectArc( arc );
        } catch (e) {
            //Maybe the axisLine is going in the wrong direction, and therefore extending it's length didn't help.
            //Try reversing axisLine...
            const axisLine = new GeoLine( this.p2Line1.p, this.p1Line1.p );    
            const arc = new GeoArc( this.shoulderPoint.p, this.length.value(), 0, 360  );      
            const offset = new GeoLine( this.shoulderPoint.p, this.p2Line1.p );
            const extendedAxisLength = this.length.value() + offset.length;
            const extendedAxis = new GeoLine( this.p2Line1.p, this.p2Line1.p.pointAtDistanceAndAngleRad( extendedAxisLength, axisLine.angle ) );
            this.p = extendedAxis.intersectArc( arc );    
        }

        this.line = new GeoLine( this.shoulderPoint.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {
        this.drawLine( g, drawOptions );
        this.drawDot( g, drawOptions );
        this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
            + " Point along " + this.refOf( this.p1Line1 ) 
            + "-" + this.refOf( this.p2Line1 )
            + " being " + this.length.htmlLength( asFormula ) 
            + " from " + this.refOf( this.shoulderPoint );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.shoulderPoint );
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
        dependencies.add( this, this.length );
    }    

}



class PointSingle extends DrawingObject {

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        const d = this.data;
        this.p = new GeoPoint(d.x, d.y);
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, drawOptions ) {
        this.drawDot(g, drawOptions );
        this.drawLabel(g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
            + " point at x:" + this.data.x + ", y:" + this.data.y + " from origin"; //TODO add units
    }


    setDependencies( dependencies ) {
    }    

}



class SplinePathInteractive extends DrawingObject {

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        const d = this.data;

        if ( typeof this.nodes === "undefined" )
        {
            this.nodes = [];

            try {
                for( const pathNode of d.pathNode )
                {
                    pathNode.point   = this.drawing.getObject( pathNode.point );
                    pathNode.angle1  = this.drawing.newFormula( pathNode.angle1 ); 
                    pathNode.length1 = this.drawing.newFormula( pathNode.length1 ); 
                    pathNode.angle2  = this.drawing.newFormula( pathNode.angle2 ); 
                    pathNode.length2 = this.drawing.newFormula( pathNode.length2 );

                    this.nodes.push( { inAngle:   pathNode.angle1.value(),
                                       inLength:  pathNode.length1.value(),
                                       point:     pathNode.point.p,
                                       outAngle:  pathNode.angle2.value(),
                                       outLength: pathNode.length2.value() } );
                }
            } catch ( e ) {
                this.error = e;
                return;
            }
        }

        this.curve = new GeoSpline( this.nodes );

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust( this.p );
        this.curve.adjustBounds( bounds );
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw( g, drawOptions ) {

        this.drawCurve(g, drawOptions );

        //Where should we draw the label? half way along the curve? 
        this.drawLabel(g, drawOptions );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        let html = this.nameOf() + ': '
                    +'curved path:';

        const d = this.data;
        
        try {
            let thtml = "<table><tbody>";
            for( const i in d.pathNode )
            {
                const node = d.pathNode[i];
                thtml += "<tr><td>";
                thtml += this.refOf( node.point );
                thtml += "</td>";

                if ( i == 0 )
                    thtml += "<td></td><td></td>";
                else
                    thtml +=    "<td>" + node.angle1.htmlAngle( asFormula ) 
                            + "</td><td>" + node.length1.htmlLength( asFormula ) + "</td>";

                if ( i == (d.pathNode.length -1) )
                    thtml += "<td></td><td></td>";
                else
                    thtml +=    " <td>" + node.angle2.htmlAngle( asFormula ) 
                            + "</td><td>" + node.length2.htmlLength( asFormula ) + "</td>";

                thtml += "</tr>";         
            }
            thtml += "</tbody></table>";
            html += thtml;
        } catch ( e ) {
            if ( ! this.error )
                html += e;
        }

        return html;
    }

    
    setDependencies( dependencies )
    {
        for( const pathNode of this.data.pathNode )
        {
            dependencies.add( this, pathNode.point );
            dependencies.add( this, pathNode.angle1 );
            dependencies.add( this, pathNode.angle2 );
            dependencies.add( this, pathNode.length1 );
            dependencies.add( this, pathNode.length2 );
        }        
    }    
}



class SplinePathUsingPoints extends DrawingObject {

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        const d = this.data;

        if ( typeof this.nodes === "undefined" )
        {
            this.nodes = [];

            for( const pathNode of d.pathNode )
            {
                pathNode.point = this.drawing.getObject( pathNode.point );
            }

            for( let i=0; i< d.pathNode.length; i+=3 )
            {
                this.nodes.push( { 
                                   inControlPoint:   (i-1)>0 ? this.data.pathNode[i-1].point.p : undefined,
                                   point:            this.data.pathNode[i].point.p,
                                   outControlPoint:  (i+1) < this.data.pathNode.length ? this.data.pathNode[i+1].point.p : undefined,
                                   } );
            }
        }

        this.curve = new GeoSpline( this.nodes );

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust( this.p );

        //Bounds will already have been adjusted for each node
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw( g, drawOptions ) {
        if ( this.lineVisible() )
            this.drawPath( g, this.curve.svgPath(), drawOptions );

        //Where should we draw the label? half way along the curve? 
        this.drawLabel( g, drawOptions );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        let html = this.nameOf() + ': '
                   + 'curved path: ';

        const d = this.data;

        html += "<table><tbody>";

        for( let i=0; i< d.pathNode.length; i+=3 )
        {
            html += "<tr><td>";

            if ( (i-1)>0 )
                html += this.refOf( this.data.pathNode[i-1].point );

            html += "</td><td>";

            html += this.refOf( d.pathNode[i].point );

            html += "</td><td>";

            if ( (i+1) < this.data.pathNode.length )
                html += this.refOf(  this.data.pathNode[i+1].point );

            html += "</td></tr>";                
        }

        html += "</tbody></table>";

        return html;
    }

    
    setDependencies( dependencies )
    {
        for( const n of this.data.pathNode )
        {
            dependencies.add( this, n.point );
        }        
    }    
}


class SplineSimple extends DrawingObject {

    //startPoint - the spline start
    //endPoint - the spline end
    //angle1
    //angle2 
    //length1
    //length2

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.startPoint === "undefined")
            this.startPoint = this.drawing.getObject(d.point1);

        if (typeof this.endPoint === "undefined")
            this.endPoint = this.drawing.getObject(d.point4);

        if (typeof this.angle1 === "undefined")
            this.angle1 = this.drawing.newFormula(d.angle1);

        if (typeof this.angle2 === "undefined")
            this.angle2 = this.drawing.newFormula(d.angle2);

        if (typeof this.length1 === "undefined")
            this.length1 = this.drawing.newFormula(d.length1);

        if (typeof this.length2 === "undefined")
            this.length2 = this.drawing.newFormula(d.length2);

        this.curve = new GeoSpline( [ { inAngle: undefined, inLength: undefined, point: this.startPoint.p, outAngle: this.angle1.value(), outLength: this.length1.value() },
                                       { inAngle: this.angle2.value(), inLength: this.length2.value(), point: this.endPoint.p, outAngle: undefined, outLength: undefined } ] );

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        this.curve.adjustBounds( bounds );
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw( g, drawOptions ) {
        
        if ( this.lineVisible() )
            this.drawPath( g, this.curve.svgPath(), drawOptions );

        this.drawLabel( g, drawOptions );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'spline from ' + this.refOf( this.startPoint ) 
                + " angle " + this.angle1.htmlAngle( asFormula ) 
                + " length " + this.length1.htmlLength( asFormula )
            + " to " + this.refOf( this.endPoint ) 
            + " angle " + this.angle2.htmlAngle( asFormula ) 
            + " length " + this.length2.htmlLength( asFormula );
    }

    
    setDependencies( dependencies )
    {
        dependencies.add( this, this.startPoint );
        dependencies.add( this, this.endPoint );
        dependencies.add( this, this.angle1 );
        dependencies.add( this, this.angle2 );
        dependencies.add( this, this.length1 );
        dependencies.add( this, this.length2 );
    }    
}

class SplineUsingControlPoints extends DrawingObject {

    //startPoint - the spline start
    //startControlPoint
    //endPoint - the spline end
    //endControlPoint

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.startPoint === "undefined")
            this.startPoint = this.drawing.getObject(d.point1);

        if (typeof this.startControlPoint === "undefined")
            this.startControlPoint = this.drawing.getObject(d.point2);

        if (typeof this.endControlPoint === "undefined")
            this.endControlPoint = this.drawing.getObject(d.point3);

        if (typeof this.endPoint === "undefined")
            this.endPoint = this.drawing.getObject(d.point4);

        this.curve = new GeoSpline( [ { point: this.startPoint.p, outControlPoint: this.startControlPoint.p },
                                      { inControlPoint: this.endControlPoint.p,  point: this.endPoint.p } ] );

        this.midPoint = this.curve.pointAlongPathFraction( 0.5 );        
        this.p = this.midPoint;

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        this.curve.adjustBounds( bounds );
    }

    
    asShapeInfo() {
        return this.curve.asShapeInfo();
    }


    draw( g, drawOptions ) {

        if ( this.lineVisible() )
            this.drawPath( g, this.curve.svgPath(), drawOptions );

        //Where should we draw the label? half way along the curve?
        //this.drawDot(g, drawOptions);
        this.drawLabel( g, drawOptions );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        return this.nameOf() + ': '
            + 'spline from ' + this.refOf( this.startPoint )
            + " using control point " + this.refOf( this.startControlPoint )
            + " to " + this.refOf( this.endPoint )
            + " using control point " + this.refOf( this.endControlPoint );
    }

    
    setDependencies( dependencies )
    {
        dependencies.add( this, this.startPoint );
        dependencies.add( this, this.startControlPoint );
        dependencies.add( this, this.endPoint );
        dependencies.add( this, this.endControlPoint );
    }    
}

class TrueDart extends DrawingObject {

    //p1Line1  2 points making up the line on which the dart sits. 
    //p2Line1
    //point1 3 points that make up a V shape of the original dart, point1 and point3 lie on the baseline
    //point2
    //point3

    constructor(data) {
        super(data);
        this.data.name = data.operationName;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.point1 === "undefined")
            this.point1 = this.drawing.getObject(d.point1);
        if (typeof this.point2 === "undefined")
            this.point2 = this.drawing.getObject(d.point2);
        if (typeof this.point3 === "undefined")
            this.point3 = this.drawing.getObject(d.point3);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.drawing.getObject(d.p1Line1);
        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.drawing.getObject(d.p2Line1);

        const lineD2D1 = new GeoLine( this.point2.p, this.point1.p ); 
        const lineD2D3 = new GeoLine( this.point2.p, this.point3.p );    

        let angleD2D1 = lineD2D1.angleDeg();
        let angleD2D3 = lineD2D3.angleDeg();

        let totalDartAngle = angleD2D1 - angleD2D3;

        //edge case:
        //if D2D1 angle is 10 and D2D3 is 350 (or vice versa) then it would be better to consider D2D3 to be -10. 
        if ( totalDartAngle > 180 )
        {
            angleD2D1 -= 360;
            totalDartAngle = angleD2D1 - angleD2D3;
        }
        else if ( totalDartAngle < -180 ) 
        {
            angleD2D3 -= 360;
            totalDartAngle = angleD2D1 - angleD2D3;
        }

        const halfDartAngle = totalDartAngle /2;

        const pointA1rotated = this.p1Line1.p.rotate( this.point2.p, -halfDartAngle );
        const pointD1rotated = this.point1.p.rotate( this.point2.p, -halfDartAngle );
        const pointA2rotated = this.p2Line1.p.rotate( this.point2.p, halfDartAngle );
        //const pointD2rotated = this.point3.p.rotate( this.point2.p, halfDartAngle );

        const lineA1RA2R = new GeoLine( pointA1rotated, pointA2rotated );
        this.line = lineA1RA2R; //TEMP
        const pointClosure = lineA1RA2R.intersect( new GeoLine( this.point2.p, pointD1rotated ) ); //could equally use pointD2rotated
        this.p = pointClosure; //TEMP

        this.td1 = pointClosure.rotate( this.point2.p, halfDartAngle );
        this.td3 = pointClosure.rotate( this.point2.p, -halfDartAngle );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.td1);
        bounds.adjust(this.td3);
    }


    draw( g, drawOptions ) {
        this.drawLine( g, drawOptions ); //TEMP - though actually handy
        this.drawDot( g, drawOptions ); //TEMP
        this.drawLabel( g, drawOptions ); //TEMP
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + " True darts baseline " + this.refOf( this.p1Line1 )
                + "-" + this.refOf( this.p2Line1 )
                + " original dart " + this.refOf( this.point1 )
                + "-" + this.refOf( this.point2 )
                + "-" + this.refOf( this.point3 );
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.point1 );
        dependencies.add( this, this.point2 );
        dependencies.add( this, this.point3 );
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
    }    

}

class TrueDartResult extends DrawingObject {

    //fromOperation

    constructor(data) {
        super(data);
        this.name = this.data.name;
    }


    calculate(bounds) {
        const d = this.data;

        if (typeof this.fromOperation === "undefined")
            this.fromOperation = this.drawing.getObject(d.fromOperation);

        if ( this.name === this.fromOperation.data.trueDartResult1 )
            this.p = this.fromOperation.td1;
        else
            this.p = this.fromOperation.td3;

            /*
        //if this.basePoint is a point... (if a curve, this is the midpoint)
        if ( this.basePoint.p )
            this.p = this.fromOperation.applyOperationToPoint( this.basePoint.p );

        var operation = this.fromOperation;
        var applyOperationToPointFunc = function( p ) {
            return operation.applyOperationToPoint( p );
        };

        //else if this.basePoint.curve is a GeoSpline...
        if ( this.basePoint.curve instanceof GeoSpline )
        {
            //so we get this captured and can just pass the function around
            this.curve = this.basePoint.curve.applyOperation( applyOperationToPointFunc );
        }
        else if ( this.basePoint.line instanceof GeoLine ) //untested?
        {
            this.line = this.basePoint.line.applyOperation( applyOperationToPointFunc );
        }
        //TODO we might also have operated on an arc, circle, ellipse? Some might required a different approach that needs to be aligned with original behaviour

        //This line would be useful if the operation, or operation result is selected. 
        //this.operationLine = new GeoLine(this.basePoint.p, this.p);
        */

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust( this.p );
    }


    getColor() {
        return this.basePoint.getColor();
    }

    
    getLineStyle() {
        return this.basePoint.getLineStyle();
    }


    draw( g, drawOptions ) {

        if ( this.p )
            this.drawDot( g, drawOptions );
            
        if ( this.p )
            this.drawLabel( g, drawOptions );
    }


    html( asFormula ) {
        return this.nameOf() + ': '
                + 'Dart point from ' + this.refOf( this.fromOperation );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.fromOperation );
    }    

}

//(c) Copyright 2019 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Pattern {

    constructor (data, options ) {
        this.data = data;
        this.options = options;
        this.patternData = data.pattern;
        this.variable = {};
        this.measurement = {};
        this.units = this.patternData.units ? this.patternData.units : "cm";
        this.wallpapers = data.wallpaper;
        this.patternNumberAndName = ( this.patternData.patternNumber ? this.patternData.patternNumber + " ": "" ) + this.patternData.name;
        this.bounds = new Bounds();
        this.visibleBounds = new Bounds();

        if ( typeof this.patternData.measurement !== "undefined" )
        {
            for ( const m of this.patternData.measurement ) {

                //TODO test this variable that is a simple value...            
                if (typeof m.value !== "undefined") 
                {
                    m.constant = m.value;
                    m.value = function () {
                        return this.constant; 
                    };
                    m.html = function() {
                        return this.name + ": " + this.constant + " " + this.units;
                    };                    
                }
                else
                {
                    m.expression = new Expression( m.expression, this, null );
                    m.value = function () {
                        return this.expression.value(); 
                    };
                    m.html = function(asFormula) {
                        return this.name + ": " + this.expression.html( asFormula );
                    };
                }
                this.measurement[ m.name ] = m;
                m.isMeasurement = true;
            }
        }        
        
        if ( typeof this.patternData.variable !== "undefined" )
        {
            //Register all variable before calculating their values in to deal with dependencies.
            for ( const v of this.patternData.variable ) {
                this.variable[ v.name ] = v;
                v.isVariable = true;
            }

            //Now the variable are all registered, calculate their values.
            for ( const v of this.patternData.variable ) { 
                 
                //TODO test this variable that is a simple value...            
                if (typeof v.constant !== "undefined") 
                {
                    v.value = function () {
                        return this.constant;
                    };
                    v.html = function() {
                        return this.name + ": " + this.constant + ( this.isOverridden ? " (custom)" : "" ) 
                    };
                }
                else
                {
                    v.expression = new Expression( v.expression, this, null );
                    v.value = function () {
                        return this.expression.value();
                    };
                    v.html = function(asFormula) {
                        return this.name + ": " + this.expression.html( asFormula ) + " = " + Number.parseFloat( this.value() ).toPrecision(4) ;
                    };
                }
            }
        }        

        this.drawings = [];

        //Cater for older JSON
        if ( this.patternData.patternPiece )
            this.patternData.drawing = this.patternData.patternPiece;

        for( const drawing of this.patternData.drawing )
        {
            this.drawings.push( new PatternDrawing( drawing, this ) );
        }   

        this.analyseDependencies();
    }


    //Return the pattern local equivalent of this number of mm
    getPatternEquivalentOfMM( mm )
    {
        switch( this.units )
        {
            case "mm" : return mm; 
            case "cm" : return mm/10;
            default: return mm/25.4;
        }
    }


    //Return the pattern local equivalent of this number of pts
    getPatternEquivalentOfPT( pt )
    {
        switch( this.units )
        {
            case "mm" : return pt/72*25.4; 
            case "cm" : return pt/72*2.54;
            default: return pt/72; //inch
        }
    }    


    analyseDependencies() {
        //Now build up dependency links
        this.dependencies = { 
            dependencies: [], 
            add: function ( source, target ) { 

                if (( ! source ) || ( ! target ))
                    return;

                if (   ( target && typeof target.expression === "object" )
                    && ( ! target.isMeasurement )
                    && ( ! target.isVariable ) )
                {
                    if ( target.expression.addDependencies )
                        target.expression.addDependencies( source, this );
                    else
                        console.log("Failed to add dependency for expression. Presumably due to earlier errors. "); //nb. the expression is likely the original data, not our expression object
                }
                else if (   ( target instanceof DrawingObject )
                         || ( target.isMeasurement )
                         || ( target.isIncrement ) 
                         || ( target.isVariable ) 
                         )
                    this.dependencies.push( { source: source, target: target } ); 
            }  
        };
        
        if ( this.variable )
        {
            //nb this.variable is on object with variables as properties, not an array
            for( const i in this.variable )
            {
                const v = this.variable[i];
                if ( v.expression ) 
                {
                    if ( typeof v.expression.addDependencies === "function" )
                        v.expression.addDependencies( v, this.dependencies );
                    else
                        //cater for an variable invalidly having a constant and an expression
                        console.log( "v.expression does not have addDependencies " );
                }
            }
        }    
    
        for( const drawing of this.drawings )
        {
            for ( const dObj of drawing.drawingObjects ) 
            {
                dObj.setDependencies( this.dependencies );
            }

            for ( const p of drawing.pieces ) 
            {
                p.setDependencies( this.dependencies );
            }
        }
        //TODO use a d3.map of a d3.set when we build up the data and then convert it to an array
        //so that we can remove duplicates.
    }


    getVariable(name) {
        if (typeof name === "object")
            return name;
        return this.variable[name];
    }

    getMeasurement(name) {
        if (typeof name === "object")
            return name;

        const m = this.measurement[name];

        if ( !m )
            throw new Error( "Measurment not found:" + name );

        return m;
    }

    getObject( name )
    {
        for( const drawing of this.drawings )
        {
            const obj = drawing.getObject( name, true /*restrict search to this piece*/ );
            if ( obj )
                return obj;
        }
        return null;
    }


    getDate() {
        const t = new Date();
        const date = ('0' + t.getDate()).slice(-2);
        const month = ('0' + (t.getMonth() + 1)).slice(-2);
        const year = t.getFullYear();
        return `${year}-${month}-${date}`;
    }
}
//(c) Copyright 2023 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Group {

    constructor (data, drawing) {
        this.data = data;
        this.drawing = drawing;
        this.name = data.name;
        this.visible = data.visible;
        this.update = data.update;
        this.contextMenu = data.contextMenu;
        this.showLength = data.showLength === "none" ? undefined : data.showLength; //line or label
        this.members = [];

        if ( this.data.member )
            this.data.member.forEach( function(m){
                const dObj = this.drawing.getObject( m, true );
                if ( dObj )
                {
                    this.members.push( dObj );
                    dObj.setIsMemberOfGroup( this );
                }     
            },this);
    }
}
//(c) Copyright 2023 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Piece {

    constructor (data, drawing) {
        this.data = data;
        this.drawing = drawing;
        this.name = data.name;
        this.detailNodes = data.detailNode;
        this.internalPaths = data.internalPath;
        this.dataPanels = data.dataPanel;
        this.nodesByName = {};
        this.calculated = false;
        this.ignore = false;

        if ( this.data.mx === undefined )
            this.data.mx = 0;

        if ( this.data.my === undefined )
            this.data.my = 0;

        if (( ! this.detailNodes ) || ( this.detailNodes.length < 2 ) )
        {
            console.log("Piece " + this.name + " has 0-1 nodes and is therefore invalid." );
            this.ignore = true;
            return;
        }

        for( const n of this.detailNodes )
        {
            const dObj =  this.drawing.getObject( n.obj, true );
            if ( dObj ) 
            {
                this.nodesByName[ n.obj ] = n;
                n.dObj = dObj;

                if ( dObj.error )
                {
                    //Don't try to calculate() this piece if any node has an error (or we could just skip broken nodes?)
                    this.ignore = true;
                    return;
                }

                if ( ! n.reverse )
                    n.reverse = false;

                if ( n.before !== undefined )
                {
                    n.before = this.drawing.newFormula( n.before );
                    if ( typeof n.before === "object" )
                        n.before = n.before.value(); //should we defer evaluating this fornula?
                }
        
                if ( n.after !== undefined )
                {
                    n.after = this.drawing.newFormula( n.after );
                    if ( typeof n.after === "object" )
                        n.after = n.after.value(); //should we defer evaluating this fornula?
                }
            }
            else
            {
                console.log("Couldn't match piece node to drawing object: ", n.obj );
            }
        }    

        const resolve = function( objName, b ) {
            return drawing.getObject( objName, b );
        };

        if ( this.internalPaths )
            for( const ip of this.internalPaths )
            {
                if ( ! ip.node )
                    continue; 

                ip.nodes = [];

                // ip.nodes is not an array, then make it an array of the one thing
                if ( ! Array.isArray( ip.node ) )
                    ip.node = [ ip.node ];

                for( const n of ip.node )
                {
                    const dObj = resolve( n, true );
                    if ( dObj ) 
                        ip.nodes.push( dObj );
                    else
                        console.log("Couldn't match internal path node to drawing object: ", n );
                }

                ip.showLength = ip.showLength === "none" ? undefined : ip.showLength; //line or label
            }
                
        if ( this.dataPanels )
        {
            for( const panel of this.dataPanels )
            {
                if ( panel.center ) 
                    panel.center = resolve( panel.center, true );
                if ( panel.topLeft ) 
                    panel.topLeft = resolve( panel.topLeft, true );
                if ( panel.bottomRight ) 
                    panel.bottomRight = resolve( panel.bottomRight, true );
                if ( panel.orientation === undefined )
                    panel.orientation = "";
                if ( panel.quantity === undefined )
                    panel.quantity = "";
                if ( panel.annotation === undefined )
                    panel.quantity = "";
                if ( panel.onFold === undefined )
                    panel.onFold = false;
                if ( panel.foldPosition === undefined )
                    panel.foldPosition = "";
            }
        }

        this.defaultSeamAllowance = this.drawing.newFormula( data.seamAllowanceWidth );
        if ( typeof this.defaultSeamAllowance === "object" )
            this.defaultSeamAllowance = this.defaultSeamAllowance.value(); //should we defer evaluating this fornula?

        if ( this.name === this.drawing.pattern.data.options.targetPiece )
        {
            this.drawing.pattern.data.options.targetPiece = this;
        }
    }


    calculate()
    {
        if ( this.ignore )
            return;

        for( const a of this.detailNodes )
        {
            const o = a.dObj;
            if (( ! o?.p ) && ( ! o?.arc ) && ( ! o?.curve ))
            {
                console.log("Skipping piece calculations " + this.name + ". Point not known for node " + a );
                return;
            }
        }

        this.calculated = true;
        console.log("*********");
        console.log("Prepare piece: " + this.name );
        let previousP; //not adjusted for seam allowance    

        console.log("Pass 1 - direction and skipped nodes" );
        //Initial preparation, cut up any curves at notches, reverse curves if necessary, work out
        //which points don't lead to any progress around the curve. 
        for (let a = 0; a < this.detailNodes.length+1; a++)   //+1 because we circle right around to the start
        {  
            const n = this.detailNodes[ ( a === this.detailNodes.length ) ? 0 : a ]; //circle back to the first object at the end. 
            const pn = this.detailNodes[ a-1 < 0 ? a-1+this.detailNodes.length : a-1 ]; 
            const nn = this.detailNodes[ a+1 >= this.detailNodes.length ? a+1-this.detailNodes.length : a+1 ];
            const dObj = n.dObj;
            const nObj = nn.dObj;

            //A point can specify before and after SA. The point will have a line drawn to it from the previous position.
            //This line should have a sa of n.before. 

            if ( ! (( dObj.curve instanceof GeoSpline ) || ( dObj.arc instanceof GeoArc )) )
            {
                if ( typeof n.before !== "undefined" )
                    n.sa1 = 1.0 * n.before; //TODO formulas?
                else 
                    n.sa1 = this.defaultSeamAllowance;

                if ( typeof n.after !== "undefined" ) //string
                    n.sa2 = 1.0 * n.after; //TODO formulas?
                else
                    n.sa2 = this.defaultSeamAllowance;
            }
         
            if ( a === 0 ) //Note if first node is curve, then it could be done at the start. 
            {
                if ( dObj.curve instanceof GeoSpline )
                    previousP = dObj.curve.pointAlongPathFraction( n.reverse ? 0: 100) ; //this wouldn't be correct if the curve needed splitting, i.e. if this is a node on a curve
                else if ((dObj.arc instanceof GeoArc ) || ( dObj.arc instanceof GeoEllipticalArc ))
                    previousP = dObj.arc.pointAlongPathFraction( n.reverse ? 0 : 100);
                else
                    previousP = dObj.p;

                console.log( "Start at " + n.obj + " delay drawing starting at " + previousP.toString() );
            }
            else 
            {                
                if (    ( dObj.curve instanceof GeoSpline ) 
                     || ( dObj.arc instanceof GeoArc )
                     || ( dObj.arc instanceof GeoEllipticalArc ) )
                {
                    console.log( "Curve " + n.obj + " previous:" + pn.obj + " next:" + nn.obj );

                    let nObjCurveOrArc = nObj.curve instanceof GeoSpline ? nObj.curve
                                                                         : ( nObj.arc instanceof GeoArc || nObj.arc instanceof GeoEllipticalArc ) ? nObj.arc : undefined; //instanceof GeoArc

                    let nextP = nObjCurveOrArc ? nObjCurveOrArc.pointAlongPathFraction( nn.reverse?100:0 ) 
                                               : nObj.p;

                    let dObjCurve = dObj.curve instanceof GeoSpline ? dObj.curve
                                                                    : ( dObj.arc instanceof GeoArc || dObj.arc instanceof GeoEllipticalArc ) ? dObj.arc.asGeoSpline() : undefined; 

                    //What if previousP and/or nextP isn't on the spline? TODO allow for one of them to be, and one not to be
                    let curveSegment;
                    try {
                        curveSegment = dObjCurve.splineBetweenPoints( previousP, nextP );
                        //We found both points, and so we can work out the forward/reverse automatically

                        //This would work generically for arcs and curves as curveSegment.pointAlongPathFraction(0); //and get these to be remembered
                        let correctDirection = curveSegment.nodeData[0].point.equals( previousP );

                        if ( ! correctDirection )
                        {
                            //maybe it doesn't match completely? 
                            //This would work generically for arcs and curves as curveSegment.pointAlongPathFraction(
                            const lineToStart = new GeoLine( previousP, curveSegment.nodeData[0].point );
                            const lineToEnd = new GeoLine( previousP, curveSegment.nodeData[ curveSegment.nodeData.length-1 ].point );
                            if ( lineToStart.getLength() < lineToEnd.getLength() )
                                correctDirection = true;
                        }

                        if ( (! correctDirection) != n.reverse )
                            console.log("ERROR: Correct direction:" + correctDirection + " reverse?" + n.reverse );

                        if ( ! correctDirection )  //or we could use n.reverse
                        {
                            curveSegment = curveSegment.reverse();
                            console.log( "Spline reversed.");
                        }

                        //If we find 0 or 1 points, then we have to trust the forward/reverse flag. 

                    } catch ( e ) {
                        console.log( "Piece: " + this.name + " previous and/or next nodes not on curve:" + n.obj );
                        //This is not an issue, it just means we're not clipping the start/end of the curve
                        //But, we are now dependent on the reverse flag being set correctly as we cannot determine it ourselves. 
                        
                        if ( n.reverse )
                            curveSegment = (new GeoSpline( [...dObjCurve.nodeData] )).reverse();
                        else 
                            curveSegment = dObjCurve;

                        //NOW INTERSECT WITH start and end separately. 
                        try {
                            const cut = curveSegment.cutAtPoint( previousP );
                            if ( cut?.afterPoint )
                            {
                                curveSegment = cut.afterPoint;
                            }
                            else 
                            {
                                //insert an explicit point for the implicit one, otherwise we'll be confused about direction
                                console.log("Adding explit node for an implict start of curve");
                                const curveStartPoint = curveSegment.nodeData[0].point;
                                const line = new GeoLine( previousP, curveStartPoint );
                                const anglePreviousPThisP = line.angleDeg();
                                const newNode = { obj: n.obj + "_implicit_start",
                                                point: curveStartPoint,
                                                line: line,
                                                directionBeforeDeg: anglePreviousPThisP,
                                                directionAfterDeg: anglePreviousPThisP,
                                                skipPoint: false, 
                                                dObj: { p: curveStartPoint }};
                                this.detailNodes.splice( a, 0, newNode );        
                                a++;
                            }
                        } catch ( e2 ) {
                        }

                        try {
                            //Do we need to add an explicit point for the end of the curve? Probably not                            
                            const cut = curveSegment.cutAtPoint( nextP );
                            if ( cut?.beforePoint )
                                curveSegment = cut.beforePoint;
                        } catch ( e2 ) {
                        }
                    }

                    //Note, don't skip a point just because it is co-incident with the start of a curve
                    //because the start of a curve has its own directionBeforeDeg, and yet the point in relation
                    //to the previous point may be a different angle. 

                    previousP = curveSegment.pointAlongPathFraction(1);
                    n.directionBeforeDeg = curveSegment.entryAngleDeg();
                    n.directionAfterDeg = curveSegment.exitAngleDeg(); //or curveSegmentToDraw?
                    n.curveSegment = curveSegment;
                }
                else if ( dObj.p )
                {
                    console.log( "Other node " + n.obj + " previous:" + pn.obj + " next:" + nn.obj );

                    const thisP = dObj.p;

                    const line = new GeoLine( previousP, thisP );
                    //Is this the same point
                    let samePoint = false;                    
                    if ( thisP.equals( previousP ) )
                        samePoint = true;
                    else
                    {
                        //we could measure the distance and say its the same point if it is very very close
                        console.log("Distance from previousP to thisP " + line.getLength() );
//make this tolerance dependent on this.drawing.pattern.units?                        
                        if ( line.getLength() < 0.05 )
                            samePoint = true;
                    }

                    if ( ( samePoint ) && ( a == this.detailNodes.length ) ) //we've cycled back to the first node. 
                    {
                        n.point = thisP;
                        n.line = line;

                        //if ( n.directionBeforeDeg === undefined )
                        //    n.directionBeforeDeg = n.directionAfterDeg;

                        //if ( n.directionBeforeDeg === undefined )
                            n.directionBeforeDeg = pn.directionAfterDeg;     
                            n.directionAfterDeg = n.directionBeforeDeg;

                        n.skipPoint = false; 
                    }
                    else if ( ! samePoint ) //not the same point
                    {
                        console.log( "Line to " + n.obj );//+ " startAt:" + pn.obj + " endAt:" + nn.obj );
                        n.point = thisP;
                        n.line = line;
                        const anglePreviousPThisP = (new GeoLine( previousP, thisP )).angleDeg();
                        previousP = thisP;

                        //if ( ! pn.directionAfterDeg )
                        //    pn.directionAfterDeg = anglePreviousPThisP;

                        n.directionBeforeDeg = anglePreviousPThisP;
                        n.directionAfterDeg = anglePreviousPThisP;
                        n.skipPoint = false; 
                    }
                    else //same point
                    {
                        //A point on a spline is a way of controlling the before/after seam allowance
                        console.log("Same point, no progress");
                        n.directionBeforeDeg = pn.directionAfterDeg;
                        n.point = thisP; //even if skipping, we may need this for notches
                        n.skipPoint = true; 
                    }
                }

                if ( pn.directionAfterDeg === undefined )
                {
                    pn.directionAfterDeg = n.directionBeforeDeg;

                    if ( pn.directionBeforeDeg === undefined )  
                        pn.directionBeforeDeg = pn.directionAfterDeg;                      
                }

                if ( n.skipPoint )
                  console.log("Index:" + a + " skip" );
                else
                  console.log("Index:" + a + " ends at " + previousP.toString() + ", direction " + Math.round(n.directionAfterDeg) );
            }                    
        };

        //If we're not drawing the seamAllowance line, then no need
        //to calculate it. 
        if ( ! this.data.seamAllowance )
            return;

        console.log("**********************");
        console.log("Pass 2 - add seam allowance");
        let currentSeamAllowance = this.defaultSeamAllowance;        
        for (let a = 0; a < this.detailNodes.length; a++) {

            const n = this.detailNodes[ a ];

            if ( typeof n.sa1 != "undefined" )
                currentSeamAllowance = n.sa1;

            //console.log("Node " + a + " n.sa1:" + n.sa1 + " currentSeamAllowance:" + currentSeamAllowance );                

            n.tangentAfterDeg = n.directionAfterDeg + 90;
            if ( n.tangentAfterDeg >= 360 ) //TODO >= ?
                n.tangentAfterDeg -= 360;     

            n.tangentBeforeDeg = n.directionBeforeDeg + 90;
                if ( n.tangentBeforeDeg >= 360 ) //TODO >= ?
                    n.tangentBeforeDeg -= 360;     

            if ( n.skipPoint )
            {
                console.log( "Node:" + a + " " + n.obj + " skip");
                n.pointEndSA = n.point.pointAtDistanceAndAngleDeg( currentSeamAllowance, n.tangentBeforeDeg );
                if ( typeof n.sa2 !== "undefined" )
                    currentSeamAllowance = n.sa2;
                continue;
            }
    
            let debugSA = "";
    
            if ( n.curveSegment )
            {    

                const parallelCurves = n.curveSegment.parallelCurve( currentSeamAllowance );

                n.curveSegment = parallelCurves.baseCurve; //if we've added nodes to the curve, this would add them to the base curve too
                n.curveSegmentSA = parallelCurves.offsetCurve;
                if ( n.curveSegmentSA === n.curveSegment )
                {
                    //we copied the reference to the curve, but we'll might be meddling with the in/out points, so we need a copy
                    n.curveSegmentSA = new GeoSpline( [...n.curveSegmentSA.nodeData]  );
                }
                n.pointStartSA = n.curveSegmentSA.pointAlongPathFraction(0);
                n.pointEndSA = n.curveSegmentSA.pointAlongPathFraction(1);

                debugSA = " A:" + n.pointStartSA.toString() + " B:" + n.pointStartSA.toString()                 
            }
            else
            {
                if ( currentSeamAllowance === 0 )
                    n.pointStartSA = n.line.p1;
                else
                    n.pointStartSA = n.line.p1.pointAtDistanceAndAngleDeg( currentSeamAllowance, n.tangentBeforeDeg );

                if ( typeof n.tangentAfterDeg !== "undefined" )
                {
                    if ( currentSeamAllowance === 0 )
                        n.pointEndSA = n.line.p2;
                    else
                        n.pointEndSA = n.line.p2.pointAtDistanceAndAngleDeg( currentSeamAllowance, n.tangentAfterDeg ); //SA1 seems more compatible? 
                }
                //Note if directionBeforeDeg==directionAfterDeg then there is effectively 1 point, and no intersection is necessary

                n.lineSA = new GeoLine( n.pointStartSA, n.pointEndSA );

                debugSA = " A:" + n.pointStartSA.toString() + " B:" + n.pointEndSA.toString() 
            }

            console.log( "Node:" + a + " " + n.obj + 
                         " directionBeforeDeg:" + ( n.directionBeforeDeg === undefined ? "undefined" : Math.round(n.directionBeforeDeg) ) + 
                         " directionAfterDeg:" + ( n.directionAfterDeg === undefined ? "undefined" : Math.round(n.directionAfterDeg) ) +
                         " sa:" + ( currentSeamAllowance ) +
                         ( n.curveSegment ? " curvesegment" : n.line ? " line" : " UNKNOWN" ) + " " + debugSA);

            if ( typeof n.sa1 === "undefined" )
                n.sa1 = currentSeamAllowance;

            if ( typeof n.sa2 !== "undefined" )
                currentSeamAllowance = n.sa2;
        }
        console.log("**********************");
        console.log("**********************");
        console.log("Pass 3 - intersects");

        let pn = this.detailNodes[ this.detailNodes.length-1 ];
        if ( pn.skipPoint )
            pn = this.detailNodes[ this.detailNodes.length-2 ]; 

        for (let a = 0; a < this.detailNodes.length; a++) {

            const n = this.detailNodes[ a ];
            const nn = this.detailNodes[ a+1 >= this.detailNodes.length ? a+1-this.detailNodes.length : a+1 ];

            if ( n.skipPoint )
                continue;

            //Now extend or trim lines and curves so that they intersect at the required points. 
            //See docs/intersectionsWithChangingSeamAllowance.svg

            const sa1 = pn.sa1;
            const sa2 = n.sa1;

            let angleChange = n.directionBeforeDeg - pn.directionAfterDeg;
            if ( angleChange < -180 )
                angleChange += 360;
            else if ( angleChange > 180 )
                angleChange -= 360;

            if ( Math.abs( angleChange ) > 179.99 )
            {
                console.log("Complete change of direction? n.obj:" + n.obj + " withPrevious:" + pn.obj  );
            }

            if (    ( ( Math.abs( angleChange ) > 0.1 ) || ( sa2 != sa1 ) ) //must be at an angle change, or an sa change //TODO 0.01 ? 
                 && ( Math.abs( angleChange ) < 179.99 )
                )
            try {                
                //Our intersect could be external, in which case it will be a small, straight extension to each existing path, OR
                //our intersect could be internal, in which case each path needs to be shortened slightly.  It is this latter type
                //that requires us to care about where curves intersection. 

                //+ve a left hand bend, the SAs collapse into each other
                //-ve a right hand bend, the SAs need some filler 

                console.log("Need to do an intersection, n.obj:" + n.obj + " withPrevious:" + pn.obj + " directionChange:" + angleChange + " sa1:" + sa1 + " sa2:" + sa2 ) ;


                //matingAngle - the angle at which the change in SA perfectly tallies with the change in direction
                let matingAngle = 0; //if sa2==sa1 then matingAngle == 0
                
                if (sa1 > sa2)
                    matingAngle = Math.acos( sa2/sa1 ) * 360 / 2 / Math.PI;

                if (sa2 > sa1)
                    matingAngle = Math.acos( sa1/sa2 ) * 360 / 2 / Math.PI;

                //Nb. if the smaller sa is zero, then the matingAngle is 90. 

                let matingAngle2 = - matingAngle; //for where angleChange < 0, i.e. right hand bend

                //If moving from sa1 > sa2
                //   then for angleChange >= matingAngle (60deg) then we just intersect the lines, neither needs extending
                //        for matingAngle2 < angleChange < matingAngle then we need to add a bend to sa1
                //        for angleChange <= matingAngle2 we extend both lines and intersect, or can determine the intesection point through trig.  
                //
                //If moving from sa1 < sa2 
                //  then for angleChange >= matingAngle then we just intersect the lines, neither needs extending
                //           -matingAngle < angleChange < matingAngle then we need to add a bend to sa2
                //           angleChange <=  matingAngle we extend both lines and intersect, or can determine the intesection point through trig.  
                //
                //Therefore the only difference between these cases is which we add the bend to. 

                let trailingPath = pn.lineSA ? pn.lineSA : pn.curveSegmentSA;
                let leadingPath = n.lineSA ? n.lineSA : n.curveSegmentSA;

                if ( angleChange >= matingAngle )
                {
                    console.log( "Angle change > " + matingAngle + " therefore just do intersects" );
                    //then we just intersect the lines/curves, neither needs extending, both need clipping
                    const intersect = this.intersect( trailingPath,  leadingPath );
                    trailingPath = this.clipEnd( trailingPath, intersect );
                    leadingPath = this.clipStart( leadingPath, intersect );
                    pn.pointEndSA = intersect;    
                    n.pointStartSA = intersect;            
                }
                else if ( angleChange > matingAngle2 ) //&& angleChange < matingAngle (as we've just done that)
                {
                    console.log( "Angle change between " + matingAngle2 + " and " + matingAngle + " need to cater for special cases" );

                    //add a bend if there is a change in sa
                    if ( sa1 > sa2 )
                    {
                        //add the bend to the trailling piece, at least to the difference (sa1-sa2)
                        if ( angleChange > 0 ) //left-hand
                        {
                            //add the bend, length=(sa1-sa2), and then intersect
                            const reducedSAPoint = pn.pointEndSA.pointAtDistanceAndAngleDeg( (sa1-sa2), pn.directionAfterDeg-90 );
                            const saChangeLine = new GeoLine( pn.pointEndSA, reducedSAPoint );
                            const intersect = this.intersect( saChangeLine, leadingPath );
                            leadingPath = this.clipStart( leadingPath, intersect );
                            pn.reducedSAPoint = intersect;
                            n.pointStartSA = intersect;
                        }
                        else //right-hand
                        {
                            //add the bend, with a calculated length and then just join to the leading piece. 
                            //a = acos( sa2/sa1 )
                            const sa1Overlap = sa2 / Math.cos( angleChange / 360 * 2 * Math.PI );
                            const reducedSAPoint = pn.pointEndSA.pointAtDistanceAndAngleDeg( sa1-sa1Overlap, pn.directionAfterDeg-90 );
                            pn.reducedSAPoint = reducedSAPoint;
                            //leadingPath - nothing to do, we'll just join with a line from reducedSAPoint to its start.
                            //pn.pointEndSA unchanged;    
                            //n.pointStartSA unchanged
                        }
                        
                    }
                    else if ( sa2 > sa1 )
                    {
                        //add the bend to the leading piece, at least (sa2-sa1)
                        if ( angleChange > 0 ) //left hand
                        {
                            //use sa2-sa1 and intersect with the trailing line
                            const increasingSAPoint = n.pointStartSA.pointAtDistanceAndAngleDeg( (sa2-sa1), n.directionBeforeDeg-90 );
                            const saChangeLine = new GeoLine( n.pointStartSA, increasingSAPoint );
                            const intersect = this.intersect( saChangeLine, trailingPath );
                            trailingPath = this.clipEnd( trailingPath, intersect );
                            pn.pointEndSA = intersect;
                            n.increasingSAPoint = intersect;
                            //n.pointStartSA = intersect;
                        }
                        else //right hand
                        {
                            //add a calculated length bend to the leading piece and just join the path to it. 
                            const sa2overlap = sa1 / Math.cos( angleChange / 360 * 2 * Math.PI );
                            const increasingSAPoint = n.pointStartSA.pointAtDistanceAndAngleDeg( sa2-sa2overlap, n.directionBeforeDeg-90 );
                            //trailingPath - nothing to do
                            //pn.pointEndSA no change
                            //n.pointStartSA no change
                            n.increasingSAPoint = increasingSAPoint;
                        }
                    }
                }
                else
                {
                    console.log( "Angle change less than " + matingAngle2 + " need to intersect extensions" );

                    //we extend both lines and intersect
                    const trailExtensionLine = new GeoLine( pn.pointEndSA, pn.pointEndSA.pointAtDistanceAndAngleDeg( 10, pn.directionAfterDeg ) );
                    const leadingExtensionLine = new GeoLine( n.pointStartSA.pointAtDistanceAndAngleDeg( -10, n.directionBeforeDeg ), n.pointStartSA );
                    const intersect = trailExtensionLine.intersect( leadingExtensionLine );

                    console.log( "Intersect at " + intersect.toString() );

                    if ( trailingPath instanceof GeoSpline )
                    {
                        trailingPath.nodeData.push(  {  inControlPoint:   intersect,
                                                        point:            intersect,
                                                        outControlPoint:  undefined } );
                        trailingPath.nodeData[ trailingPath.nodeData.length-2 ].outControlPoint = intersect;
                    }
                    else
                    {
                        trailingPath = new GeoLine( pn.pointStartSA, intersect ); //this is still just a straight line as we extended it straight
                    }

                    if ( leadingPath instanceof GeoSpline )
                    {
                        leadingPath.nodeData.unshift( { inControlPoint:   undefined,
                                                        point:            intersect,
                                                        outControlPoint:  intersect } );
                        leadingPath.nodeData[1].inControlPoint = intersect;
                    }
                    else
                    {
                        leadingPath = new GeoLine( intersect, n.pointEndSA );                    
                    }

                    pn.pointEndSA = intersect;
                    n.pointStartSA = intersect;
                }        

                if ( trailingPath instanceof GeoSpline )
                    pn.curveSegmentSA = trailingPath;
                else
                    pn.lineSA = trailingPath;

                if ( leadingPath instanceof GeoSpline )
                    n.curveSegmentSA = leadingPath;
                else
                    n.lineSA = leadingPath;
                

            } catch ( e ) {
                console.log("No intersect pn:" + pn.obj + " n:" + n.obj );
            } 

            pn = n;                     
        }
        console.log("**********************");

    }


    intersect( trailingPath, leadingPath )
    {
        const trailingPathSI = trailingPath.asShapeInfo();
        const leadingPathSI = leadingPath.asShapeInfo();        
        let intersect;
        try {
            const intersections = Intersection.intersect(trailingPathSI, leadingPathSI);
            intersect = new GeoPoint( intersections.points[0].x, intersections.points[0].y );

            if ( intersections.length > 1 )
                console.log( "Intersections found (A). " + intersections.length );

        } catch ( e ) {
            console.log( "No intersections found (A). " + pn.obj + " and " + n.obj );

            try { 
                const intersections = Intersection.intersect( leadingPathSI, leadingPathSI );
                intersect = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
                if ( intersections.length > 1 )
                    console.log( "Intersections found (B). " + intersections.length );
            } catch ( e ) {
                console.log( "No intersections found (B). " + pn.obj + " and " + n.obj );
            }
        }
        return intersect; //OR THROW? 
    }


    clipEnd( trailingPath, intersect )
    {
        if ( trailingPath instanceof GeoSpline )
        {
            //TODO if cutAtPoint doesn't work we could go back to our original non-extended curve and just extend that in a straight line to our intersect point
            return trailingPath.cutAtPoint( intersect ).beforePoint;
        }
        else
        {
            return new GeoLine( trailingPath.p1, intersect );
        }
    }


    clipStart( leadingPath, intersect ) 
    {
        if ( leadingPath instanceof GeoSpline )
        {
            //TODO if cutAtPoint doesn't work we could go back to our original non-extended curve and just extend that in a straight line to our intersect point
            const split = leadingPath.cutAtPoint( intersect );
            return split.afterPoint ? split.afterPoint : split.beforePoint;
        }
        else
        {
            return new GeoLine( intersect, leadingPath.p2 );
        }
    }


    drawSeamLine( g, editorOptions ) 
    {
        if ( this.ignore )
            return;

        if ( ! this.calculated )
            this.calculate();

        //console.log("Time to draw seam line: ", this.name );

        const p = g.append("path")
                 .attr("id","seam line - " + this.name )
                 .attr("class", "seamline" )
                 .attr("d", this.svgPath( false ) )
                 .attr("stroke-dasharray", "2,0.2" )
                 .attr("stroke-width", ( this.getStrokeWidth()/2) ); //TODO this has to be set according to scale;

        if ( editorOptions.downloadOption)
            p.attr("fill", "none" )
             .attr("stroke", "#929292");
        else if ( ! editorOptions.skipDrawing )
             p.attr( "opacity", "0.5" );
 
    }


    drawLabelsAlongSeamLine( g, useExportStyles ) 
    {
        if ( this.ignore )
            return;

        if ( ! this.calculated )
            this.calculate();

        //console.log("Time to draw seam line labels: ", this.name );

        let labelGroup;

        for ( const n of this.detailNodes )
        {
            if ( n.label )
            {
                const fontSize = this.drawing.pattern.getPatternEquivalentOfMM(6);

                if ( labelGroup === undefined )
                    labelGroup = g.append("g")
                                  .attr( "id", this.name + " - path labels" );

                if ( n.curveSegment)
                    this.drawing.drawLabelAlongPath( labelGroup, n.curveSegment, n.label, fontSize, true );
                else if ( n.line )
                    this.drawing.drawLabelAlongPath( labelGroup, n.line, n.label, fontSize, true );
            }
        }
    }


    drawSeamAllowance( g, editorOptions ) 
    {
        if ( this.ignore )
            return;

        if ( ! this.calculated )
            this.calculate();

        const p = g.append("path")
                 .attr("id","seam allowance - " + this.name )
                 .attr("class", "seamallowance" )
                 .attr("d", this.svgPath( true ) )
                 .attr("stroke-width", this.getStrokeWidth() ); //TODO this has to be set according to scale

        if ( editorOptions.downloadOption )
            p.attr("fill", "none")
             .attr("stroke", "black");
        else if ( ! editorOptions.skipDrawing )
            p.attr( "opacity", "0.5" );
    } 


    drawNotches( g, useExportStyles  )
    {
        if ( this.ignore )
            return;

        if ( ! this.detailNodes )
            return;

        if ( ! this.calculated )
            this.calculate();

        const notches = g.append("g").attr( "id", this.name + " - notches");
        console.log("*********");
        console.log("notches: " + this.name );

        const strokeWidth = this.getStrokeWidth();

        for (const n of this.detailNodes) 
        {
            if ( typeof n.notch === "undefined" )
                continue;

            const notchAngle = n.notchAngle === undefined ? 0 : n.notchAngle;
            const notchCount = n.notchCount === undefined ? 1 : n.notchCount;
            //default length of 0.25 is presumably 1/4 inch, not 0.25mm!. We treat 0.25 in the binding as not-set and not marshalled,
            //so if we get undefined here it means use the default notch length. 
            const notchLength = n.notchLength === undefined ? this.drawing.pattern.getPatternEquivalentOfMM( 0.25*25.4 ) : n.notchLength; 
            const notchWidth  = n.notchWidth === undefined ? this.drawing.pattern.getPatternEquivalentOfMM( 0.25*25.4 ) : n.notchWidth;      

            const roundForSVG = this.roundForSVG;

            const drawNotch = function( point, pointSA, tangentDeg, sa ) {

                let path = "";

                //One notch : 0    
                //Two notches : -0.5 +0.5    0-1  1-1   n-(c/2)+0.5
                //Three notches : -1 0 +1             
                for( let i = 0;  i < notchCount; i++ )
                {
                    const offset = i-(notchCount/2)+0.5;

                    const drawNotchMark = function( p, notchLength, otherPoint ) {

                        const offsetAmount = offset * notchWidth;
                        let start = p;
                        if ( offset != 0 )
                            start = start.pointAtDistanceAndAngleDeg( offsetAmount, tangentDeg + 90 );

                        let end;
                        if ( notchLength === undefined ) //drawing one notch from seamline to seamallowanceline
                            end = offset == 0 ? otherPoint
                                              : otherPoint.pointAtDistanceAndAngleDeg( offsetAmount, tangentDeg + 90 );
                        else
                            end = start.pointAtDistanceAndAngleDeg( notchLength, tangentDeg + 180 + notchAngle );

                        //notchType == "slit"
                        //TODO: tNotch; uNotch; vInternal vExternal castle diamond
                        path += "M" + roundForSVG( start.x ) + "," + roundForSVG( start.y ) + " L" + roundForSVG( end.x ) + "," + roundForSVG( end.y );
                    }

                    //In deliberate variation to Seamly2D, if notchLength < seamAllowance, and notchAngle == 0 then draw the notch from the seam
                    //allowance line to the seam line, but only if...
                    //there is a non-zero seam allowance, and there isn't specified 
                    //notch length.
                    if (     ( pointSA ) 
                          && ( sa > 0 )
                          && ( notchAngle === 0 ) 
                          && ( n.notchLength === undefined ||  notchLength < sa ) )
                    {
                        drawNotchMark( pointSA, undefined, point );
                    }
                    else if ( pointSA ) 
                    {
                        drawNotchMark( pointSA, notchLength );
                        drawNotchMark( point, notchLength );
                    }
                    else
                        drawNotchMark( point, notchLength );
                }

                //TODO should we connect these D3 data-wise to the notches
                const p = notches.append("path")
                    .attr("d", path )
                    .attr("class", "notch" )
                    .attr("stroke-width", strokeWidth); //TODO this has to be set according to scale

                if ( useExportStyles )
                    p.attr("fill", "none")
                        .attr("stroke", "black");
            };

            if ( n.notchesAlongPath !== undefined )            
            {
                //3 along the path means cutting it into 4.
                for ( let j=1; j<=n.notchesAlongPath; j++ )
                {
                    //1,2,3
                    const fractionAlongLine = j / ( n.notchesAlongPath + 1); //0.25, 0.5, 0.75
                    const p = n.curveSegment.pointAlongPathFraction( fractionAlongLine );
                    const sa = n.sa1;
                    const tinyBitFurtherAlongLine = fractionAlongLine + 0.0001;
                    const p2 = n.curveSegment.pointAlongPathFraction( tinyBitFurtherAlongLine );
                    const tangentDeg = (new GeoLine( p, p2 )).angleDeg() + 90.0;
                    const pSA = n.curveSegmentSA === undefined ? undefined : p.pointAtDistanceAndAngleDeg( sa, tangentDeg );
                    drawNotch( p, pSA, tangentDeg, sa );
                }
            }
            else if ( n.point !== undefined )
            {
                //Normal point notch
                const tangentDeg = n.pointEndSA ? (new GeoLine( n.point, n.pointEndSA)).angleDeg() : n.tangentAfterDeg;
                drawNotch( n.point, n.pointEndSA, tangentDeg, n.sa2 );
            }
        };
    }    


    drawInternalPaths( g, useExportStyles  )
    {
        if ( this.ignore )
            return;

        let internalPathsGroup;

        const strokeWidth = Math.round( this.getStrokeWidth()/2 * 10000 )/10000;

        if ( this.internalPaths )
        {
            for( const ip of this.internalPaths )
            {
                if ( internalPathsGroup === undefined )
                    internalPathsGroup = g.append("g")
                                          .attr("id", this.name + " - internal paths");        

                if ( ip.nodes )
                    this.drawInternalPath( internalPathsGroup, ip, strokeWidth, useExportStyles );
            }
        }
    }


    drawInternalPath( internalPathsGroup, internalPath, strokeWidth, useExportStyles )
    {
        if ( this.ignore )
            return;

        let path; //path as SVG
        let geopath; //path as GeoSpline - so we can find the mid-point for adding the length

        let previousP;
        for  (let a=0; a<internalPath.nodes.length; a++ )
        {
            const n = internalPath.nodes[ a ];
            
            let curve;

            if (( n.arc instanceof GeoArc ) || ( n.arc instanceof GeoEllipticalArc ))
                curve = n.arc.asGeoSpline();
            else if ( n.curve instanceof GeoSpline )
                curve = n.curve;

            if ( curve )
            {
                if ( previousP )
                {
                    const cut = curve.cutAtPoint( previousP );
                    curve = cut.afterPoint ? cut.afterPoint : cut.beforePoint;
                }

                const nextNode = a+1 < internalPath.nodes.length ? internalPath.nodes[ a+1 ] : undefined;
                if ( nextNode?.p )
                {
                    const cut = curve.cutAtPoint( nextNode.p );
                    curve = cut.beforePoint;
                }

                path = curve.svgPath( path );
                geopath = geopath === undefined ? curve : geopath.extend( curve );
                previousP = curve.pointAlongPathFraction(1);
            }
            else
            {
                path = this.lineTo( path, n.p );
                geopath = geopath === undefined ? new GeoSpline([{  inControlPoint:   undefined,
                                                                    point:            n.p,
                                                                    outControlPoint:  n.p } ]) : geopath.extend( n.p );
                previousP = n.p;
            }
        }

        //nb path and geopath.svgPath() should be equivalent, though they won't be identical.
        //console.log( "Path " + path );
        //console.log( "GeoPath " + geopath );

        if ( internalPath.showLength !== undefined ) //we don't draw a label, though we could use label as 100% and line as 50%
        {
            //TODO use non-semantic-scaling font size that we use for labels
            let l = geopath.pathLength(); //"TODO";//this.getLengthAndUnits();

            if ( l !== undefined )
            {
                const patternUnits = this.drawing.pattern.units;
                const precision = patternUnits === "mm" ? 10.0 : 100.0;
                l = Math.round( precision * l ) / precision;            
                l = l + " " + patternUnits;    
            }

            const fontSize = this.drawing.pattern.getPatternEquivalentOfMM(6); //6mm equiv
            this.drawing.drawLabelAlongPath( internalPathsGroup, geopath, l, fontSize, true );    
        }

        const p = internalPathsGroup.append("path")
            .attr("d", path )
            .attr("class", "internalpath" )
            .attr("fill", "none")
            .attr("stroke-width", strokeWidth); //TODO this has to be set according to scale

        if ( useExportStyles )
            p.attr("stroke", "black");

        if ( internalPath.lineStyle ) 
        {
            let dasharray;

            switch( internalPath.lineStyle )
            {
                case "dotLine":        dasharray = "0.25 0.25"; break;
                case "dashLine":       dasharray = "1 0.25"; break;
                case "dashDotLine":    dasharray = "1 0.25 0.25 0.25"; break;
                case "dashDotDotLine": dasharray = "1 0.25 0.25 0.25 0.25 0.25"; break;
            }
        
            if ( dasharray )
                p.attr("stroke-dasharray", dasharray );  
        }
    }


    drawMarkings( g, useExportStyles )
    {
        if ( this.ignore )
            return;

        const lineSpacing = 1.2;
        let fontSize = this.drawing.pattern.getPatternEquivalentOfPT( 16 ); 
        let align = "start";

        if ( this.dataPanels )
        for( const panel of this.dataPanels )
        {
            if ( ! panel.dataItem )
                continue;

            if ( panel.fontSize )
                fontSize = this.drawing.pattern.getPatternEquivalentOfPT( panel.fontSize );

            let x;
            let y;
            if ( typeof panel.topLeft === "object" )
            {
                x = panel.topLeft.p.x;
                y = panel.topLeft.p.y;
            }
            if ( typeof panel.center === "object" )
            {
                //TODO we need to center it!!
                x = panel.center.p.x;
                y = panel.center.p.y;
                align = "middle";
            }
            if ( typeof panel.bottomRight === "object" )
            {
                x = panel.bottomRight.p.x;
                y = panel.bottomRight.p.y;
                align = "end";
            }
            if ( x === undefined ) 
            {
                const bounds = new Bounds();
                this.adjustBounds( bounds );
                x = ( bounds.minX + bounds.maxX ) / 2;
                y = ( bounds.minY + bounds.maxY ) / 2;
                align = "middle";
                y = y + (panel.dataItem.length * fontSize * lineSpacing / 2)
            }

            if ( align === "middle" )
                y -= panel.dataItem.length * fontSize * lineSpacing / 2;
            else if ( align === "bottom" )
                y -= panel.dataItem.length * fontSize * lineSpacing;

            const dataPanelGroup = g.append("text")
                                  .attr("id","data panel:" + panel.letter )
                                  .attr("class","patternlabel")
                                  .attr("transform", "translate(" + x + "," + y + ")" )
                                  //.attr("text-anchor", align ) //dominant-baseline="middle"
                                  .attr("font-size", fontSize );

            for( const dataItem of panel.dataItem )
            {
                let text = dataItem.text;

                if ( text.includes( "%date%" ) )
                    text = text.replace("%date%", this.drawing.pattern.getDate() );

                if ( text.includes( "%pLetter%" ) )
                    text=text.replace( "%pLetter%", panel.letter );
                
                if ( text.includes( "%pName%" ) )
                    text=text.replace( "%pName%", this.name );

                if ( text.includes( "%pOrientation%" ) )
                    text=text.replace( "%pOrientation%", panel.orientation );

                if ( text.includes( "%pQuantity%" ) )
                    text=text.replace( "%pQuantity%", panel.quantity );

                if ( text.includes( "%pAnnotation%" ) )
                    text=text.replace( "%pAnnotation%", panel.annotation );

                if ( text.includes( "%wOnFold%" ) )
                    text=text.replace( "%wOnFold%", panel.onFold ? "on fold" : "" );

                if ( text.includes( "%pFoldPosition%" ) )
                    text=text.replace( "%pFoldPosition%", panel.foldPosition );

                if ( text.includes( "%patternNumber%" ) )
                {
                    let patternNumber = this.drawing.pattern.patternData.patternNumber;
                    if ( patternNumber === undefined )
                        patternNumber = "";
                    text=text.replace( "%patternNumber%", patternNumber );
                }

                if ( text.includes( "%patternName%" ) )
                    text=text.replace( "%patternName%", this.drawing.pattern.patternData.name );

                dataPanelGroup.append("tspan")
                              .attr("x", "0" )
                              .attr("dy", lineSpacing*fontSize )
                              .attr("text-anchor", align )
                              //textLength - specify a size and the text will scale? 
                              //style="font-weight: bold;"
                              .text( text );
                ;
            }
        }
    }


    convertMMtoPatternUnits( mm )
    {
        if ( this.drawing.pattern.units = "cm" )
            return mm/10;
        else if ( this.drawing.pattern.units = "mm" )
            return mm;
        else //inches
            return mm/25.4;
    }


    getStrokeWidth( isOutline, isSelected )
    {
        if ( this.drawing.pattern.data.options.lifeSize ) 
            return this.drawing.pattern.getPatternEquivalentOfMM(0.4); //0.4mm equiv
            
        return Math.round( 1000 * ( isOutline ? 7.0 : ( isSelected ? 3.0 : 1.0 ) ) / scale / fontsSizedForScale ) /1000;
    }


    svgPath( withSeamAllowance )
    {
        if ( this.ignore )
            return;

        if ( ! this.detailNodes )
            return;

        console.log("*********");
        console.log("svgPath: " + this.name + " seamAllowance:" + withSeamAllowance );

        let path;
        let pn = this.detailNodes[ this.detailNodes.length -1 ];

        for (let a = 0; a < this.detailNodes.length+1; a++) {  //+1 because we circle right around to the start

            const n = this.detailNodes[ ( a == this.detailNodes.length ) ? 0 : a ]; //circle back to the first object at the end. 
         
            if ( n.skipPoint )
                continue;

            if ( withSeamAllowance )
            {
                if ( pn.reducedSAPoint ) //nb if !path then M rather than L as below? 
                    path = this.lineTo( path, pn.reducedSAPoint );

                if ( n.increasingSAPoint ) //nb if !path then M rather than L as below? 
                    path = this.lineTo( path, n.increasingSAPoint );
            }

            if ( n.curveSegment )
            {
                const curveSegmentToDraw = withSeamAllowance ? n.curveSegmentSA : n.curveSegment;

                path = curveSegmentToDraw.svgPath( path ) + " ";
            }
            else
            {
                const thisP = withSeamAllowance ? n.pointEndSA : n.point;

                if ( withSeamAllowance && n.pointStartSA )
                {
                    path = this.lineTo( path, n.pointStartSA );
                }

                path = this.lineTo( path, thisP );
            }

            pn = n;
        };

        //TODO actually close the SVG path? 

        //console.log( "Path: " + path );

        return path;        
    }


    lineTo( path, p )
    {
        if ( ! path )
            path = "M" + this.roundForSVG( p.x ) + "," + this.roundForSVG( p.y ) + " ";
        else
            path += "L" + this.roundForSVG( p.x ) + "," + this.roundForSVG( p.y ) + " ";

        return path;
    }


    adjustBounds( bounds, includeOffset )
    {
        if ( this.ignore )
            return;

        if ( ! this.detailNodes )
            return;

        if ( ! this.calculated )
            this.calculate();

        const mx = includeOffset && this.data.mx ? this.data.mx : 0.0;
        const my = includeOffset && this.data.my ? this.data.my : 0.0;
        const offset = { mx: mx, my: my };

        for ( const n of this.detailNodes ) {

            if ( n.pointEndSA )
                bounds.adjustToIncludeXY( n.pointEndSA.x + mx, n.pointEndSA.y + my );

            if ( n.pointStartSA )
                bounds.adjustToIncludeXY( n.pointStartSA.x + mx, n.pointStartSA.y + my );

            if ( n.curveSegmentSA )
                n.curveSegmentSA.adjustBounds( bounds, offset ); 

            //In case we're not drawing the seam allowance.     
            if ( n.point )
                bounds.adjustToIncludeXY( n.point.x + mx, n.point.y + my );
            else if ( n.curveSegment )
                n.curveSegment.adjustBounds( bounds, offset );
        }
    }


    roundForSVG( n )
    {
        return Math.round( n * 1000 ) / 1000;
    }


    setDependencies( dependencies ) 
    {
        if ( this.ignore )
            return;

        for ( const d of  this.detailNodes ) 
        {
            dependencies.add( this, d.dObj );

            //TODO also drawing objects used by expressions used as node seam allowances
        }

        if ( this.internalPaths )
        {
            for( const ip of this.internalPaths )
            {
                if ( ! ip.nodes )
                    return; 
                
                for( const n of ip.nodes )
                {
                    dependencies.add( this, n );
                }
            }
        }

        //TODO also nodes used as anchors for data. 
    }    


    sanitiseForHTML ( s ) {
        return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    };


    html() 
    {
        //for the table
        return "piece: <span class=\"ps-name\">" + this.sanitiseForHTML( this.name ) + "</span>";
    }


    drawPiece( editorOptions )
    {
        if ( ! this.calculated )
            this.calculate();

        const simplify = ( editorOptions.thumbnail ) && ( editorOptions.targetPiece === "all" );        
        const g = this.svg;
        g.selectAll().remove();

        if ( this.data.seamAllowance )
            this.drawSeamAllowance( g, editorOptions ); //do this first as it is bigger and we want it underneath in case we fill 

        if ( ! this.data.hideMainPath )    
            this.drawSeamLine( g, editorOptions );

        if ( ! simplify )
        {
            const useExportStyles = editorOptions.downloadOption;

            this.drawInternalPaths( g, useExportStyles );
            this.drawNotches( g, useExportStyles );
            this.drawMarkings( g, useExportStyles );
            this.drawLabelsAlongSeamLine( g, useExportStyles );
        }
    }
}
//(c) Copyright 2019 Jason Dore
//https://github.com/MrDoo71/PatternEditor



class PatternDrawing {

    constructor (data, pattern) {
        this.data = data;
        this.drawing = {};
        this.pattern = pattern;
        this.textPathSeq = 0;

        if (data) {
            this.name = data.name;
            this.drawingObjects = data.drawingObject;
        }
        else {
            this.drawingObjects = [];            
        }
        this.bounds = new Bounds();
        this.visibleBounds = new Bounds();
        this.groups = [];
        this.pieces = [];

        if ( pattern ) //always true, except in some test harnesses
        {
            this.bounds.parent = pattern.bounds;
            this.visibleBounds.parent = pattern.visibleBounds;
        }

        this.init();
    }
    
    init() {
        if (!this.data)
            return;
        
        //Take each drawingObject in the JSON and convert to the appropriate 
        //type of object.
        for ( const a in this.drawingObjects ) {
            let dObj = this.drawingObjects[a];
            dObj = this.newDrawingObj(dObj);
            
            if (dObj === null)
                continue;
            
            this.drawingObjects[a] = dObj; //these are now the objects with methods
            this.drawing[dObj.data.name] = dObj;
            dObj.drawing = this;    
            this.calculateObj(dObj);
        }

        //Take each group in the JSON and convert to an object. 
        //After this the isVisible() method on the drawingObject will work. 
        if ( this.data.group )
            for ( let a=0; a<this.data.group.length; a++ ) {
                this.groups[a] = new Group( this.data.group[a], this );
            }
        
        if ( this.data.piece )
            for ( let a=0; a<this.data.piece.length; a++ ) {
                this.pieces[a] = new Piece( this.data.piece[a], this );
            }

        const options = this.pattern.data.options; 
        if ( options && ( typeof options.targetPiece === "object" ) )
        {
            options.targetPiece.adjustBounds( this.visibleBounds );
        }
        else if ( options && ( options.targetPiece === "all" ) ) //TODO also an array with specific multiple pieces specified
        {
            for ( const p of this.pieces ) {

                //Skip non-default pieces when making thumbnail
                if ( options.thumbnail && ! p.data.inLayout )
                    continue;

                p.adjustBounds( this.visibleBounds, true );
            }
        }
        else
        {
            //This ensures the seam allowance is included in the bounds
            if ( this.pieces )
            {
                for ( const p of this.pieces ) {
                    p.adjustBounds( this.visibleBounds );
                }    
            }

            //Calculate the visible bounds            
            for ( const dObj of this.drawingObjects )
            {
                if (   ( dObj.isVisible( options ) )
                    && ( dObj.data.lineStyle !== "none" ) )         
                {
                    try {
                        dObj.adjustBounds( this.visibleBounds );
                    } catch ( e ) {
                        console.log("Error adjusting bounds for " + dObj.name + " ", e );
                    }
                }
            }
        }

    }

    
    getObject(name, thisPieceOnly) {
        if (typeof name === "object")
            return name;

        const objOnThisPiece = this.drawing[name];
        if ( objOnThisPiece )
            return objOnThisPiece;

        //If we are finding a drawing object for a length etc. then we are allowed to reference other
        //pieces.  And should ask the pattern for the object. But if we are here because we are scanning the whole pattern
        //already then we shouldn't recurse back to the pattern.
        if ( ! thisPieceOnly )
            return this.pattern.getObject(name);
    }

    //TODO make this a static method of DrawingObject
    newDrawingObj(dObj) {
        switch( dObj.objectType )
        {
            case "pointSingle":               return new PointSingle(dObj);
            case "pointEndLine":              return new PointEndLine(dObj);
            case "pointAlongLine":            return new PointAlongLine(dObj);
            case "pointAlongPerpendicular":   return new PointAlongPerpendicular(dObj);
            case "pointAlongBisector":        return new PointAlongBisector(dObj);            
            case "pointFromXandYOfTwoOtherPoints": return new PointFromXandYOfTwoOtherPoints(dObj);
            case "pointIntersectLineAndAxis": return new PointIntersectLineAndAxis(dObj);
            case "line":                      return new Line(dObj);
            case "pointLineIntersect":        return new PointLineIntersect(dObj);
            case "pointIntersectArcAndAxis":  return new PointIntersectArcAndAxis(dObj);
            case "pointIntersectArcAndLine":  return new PointIntersectArcAndLine(dObj);
            case "perpendicularPointAlongLine": return new PerpendicularPointAlongLine(dObj);
            case "pointOfTriangle":           return new PointOfTriangle(dObj);            
            case "pointShoulder":             return new PointShoulder(dObj);            
            case "arcSimple":                 return new ArcSimple(dObj);
            case "arcElliptical":             return new ArcElliptical(dObj);
            case "splineSimple":              return new SplineSimple(dObj);
            case "splineUsingPoints":         return new SplineUsingControlPoints(dObj);
            case "splinePathInteractive":     return new SplinePathInteractive(dObj);
            case "splinePathUsingPoints":     return new SplinePathUsingPoints(dObj);
            case "cutSpline":                 return new CutSpline(dObj);
            case "pointCutSplinePath":        return new PointCutSplinePath(dObj);      
            case "pointCutArc":               return new PointCutArc(dObj);                              
            case "pointIntersectCurves":      return new PointIntersectCurves(dObj);      
            case "pointIntersectCurveAndAxis":return new PointIntersectCurveAndAxis(dObj);      
            case "pointIntersectArcs":        return new PointIntersectArcs(dObj);      
            case "pointIntersectCircles":     return new PointIntersectCircles(dObj);                  
            case "operationMove":             return new OperationMove(dObj);                  
            case "operationRotate":           return new OperationRotate(dObj);                  
            case "operationFlipByAxis":       return new OperationFlipByAxis(dObj);                  
            case "operationFlipByLine":       return new OperationFlipByLine(dObj);                  
            case "operationResult":           return new OperationResult(dObj);                  
            case "pointFromArcAndTangent":    return new PointFromArcAndTangent(dObj);                  
            case "pointFromCircleAndTangent": return new PointFromCircleAndTangent(dObj);                  
            case "trueDart":                  return new TrueDart(dObj);                              
            case "trueDartResult":            return new TrueDartResult(dObj);                              
            case "arcWithLength":             return new ArcWithLength(dObj);                              
        default:
            const fail = new PointSingle( {x:0, y:0, contextMenu:dObj.contextMenu } );
            fail.error =  "Unsupported drawing object type:" + dObj.objectType;
            return fail;
        }
    }

    newFormula(formula) {

        const patternUnits = this.pattern.units;
        const f = formula;
        if (typeof formula.constant !== "undefined") {
            f.value = function () {
                return this.constant;
            };
            f.html = function() {
                return this.constant;
            };
            f.htmlLength = function() {
                const precision = patternUnits === "mm" ? 10.0 : 100.0;
                const s = Math.round( precision * this.constant ) / precision;
                return '<span class="const">' + s + " " + patternUnits + '</span>';
            };
            f.htmlAngle = function() {
                const s = Math.round( 10.0 * this.constant ) / 10.0;
                return '<span class="const">' + s + "&#176;" + '</span>';
            };
        }
        else if (typeof formula.expression === "object") {
            f.expression = new Expression( f.expression, this.pattern, this );
            f.value = function (currentLength) {
                const v = f.expression.value(currentLength);
                if ( Number.isNaN( v ) )
                    throw new Error( "Formula result is not a number. " );
                return v;
            };
            f.html = function( asFormula, currentLength ) {
                return f.expression.html( asFormula, currentLength );
            };
            f.htmlLength = function( asFormula, currentLength ) {
                let s = f.expression.html( asFormula, currentLength );
                if ( ! asFormula )
                {
                    const precision = patternUnits === "mm" ? 10.0 : 100.0;
                    s = Math.round( precision * s ) / precision;
                    s += " " + patternUnits;
                }
                return s;
            };
            f.htmlAngle = function( asFormula, currentLength ) {
                let s = f.expression.html( asFormula, currentLength );
                if ( ! asFormula )
                {
                    s = Math.round( 10.0 * s ) / 10.0;
                    s += "&#176;"; //degrees
                }
                return s;
            };
        }
        return f;
    }

    calculateObj(dObj) {

        if (typeof dObj.calculate !== "undefined") {
            
            try {
                dObj.calculate(this.bounds);

            } catch (e) {
                dObj.error = "Calculation failed. " + e;
            }

        }
    }

    pointSingle(data) {
        data.objectType = "pointSingle";
        const dObj = this.add( data );
        return dObj;
    }

    add(data) {
        console.log("Add() is this used anywhere?");

        if (this.defaults) {
            for (const d in this.defaults) {
                if (typeof data[d] === "undefined")
                    data[d] = this.defaults[d];
            }
        }
        const dObj = this.newDrawingObj(data);
        this.drawingObjects.push(dObj);
        this.drawing[dObj.data.name] = dObj;
        dObj.drawing = this;
        this.calculateObj(dObj);
        return dObj;
    }


    setDefaults(defaults) {
        this.defaults = defaults;
    }


    //Add a label (to svg group g) positioned midway along path
    drawLabelAlongPath( g, path, label, fontSize, followPathDirection )
    {
        fontSize = fontSize ? fontSize 
                            : Math.round( 1300 / scale / fontsSizedForScale )/100; //if both scale == 1 then 13.0 underlying units

        if ( followPathDirection )
        {   
            //Use a parallel path inset from the one provided
            if ( path instanceof GeoSpline )
                path = path.parallelCurve( -fontSize ).offsetCurve;
            else if ( path instanceof GeoLine )
                path = new GeoLine( path.p1.pointAtDistanceAndAngleDeg( -fontSize, path.angleDeg() + 90 ),
                                    path.p2.pointAtDistanceAndAngleDeg( -fontSize, path.angleDeg() + 90 ) );

            const pathSVG = path.svgPath();
            const pathID = "tp" + CryptoJS.MD5( pathSVG ).toString();
            g.append("path")
                .attr( "id", pathID )
                .attr( "visibility", "hidden" )
                .attr( "fill", "none" )
                .attr( "d", pathSVG ); 

            g.append("text")
                .attr("class","alongPath")
                .attr("font-size", fontSize )
                .append( "textPath" )
                .attr( "xlink:href", "#" + pathID )
                .attr( "startOffset", "50%" )
                .attr( "text-anchor", "middle" )
                .attr( "side", "left" )
                .text( label ); 
            return;
        }
        
        try {
            const p = path.pointAlongPathFraction(0.5);
            let a = 0; //horizontal, unless we get an angle. 
            if ( path instanceof GeoLine  )
            {
                a = path.angleDeg();
            }
            else if ( path instanceof GeoSpline )
            {
                const p2 = path.pointAlongPathFraction(0.5001);
                const lineSegment = new GeoLine(p, p2);
                a = lineSegment.angleDeg();
            }

            if ( ! p )
                throw new Error( "Failed to determine position for label." );

            {
                let baseline = "middle";
                let align = "middle";
                let ta = 0;
                let dy = 0;
                //const patternUnits = this.drawing.pattern.units;
                // /const spacing = (fontSize * 0.2);
                const spacing = this.pattern.getPatternEquivalentOfMM(1);
    
                if ( followPathDirection )
                {
                    baseline = "hanging"; //For Safari, handing doesn't work once rotated
                    ta = -a;
                    dy = spacing;
                }
                else
                {
                    // East(ish)
                    if ((( a >= 0 ) && ( a <45 )) || (( a > 270 ) && ( a <= 360 )))
                    {
                        baseline = "hanging"; //For Safari, handing doesn't work once rotated
                        ta = - a;
                        dy = spacing;
                    }
                    // West(ish)
                    else if (  (( a >= 135 ) && ( a <225 )) 
                    )//|| (( a > 270 ) && ( a <315 ))  )
                    {
                        baseline = "hanging";
                        ta = - (a-180);
                        dy = spacing;
                    }
                    //North(ish)
                    else if (( a > 45 ) && ( a < 135 )) 
                    {
                        baseline = "middle";//"auto"
                        align = "middle";
                        ta = -a;
                        p.x -= spacing;
                    }
                    //South(ish)
                    else if (( a > 225 ) && ( a <= 270 )) 
                    {
                        baseline = "auto"
                        align = "middle";
                        ta = - ( a-180 );
                        p.x -= spacing;
                    }
                }

                g.append("text")
                .attr("class","alongPath")
                .attr( "transform", "translate(" + p.x + "," + p.y +  ") rotate("+ta+")" )
                .attr( "dominant-baseline", baseline ) //if we're drawing below the line. 
                .attr( "text-anchor", align ) //if we're drawing to the left of the line
                .attr( "dy", dy + "px" ) //need to also scale this
                .attr("font-size", fontSize + "px")
                .text( label ); //TODO make this more generic to cater for different types.
    
            }
        } catch ( e ) {
            console.log( "Failed to show length. ", e );            
        }
    }    
}


//(c) Copyright 2019-20 Jason Dore
//
//Inspired by the excellent Seamly2D/Valentina pattern drawing software.
//This library is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the Seamly2D/Valentina pattern making systen in order to support the community
//pattern sharing website https://my-pattern.cloud/ . 
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

let selectedObject;
let linksGroup;
let fontsSizedForScale = 1;
let fontResizeTimer;
let updateServerTimer;
let timeOfLastTweak;
let doDrawingAndTable;

function drawPattern( dataAndConfig, ptarget, graphOptions ) 
{
    //Remove the svg if called by graph_kill
    if ( dataAndConfig === null )
    {
        const parent = document.getElementById(ptarget).parentNode;
        const child = document.getElementById(ptarget);
        parent.removeChild(child);
        return ;
    } 

    //This is a graph initialisation

    if ( ! dataAndConfig.options )
        dataAndConfig.options = {};

    const options = dataAndConfig.options;

    options.interactionPrefix = graphOptions.interactionPrefix;

    const targetdiv = d3.select( "#" + ptarget )
                       .append( "div" )
                       .attr( "class", "pattern-editor" );

    let pattern;
    try {
        pattern = new Pattern( dataAndConfig, graphOptions );            
    } catch ( e ) {
        if ( ! options.thumbnail )
            targetdiv.append("div")
                .attr( "class", "alert alert-warning" )
                .text( "Pattern draw failed.");

        console.log("Failed to load pattern: ", e );

        try {
            const failMessage = 'FAIL:' + e.message;
            const failMessageHash = CryptoJS.MD5( failMessage ).toString();
            if (    ( options.returnSVG !== undefined ) 
                 && ( dataAndConfig.options.currentSVGhash !== failMessageHash )
                 && ( options.returnID ))
            {
                const kvpSet = newkvpSet(true);
                kvpSet.add( 'svg', failMessage );
                kvpSet.add( 'id', options.returnID ) ;
                goGraph( options.interactionPrefix + ':' + options.returnSVG, fakeEvent(), kvpSet);
            }
        } catch ( f ) {
        }
        
        return;
    }
        

    if ( options.allowPanAndZoom === undefined )
        options.allowPanAndZoom = true;

    if ( options.showFormulas === undefined )
        options.showFormulas = true;

    if ( options.drawingTableSplit === undefined )
        options.drawingTableSplit = 0.66;

    if ( options.skipDrawing === undefined )
        options.skipDrawing = false;

    if ( options.skipPieces === undefined )
        options.skipPieces = false;

    if ( options.thumbnail === undefined )
        options.thumbnail = false;

    if ( options.interactive === undefined )
        options.interactive = ! options.thumbnail;

    if ( options.lastMixedSplit === undefined )
        options.lastMixedSplit = options.drawingTableSplit > 0.0 && options.drawingTableSplit < 1.0 ? options.drawingTableSplit : 0.66;

    if ( ! options.viewOption )
        options.viewOption = [  { "mode":"drawing", "icon": "icon-picture",       "drawingTableSplit": 1.0 },
                                { "mode":"mixed",   "icon": "icon-columns",       "drawingTableSplit": 0.5 },
                                { "mode":"table",   "icon": "icon-align-justify", "drawingTableSplit": 0 } ];

    // show menu on right-click.
    const contextMenu = options.interactive && typeof goGraph === "function" ? function(d) {
        if ( d.contextMenu )
        {
            d3.event.preventDefault() ;
            const v = newkvpSet(false) ;
            v.add("x", d.x) ;   
            v.add("y", d.y) ;    
            goGraph( graphOptions.interactionPrefix + ':' + d.contextMenu ,
                    d3.event, 
                    v ) ;
        }
    } : undefined; //function(d){};     

    options.layoutConfig = { drawingWidth: 400,
                             drawingHeight: 600,
                             drawingMargin: 0,
                             tableWidth: 400,
                             tableHeight: 600,
                             tableMargin: 0 };

    if ( ! options.translateX )                                           
        options.translateX = 0;

    if ( ! options.translateY )                                           
        options.translateY = 0;

    if ( ! options.scale )                                           
        options.scale = 1;

    options.setDrawingTableSplit = function( drawingTableSplit ) { //can be called with a decimal (0.0 - 1.0), a mode ("drawing","mixed","table"), or nothing.

        //TODO if going full-screen and not specifying a split here, then keep the table the same width and give all extra space to the drawing
        
        if ( drawingTableSplit === undefined )
            drawingTableSplit = this.drawingTableSplit;
        else if ( drawingTableSplit === "drawing" )
            drawingTableSplit = 1.0;
        else if ( drawingTableSplit === "mixed" )
            drawingTableSplit = this.lastMixedSplit ? this.lastMixedSplit : 0.5;
        else if ( drawingTableSplit === "table" )
            drawingTableSplit = 0.0;

        if ( drawingTableSplit < 0.05 ) 
        {
            drawingTableSplit = 0.0;
            this.drawingTableSplitMode = "table";
        }
        else if ( drawingTableSplit > 0.95 ) 
        {
            drawingTableSplit = 1.0;
            this.drawingTableSplitMode = "drawing";
        }
        else
        {
            this.drawingTableSplitMode = "mixed";
            this.lastMixedSplit = drawingTableSplit;
        }

        let availableWidth = ( options.maxWidth ) ? options.maxWidth : Math.round( window.innerWidth - 30 -32 ); //30 for resize bar & 32 for scroll bars as not all systems hide scroll bars
        let availableHeight = ( options.maxHeight ) ? options.maxHeight : Math.round( window.innerHeight - targetdiv.node().getBoundingClientRect().top -60/*controlpanel buttons height*/);
        if ( this.fullWindow )
        {
            availableWidth -= 32; //left & right padding 
            availableHeight -= 30;
        }

        //console.log("setDrawingTableSplit availableWidth:" + availableWidth + " fullWindow:" + this.fullWindow + " drawingWidth:" + this.layoutConfig.drawingWidth );
        this.layoutConfig.drawingWidth = availableWidth * drawingTableSplit;
        this.layoutConfig.tableWidth   = availableWidth * (1-drawingTableSplit);
        this.layoutConfig.drawingHeight = availableHeight;
        this.layoutConfig.tableHeight = availableHeight;
        //console.log("setDrawingTableSplit split:" + drawingTableSplit + " availableWidth:" + availableWidth + " fullWindow:" + this.fullWindow + " drawingWidth:" + this.layoutConfig.drawingWidth );
        
        if ( this.sizeButtons )
        {
            const drawingTableSplitMode = this.drawingTableSplitMode;
            this.sizeButtons.selectAll("button")
                        .data( this.viewOption )
                        //.enter()
                        //.append("button")
                        .attr( "class",  function(d) { 
                            return d.mode === drawingTableSplitMode ? "btn btn-primary" : "btn btn-default" } );
        }

        if ( this.drawingTableSplit !== drawingTableSplit )
        {
            this.drawingTableSplit = drawingTableSplit; //so we can call this without a parameter when toggling full size. 
            if ( this.updateServer ) 
                this.updateServer(); 
        }
    };    

    options.updateServer = graphOptions.interactionPrefix && options.update ? function( k, x, y ) {
        if ( k )
        {
            if (    (options.translateX === x)
                 && (options.translateY === y)
                 && (options.scale === k) )
                 return;

            options.translateX = x;
            options.translateY = y;
            options.scale = k;
        }

        if ( $("div.popover").length )
        {
            console.log("Skipping server update as there is an overlay form. " );
            return;
        }

        console.log("Update server with pan: " + x + "," + y + " & zoom:" + k + " & options");
        const kvpSet = newkvpSet(true) ;
        kvpSet.add('fullWindow', options.fullWindow ) ;
        kvpSet.add('drawingTableSplit', options.drawingTableSplit ) ;
        kvpSet.add('scale', options.scale ) ;
        kvpSet.add('translateX', options.translateX ) ;
        kvpSet.add('translateY', options.translateY ) ;        
        goGraph( options.interactionPrefix + ':' + options.update, fakeEvent(), kvpSet) ;    
    } : undefined;

    if ( options.fullWindow )
        targetdiv.node().classList.add("full-page");

    options.setDrawingTableSplit( options.drawingTableSplit ); //shouln't cause a server update

    let focusDrawingObject = ! options.interactive ? undefined : function( d, scrollTable )
    {        
        if (    ( d3.event?.originalTarget?.className === "ps-ref" )
             && ( selectedObject === d )
             )
        {
            //Clicking on a reference to another drawing object, scroll to it. 
            selectedObject = d.drawing.getObject( d3.event.originalTarget.innerHTML );
            scrollTable = true;
        }
        else if (    ( d3.event?.srcElement?.className === "ps-ref" )
                  && ( selectedObject === d )
             )
        {
            //Clicking on a reference to another drawing object, scroll to it. 
            selectedObject = d.drawing.getObject( d3.event.srcElement.innerHTML );
            scrollTable = true;
        }
        else
        {
            //Not clicking on a reference, so we've selected what we clicked on
            selectedObject = d;
        }

        //Adjust the stoke width of related items in the drawing
        for( const drawing of pattern.drawings )
            for( const a of drawing.drawingObjects )
            {
                const g = a.drawingSvg;
                if ( g )
                {
                    const strokeWidth = a.getStrokeWidth( false, (selectedObject===a) );

                    g.selectAll( "line" )
                     .attr("stroke-width", strokeWidth );

                    g.selectAll( "path" )
                     .attr("stroke-width", strokeWidth );

                    g.selectAll( "ellipse" )
                     .attr("stroke-width", strokeWidth );
                }
            }        

        const graphdiv = targetdiv;

        //Remove any existing highlighting in the table. 
        $(graphdiv.node()).find( ".j-active" ).removeClass("j-active").removeClass("j-active-2s");
        $(graphdiv.node()).find( ".source" ).removeClass("source");
        $(graphdiv.node()).find( ".target" ).removeClass("target");

        //d, the drawing object we clicked on, has a direct reference to its representation in the table
        if ( selectedObject )
        {
            if ( selectedObject.tableSvg ) //should always be set unless there has been a problem
                selectedObject.tableSvg.node().classList.add("j-active");

            if ( selectedObject.drawingSvg )
                selectedObject.drawingSvg.node().classList.add("j-active");

            if ( selectedObject.outlineSvg )
            {
                selectedObject.outlineSvg.node().classList.add("j-active");
                const selectedObjectToAdjustAfter2Secs = selectedObject; //The user may have clicked on something else within 2 seconds
                //the blush will only last 2 seconds anyway, but if we don't do this then a second click whilst it is the active one doesn't repeat the blush
                setTimeout( function(){ selectedObjectToAdjustAfter2Secs.outlineSvg.node().classList.add("j-active-2s");}, 2000 );
            }
        }

        //Set the css class of all links to "link" "source link" or "target link" as appropriate.
        if ( linksGroup )
            linksGroup.selectAll("path.link") //rename .link to .dependency
                      .attr("class", function( d ) {
                        let classes = "link";
                        if ( d.source === selectedObject ) 
                        {
                            d.target.tableSvg.node().classList.add("source");

                            if ( d.target.outlineSvg ) //if it errored this will be undefined
                                d.target.outlineSvg.node().classList.add("source");

                            classes += " source";
                        }
                        if ( d.target === selectedObject ) 
                        {
                            d.source.tableSvg.node().classList.add("target");

                            if ( d.source.outlineSvg ) //if it errored this will be undefined
                                d.source.outlineSvg.node().classList.add("target");

                            classes += " target";
                        }
                        if ( d.source instanceof Piece )
                            classes += " piece";

                        return classes; 
                      } )
                      .each( function( d ) { 
                        if (( d.source === selectedObject ) || ( d.target === selectedObject ))
                            d3.select(this).raise();
                      } );

        //Scroll the table to ensure that d.tableSvg is in view.    
        if ( scrollTable && selectedObject )
        {
            if ( selectedObject.tableSvg )
            {
                const table = d3.select("div.pattern-table");
                table.transition()
                     .duration(500)
                     .tween("uniquetweenname", scrollTopTween( selectedObject.tableSvg.node().__data__.tableSvgY - ( table.node().getBoundingClientRect().height /2) ));
            }
            else
                console.log( "Cannot scroll table, no tableSvg - " + selectedObject.data.name );
        }

        if ( selectedObject instanceof Piece )
        {
            const piece = selectedObject;
            if ( piece.shown )
                piece.shown = false
            else
                piece.shown = true;

            //Toggle visibility of piece in the table
            if ( selectedObject.tableSvg ) //should always be set unless there has been a problem
            {
                const n = selectedObject.tableSvg.node();
                if (( piece.shown ) && ( ! n.classList.contains("shown")))
                    n.classList.add("shown");
                else if (( ! piece.shown ) && ( n.classList.contains("shown")))
                    n.classList.remove("shown");
            }

            //Toggle visibility of the piece in the drawing
            if ( selectedObject.svg ) //should always be set unless there has been a problem
            {
                const n = selectedObject.svg.node();
                if ( piece.shown )
                {  
                    piece.drawPiece( options );
                }
                else
                {
                    selectedObject.svg.selectAll( "path" ).remove();
                    selectedObject.svg.selectAll( "g" ).remove();
                }
            }
        }
    }; //focusDrawingObject

    let controls;
    if (( ! options.hideControls ) && ( options.interactive ))
        controls = doControls( targetdiv, options, pattern );

    const drawingAndTableDiv = targetdiv.append("div");
    
    if ( ! options.thumbnail ) 
        drawingAndTableDiv.attr("class", "pattern-main")

    doDrawingAndTable = function( retainFocus ) {
                                    if ( options.layoutConfig.drawingWidth )
                                        doDrawings( drawingAndTableDiv, pattern, options, contextMenu, controls, focusDrawingObject );
                                    else
                                        drawingAndTableDiv.select("svg.pattern-drawing").remove();
                                                                            
                                    if (   ( options.layoutConfig.drawingWidth )
                                        && ( options.layoutConfig.tableWidth ) )
                                        doResizeBar( drawingAndTableDiv, options );    
                                    else
                                        drawingAndTableDiv.select("div.pattern-editor-resize").remove();

                                    if ( options.layoutConfig.tableWidth )
                                        doTable( drawingAndTableDiv, pattern, options, contextMenu, focusDrawingObject );
                                    else
                                        drawingAndTableDiv.select("div.pattern-table").remove();

                                    if ( retainFocus )
                                        //e.g. if doing show/hide functions button
                                        focusDrawingObject( selectedObject, true );
                                };

    doDrawingAndTable();                   
    
    if (( options.returnSVG !== undefined ) && ( options.returnID ))
    {
        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString( targetdiv.select('svg.pattern-drawing').node());        
        const thisHash = CryptoJS.MD5( xmlString ).toString();
        if ( options.currentSVGhash !== thisHash )
        {
            if ( xmlString.length > 64000 )
            {
                console.log("Thumnbnail SVG will be rejected as it is too large." );
            }
            else
            {
                const kvpSet = newkvpSet(true);
                kvpSet.add( 'svg', xmlString );
                kvpSet.add( 'id', options.returnID ) ;
                goGraph( options.interactionPrefix + ':' + options.returnSVG, fakeEvent(), kvpSet);
            }
        }
        else
        {
            console.log("Current thumbnail is still valid.");
        }
    }

    if ( ! options.interactive )
        return;

    let errorFound = false;
    let firstDrawingObject;
    for( const drawing of pattern.drawings )
    {
        for( const a of drawing.drawingObjects )
        {
            if (( firstDrawingObject === undefined ) && ( a.isVisible( options ) ))
                firstDrawingObject = a;

            if ( a.error )
            {
                focusDrawingObject(a, true);
                errorFound = true;
                break;
            }
        }
        if ( errorFound )
            break;
    }

    //if not focussing on an error then see if there is a recently edited item to focus on. 
    if ( ! errorFound )
    {
        if ( options.focus ) 
        {
            let a = pattern.getObject( options.focus );

            if ( ! a )
            try {
                a = pattern.getMeasurement( options.focus );
            } catch (e){
            }

            if ( ! a )
                a = pattern.getVariable( options.focus );

            if ( a )
                focusDrawingObject(a, true);
        }
        else
        {
            focusDrawingObject(firstDrawingObject, true);
        }
    }
}


function doResizeBar( graphdiv, editorOptions )
{
    const layoutConfig = editorOptions.layoutConfig;
    const drag = d3.drag()
    .on("start", function(r) {
        console.log("dragStart");
        const rg = d3.select(this);        
        r.initialX = d3.event.x;
        r.resizeBarBaseStyle = rg.attr("style");
    })
    .on("drag", function(r) {
        console.log("drag");
        const rg = d3.select(this);       
        rg.attr("style", r.resizeBarBaseStyle + " left:" + ( d3.event.x - r.initialX ) + "px;" ); 
    })
    .on("end", function(r){
        console.log("dragEnd: " + d3.event.x + " (" + ( d3.event.x - r.initialX ) + ")" );
        console.log( "layoutConfig:" + layoutConfig ); 
        const rg = d3.select(this);       
        rg.attr("style", r.resizeBarBaseStyle ); 
        const newDrawingWidth = layoutConfig.drawingWidth + ( d3.event.x - r.initialX );
        const newTableWidth  = layoutConfig.tableWidth - ( d3.event.x - r.initialX );
        editorOptions.setDrawingTableSplit( newDrawingWidth / ( newDrawingWidth + newTableWidth) );
        doDrawingAndTable();
    });

    const height = layoutConfig.drawingHeight;

    graphdiv.select( "div.pattern-editor-resize" ).remove();
    graphdiv.selectAll( "div.pattern-editor-resize" )
            .data( [ editorOptions ] )
            .enter()
            .append("div")
            .attr("class", "pattern-editor-resize")
            .attr("style", "height:" + height + "px;" )
            .call( drag );
}


function doControls( graphdiv, editorOptions, pattern )
{
    if ( ! editorOptions )
        return;

    const controls = graphdiv.append("div").attr("class", "pattern-editor-controls")

    if (    ( editorOptions.viewOption )
         && ( typeof editorOptions.viewOption === "object" ) //allow viewOption="drawing" to prevent display if these buttons
         && ( editorOptions.viewOption.length > 1 ) )
    {
        editorOptions.sizeButtons = controls.append("div").attr("class", "btn-group view-options");
        editorOptions.sizeButtons.selectAll("button")
                    .data( editorOptions.viewOption )
                    .enter()
                    .append("button")
                    .attr( "class",  function(d) { return d.mode === editorOptions.drawingTableSplitMode ? "btn btn-primary" : "btn btn-default" } )
                    .html(function(d) { return '<i class="' + d.icon + '"></i>'; })
                    .on("click", function(d) {
                        d3.event.preventDefault();
                        editorOptions.setDrawingTableSplit( d.mode );
                        doDrawingAndTable();
                    } );
    }

    if ( editorOptions.includeFullPageOption )
    {
        const toggleFullScreen = function() {
            d3.event.preventDefault();

            if ( graphdiv.classed("full-page") ) 
            {
                graphdiv.node().classList.remove("full-page");
                editorOptions.fullWindow = false;
            }
            else
            {
                graphdiv.node().classList.add("full-page");
                editorOptions.fullWindow = true;
            }

            editorOptions.setDrawingTableSplit();

            if ( editorOptions.updateServer ) 
                editorOptions.updateServer();

            doDrawingAndTable();
        };

        controls.append("button")
                .attr("class", "btn btn-default toggle-full-page")
                .html( '<i class="icon-fullscreen" />' )
                .attr("title","Toggle full screen")
                .on("click", toggleFullScreen );
    }

    //Zoom to fit. 
    if ( editorOptions.allowPanAndZoom )
    {
        //zoomToFitButton
        controls.append("button")
            .attr("class", "btn btn-default zoom-to-fit")
            .html( '<i class="icon-move" />' )
            .attr("title","Zoom to fit");
    }    

    if ( editorOptions.downloadOption )
    {
        const downloadFunction = function() {
            const serializer = new XMLSerializer();
            const xmlString = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\r\n" + serializer.serializeToString( graphdiv.select("svg.pattern-drawing").node() );
            const imgData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xmlString);
            
            d3.select(this)
                .attr( "href-lang", "image/svg+xml; charset=utf-8" )
                .attr( "href", imgData )
                .attr( "download", pattern.patternNumberAndName +  ( editorOptions.targetPiece.name ? " - " + editorOptions.targetPiece.name : "" ) + " " + pattern.getDate() + ".svg" );
        };

        //downloadLink
        controls.append("a")
                .attr("class", "btn btn-default download")
                .html( '<i class="icon-download"></i> Download' )
                .attr("title","Download")
                .on("click", downloadFunction );
    }    

    if ( editorOptions.interactive )
    {
        const toggleShowFormulas = function() {
            d3.event.preventDefault();
            editorOptions.showFormulas = ! editorOptions.showFormulas;
            $(this).children("i").attr("class",editorOptions.showFormulas ? "icon-check" : "icon-check-empty" );
            doDrawingAndTable( true /*retain focus*/ );
        };

        const optionMenuToggle = function() {
            d3.event.preventDefault();
            const $optionMenu = $( "#optionMenu");
            if ( $optionMenu.is(":visible")) $optionMenu.hide(); else $optionMenu.show();
        }

        const optionMenu = controls.append("div").attr("class","pattern-popup")
                                 .append("div").attr("id","optionMenu" ); //.css("display","visible")
        optionMenu.append("button").html( '<i class="icon-remove"></i>' ).on("click", optionMenuToggle );

        pattern.drawings.forEach( function(pp) {
            if ( ! pp.groups.length )
                return;
            const groupOptionsForPiece = optionMenu.append("section");
            groupOptionsForPiece.append("h2").text( pp.name );
            pp.groups.forEach( function(g) {
                const groupOption = groupOptionsForPiece.append("div").attr("class","group-option");
                const toggleGroup = function() {
                    g.visible = ! g.visible;  

                    if(( typeof goGraph === "function" ) && ( g.update ))
                    {
                        const kvpSet = newkvpSet(true) ;
                        kvpSet.add('visible', g.visible ) ;
                        goGraph(editorOptions.interactionPrefix + ':' + g.update, fakeEvent(), kvpSet) ;    
                    }

                    return g.visible;
                };
                groupOption.append( "i" ).attr("class",  g.visible ? 'icon-eye-open' :'icon-eye-close' )
                           .on( "click", function() { 
                                            d3.event.preventDefault();
                                            const visible = toggleGroup();
                                            d3.select(this).attr("class",visible ? "icon-eye-open" : "icon-eye-close" );
                                            doDrawingAndTable( true /*retain focus*/ );
                                } );
                groupOption.append( 'span' )
                           .text(g.name );
                if (( g.contextMenu ) && ( typeof goGraph === "function" ))
                groupOption.append( "i" ).attr("class",  "icon-ellipsis-horizontal k-icon-button" )           
                           .on( "click", function() { 
                            d3.event.preventDefault();
                            const v = newkvpSet(false) ;
                            goGraph( editorOptions.interactionPrefix + ':' + g.contextMenu, d3.event, v );
                            } );
            });
        });

        optionMenu.append("div").attr("class","formula-option").html( '<i class="icon-check"></i>show formulas' ).on("click", toggleShowFormulas );

        if ( ! ( editorOptions.targetPiece && editorOptions.lifeSize ) ) //&& ! downloadOption ? 
            controls.append("button")
                    .attr("class","btn btn-default toggle-options").html( '<i class="icon-adjust"></i>' )
                    .attr("title","Group/formula visibility").on("click", optionMenuToggle );
    } //options menu to show/hide groups and show/hide formula

    if ( pattern.wallpapers )
    {
        initialiseWallpapers( pattern, editorOptions.interactionPrefix );

        const wallpaperMenuToggle = function() {
            d3.event.preventDefault();
            const $wallpaperMenu = $( "#wallpapersMenu");
            if ( $wallpaperMenu.is(":visible")) $wallpaperMenu.hide(); else $wallpaperMenu.show();
        }

        const wallpaperMenu = controls.append("div").attr("class","pattern-popup")
                                    .append("div").attr("id","wallpapersMenu" ); 
        wallpaperMenu.append("button").html( '<i class="icon-remove"></i>' ).on("click", wallpaperMenuToggle );
            
        let wallpaperListSection = wallpaperMenu.append("section");
        wallpaperListSection.append("h2").text( "Wallpapers" );
        wallpaperListSection = wallpaperListSection.append("ul");
        wallpaperListSection.selectAll("li")
            .data( pattern.wallpapers )
            .enter()
            .append("li")
            .attr( "class", function(w) { return w.hide ? 'wallpaper-hidden' : null; } )
            .each( function(wallpaper,i){                
                const wallpaperDiv = d3.select(this);

                
                wallpaperDiv.append( "span" ).html( function(w) { return w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      w.hide = ! w.hide; 
                                                                      d3.select(this).html( w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' );
                                                                      d3.select(this.parentNode).attr( "class", w.hide ? 'wallpaper-hidden' : null );
                                                                      w.updateServer();
                                                                      const wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                      doWallpapers( wallpaperGroups, pattern );                                                              
                                                                     } );
                wallpaperDiv.append( "span" ).html( function(w) { return w.editable ? '<i class="icon-unlock"/>' : w.allowEdit ? '<i class="icon-lock"/>' : '<i class="icon-lock disabled"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      if ( w.allowEdit )
                                                                      {
                                                                        w.editable = ! w.editable; 
                                                                        d3.select(this).html( w.editable ? '<i class="icon-unlock"/>' : '<i class="icon-lock"/>' );
                                                                        const wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                        doWallpapers( wallpaperGroups, pattern );                                                              
                                                                      }
                                                                     } );
                wallpaperDiv.append( "span" ).text( wallpaper.displayName );
                                                                     //icon-lock icon-unlock icon-move icon-eye-open icon-eye-close
            });            

        controls.append("button").attr("class","btn btn-default toggle-options").html( '<i class="icon-camera-retro"></i>' ).attr("title","Wallpapers").on("click", wallpaperMenuToggle );
    } //wallpapers button    

    return controls;
}


function initialiseWallpapers( pattern, interactionPrefix )
{    
    const updateServer = ( typeof goGraph === "function" ) ? function(e) {
        const kvpSet = newkvpSet(true) ;
        kvpSet.add('offsetX', this.offsetX ) ;
        kvpSet.add('offsetY', this.offsetY ) ;
        kvpSet.add('scaleX', this.scaleX * defaultScale ) ;
        kvpSet.add('scaleY', this.scaleY * defaultScale ) ;
        kvpSet.add('opacity', this.opacity ) ;
        kvpSet.add('visible', ! this.hide ) ;
        goGraph(interactionPrefix + ':' + this.update, fakeEvent(), kvpSet) ;    
    } : function(e){};

    const wallpapers = pattern.wallpapers; 
    for( const i in wallpapers )
    {
        const w = wallpapers[i];

        if ( ! w.initialised )
        {
            //A 720px image is naturally 10in (at 72dpi)
            //If our pattern as 10in across then our image should be 10 units.
            //If our pattern was 10cm across then our image should be 25.4 units and we would expect to need to specify a scale of 1/2.54
            var defaultScale = 72.0;
            if ( w.patternurl )
            {
                defaultScale = 1.0;
            }
            else
            {
                switch( pattern.units ) {
                    case "cm":
                        defaultScale = 72.0 / 2.54;
                        break;
                    case "mm":
                        defaultScale = 72.0 / 25.4;
                        break;
                }
            }
            w.scaleX = w.scaleX / defaultScale /*dpi*/; //And adjust by pattern.units
            w.scaleY = w.scaleY / defaultScale /*dpi*/;
            w.hide = ( w.visible !== undefined ) && (! w.visible );
            w.allowEdit = ( w.allowEdit === undefined ) || ( w.allowEdit );
            
            if ( w.imageurl )
            {
                w.displayName = w.filename ? w.filename : w.imageurl;

                $("<img/>") // Make in memory copy of image to avoid css issues
                    .attr("src", w.imageurl )
                    .attr("data-wallpaper", i)
                    .on( "load", function() {
                        //seems like we can't rely on closure to pass w in, it always   points to the final wallpaper
                        const w = wallpapers[ this.dataset.wallpaper ];
                        w.width = this.width;   // Note: $(this).width() will not
                        w.height = this.height; // work for in memory images.
                        //console.log( "jquery Image loaded w.imageurl " + w.imageurl + " width:" + w.width + " height:" + w.height);
                        //console.log( "Wallpaper dimensions known. Image loaded w.imageurl width:" + w.width + " height:" + w.height );
                        if ( w.image )
                        {
                            //console.log( " setting d3Image dimentions." );
                            d3.select( w.image ).attr("width", w.width );        
                            d3.select( w.image ).attr("height", w.height );        
                        }
                    });
            } 
            else if ( w.patternurl )
            {
                w.displayName = w.patternName;

                w.drawPatternWallpaper = function drawPatternWallpaper()
                {
                    const w = this;
                    const drawingOptions = { "outline": false, 
                                             "label": w.showLabels,
                                             "dot": false };

                    if ( w.overrideLineColour )
                        drawingOptions.overrideLineColour = w.overrideLineColour;

                    if ( w.overrideLineStyle )
                        drawingOptions.overrideLineStyle = w.overrideLineStyle;

//rework to create/update groups for drawings                        
                    for( const drawing of w.pattern.drawings )
                    {
                        const drawingGroup = d3.select( w.g ).append("g").attr("class","j-drawing");

                        const drawing0 = drawing; //required for closure
                        drawingGroup.selectAll("g")
                            .data( drawing0.drawingObjects )
                            .enter()
                            .each( function(d,i) {
                                const gd3 = d3.select( this );                        
                                if (   ( typeof d.draw === "function" ) 
                                    && ( ! d.error )
                                    && ( d.isVisible() ) )// editorOptions ) ) )
                                try {
                                    d.draw( gd3, drawingOptions );
                                } catch ( e ) {
                                    d.error = "Drawing failed. " + e;
                                }
                            });
                    }
                }

                const fetchPatternForWallpaper = async () => {
                    const response = await fetch( w.patternurl, {
                      method: 'GET',
                      headers: {
                        'Content-Type': 'application/json'
                      }
                    });
                    const data = await response.json();
                    data.wallpaper = undefined; //don't put wallpapers on wallpapers
                    w.pattern = new Pattern( data );
                    w.width  = w.pattern.visibleBounds.maxX - w.pattern.visibleBounds.minX;
                    w.height = w.pattern.visibleBounds.maxY - w.pattern.visibleBounds.minY;

                    //This however does lead to lines being scaled for thickness too. 
                    const unitScale = function( units ) {
                        switch( units )
                        {
                            case "inch" : return 25.4;
                            case "cm" : return 10;
                            case "mm" :
                            default: return 1;
                        }
                    };                
    
                    const scaleAdjust = unitScale( w.pattern.units ) / unitScale( pattern.units );
                    w.scaleX += scaleAdjust;
                    w.scaleY += scaleAdjust;

                    if ( w.g )
                        w.drawPatternWallpaper(); //otherwise we'll do it when we create w.g
                  }

                fetchPatternForWallpaper();                
            }
                
            if ( updateServer )
                w.updateServer = updateServer;

            w.initialised = true;
        }    
    }
}


//http://bl.ocks.org/humbletim/5507619
function scrollTopTween(scrollTop) 
{
    return function() {
        const i = d3.interpolateNumber(this.scrollTop, scrollTop);

        return function(t) { 
            this.scrollTop = i(t); 
        };
    }
}
  

//Do the drawing... (we've added draw() to each drawing object.
function doDrawings( graphdiv, pattern, editorOptions, contextMenu, controls, focusDrawingObject )
{
    const layoutConfig = editorOptions.layoutConfig;
    const margin = editorOptions.lifeSize ? pattern.getPatternEquivalentOfMM(5) : 0;
    if ( margin )
    {
        pattern.visibleBounds.minX = Math.round( ( pattern.visibleBounds.minX - margin ) * 1000 ) / 1000;
        pattern.visibleBounds.minY = Math.round( ( pattern.visibleBounds.minY - margin ) * 1000 ) / 1000;
        pattern.visibleBounds.maxX = Math.round( ( pattern.visibleBounds.maxX + margin ) * 1000 ) / 1000;
        pattern.visibleBounds.maxY = Math.round( ( pattern.visibleBounds.maxY + margin ) * 1000 ) / 1000;
    }
    const width =  layoutConfig.drawingWidth;
    const height = layoutConfig.drawingHeight;
    let patternWidth = pattern.visibleBounds.maxX - pattern.visibleBounds.minX;
    let patternHeight = pattern.visibleBounds.maxY - pattern.visibleBounds.minY;

    graphdiv.select("svg.pattern-drawing").remove();

    let svg;
    
    if ( editorOptions.lifeSize )
    {
        //The margin needs to at least be 0.5 * strokewidth so tha that strokes arnt clipped. 
        const margin = pattern.getPatternEquivalentOfMM(5);
        patternWidth = Math.round( ( patternWidth + margin ) * 1000 ) / 1000;
        patternHeight = Math.round( ( patternHeight + margin ) * 1000 ) / 1000;
        svg = graphdiv.append("svg")
                      .attr("class", "pattern-drawing" )
                      .attr("viewBox", pattern.visibleBounds.minX + " " + pattern.visibleBounds.minY + " " + patternWidth + " " + patternHeight )
                      .attr("width", patternWidth + pattern.units )
                      .attr("height", patternHeight + pattern.units )
                      .attr("xmlns:xlink", "http://www.w3.org/1999/xlink" );
    }
    else
    {
        svg = graphdiv.append("svg")
                       .attr("class", "pattern-drawing" )
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));

        if ( editorOptions.thumbnail )
            svg.attr("viewBox", 0 + " " + 0 + " " + (width + ( 2 * margin )) + " " + (height + ( 2 * margin )) );
    }

    const transformGroup1 = svg.append("g"); //This gets used by d3.zoom

    //console.log( "Pattern bounds minX:" + pattern.bounds.minX + " maxX:" + pattern.bounds.maxX );
    //console.log( "Pattern bounds minY:" + pattern.bounds.minY + " maxY:" + pattern.bounds.maxY );

    //transformGroup2 scales from calculated positions in pattern-space (e.g. 10 representing 10cm) to
    //pixels available. So 10cm in a 500px drawing has a scale of 50. 
    let transformGroup2;

    if ( editorOptions.lifeSize )// || ( editorOptions.thumbnail ))
    {
        scale = 1;
        transformGroup2 = transformGroup1; //we don't need another group
    }
    else
    {
        const scaleX = width / patternWidth;                   
        const scaleY = height / patternHeight;           
        
        if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
            scale = scaleX > scaleY ? scaleY : scaleX;
        else if ( isFinite( scaleX ) )
            scale = scaleX;
        else
            scale = 1;

        transformGroup2 = transformGroup1.append("g").attr("transform", "scale(" + scale + "," + scale + ")");
    }

    //console.log( "scale:" + scale + " patternWidth:" + patternWidth + " width:" + width );

    //centralise horizontally                            
    const boundsWidth = pattern.visibleBounds.maxX - pattern.visibleBounds.minX;
    const availableWidth = width / scale;
    const offSetX = ( availableWidth - boundsWidth ) /2;

    //transformGroup3 shifts the position of the pattern, so that it is centered in the available space. 
    const transformGroup3 = transformGroup2.append("g")                               
                                         .attr("class", editorOptions.thumbnail ? "pattern thumbnail" : "pattern");                           

    if ( editorOptions.downloadOption )  
        transformGroup3.attr("id", pattern.patternNumberAndName )
        
    if ( ! editorOptions.lifeSize )
        transformGroup3.attr("transform", "translate(" + ( ( -1.0 * ( pattern.visibleBounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.visibleBounds.minY ) ) + ")");    

    if ( pattern.wallpapers )
    {
        const wallpaperGroups = transformGroup2.append("g")
                                             .attr("class","wallpapers")
                                             .attr("transform", "translate(" + ( ( -1.0 * ( pattern.visibleBounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.visibleBounds.minY ) ) + ")")   
                                             .lower();
        doWallpapers( wallpaperGroups, pattern );
    }
     
    //Clicking on an object in the drawing should highlight it in the table.
    const onclick = ! editorOptions.interactive ? undefined : function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,true);
    };

    for( const drawing of pattern.drawings )
    {
        //TODO depending upon use case, do the pieces or drawing first? 

        //Even if we're not going to drawing pieces lets create the svg placeholders for them so they are ready 
        //if they are clicked in the table. 
        //if ( ! editorOptions.skipPieces )
        //{
            doPieces( drawing, transformGroup3, editorOptions );
        //}

        if ( ! editorOptions.skipDrawing )
        {
            doDrawing( drawing, transformGroup3, editorOptions, onclick, contextMenu );
        }
    }

    const updateServerAfterDelay = function()
    {
        //Lets only update the server if we've stopped panning and zooming for > 1s.
        timeOfLastTweak = (new Date()).getTime();
        if ( ! updateServerTimer )
        {
            const updateServerTimerExpired = function () {

                updateServerTimer = null;          
                //console.log("Zoom update server timer activated. TimeOfLastTweak:" + timeOfLastTweak + " Now:" + (new Date()).getTime());

                if ( (new Date()).getTime() >= ( timeOfLastTweak + 500 ) )
                {
                    const zt = d3.zoomTransform( transformGroup1.node() );
                    if ( editorOptions.updateServer )
                        editorOptions.updateServer( zt.k, zt.x, zt.y );
                }
                else
                    updateServerTimer = setTimeout(updateServerTimerExpired, 500);
            }

            updateServerTimer = setTimeout(updateServerTimerExpired, 500);
        }           
    };

    const zoomed = function() {
        transformGroup1.attr("transform", d3.event.transform);

        const currentScale = d3.zoomTransform( transformGroup1.node() ).k; //do we want to scale 1-10 to 1-5 for fonts and linewidths and dots?
        if (   ( currentScale > (1.1*fontsSizedForScale) )
            || ( currentScale < (0.9*fontsSizedForScale) )
            || ( currentScale === 1 ) || ( currentScale === 8 ) )
        {
            if ( ! fontResizeTimer )
            {
                fontResizeTimer = setTimeout(function () {      
                    fontResizeTimer = null;          
                    fontsSizedForScale = d3.zoomTransform( transformGroup1.node() ).k;
                    //console.log( "Zoomed - fontsSizedForScale " + fontsSizedForScale );

                    for( const drawing of pattern.drawings )
                    {                
                        for( const a of drawing.drawingObjects )
                        {
                            let g = a.drawingSvg;                            
                            if ( g )
                            {
                                const labelPosition = a.labelPosition();

                                if ( labelPosition )
                                {
                                    g.selectAll( "text.labl" )
                                    .attr("font-size", labelPosition.fontSize + "px")
                                    .attr("x", labelPosition.labelX )
                                    .attr("y", labelPosition.labelY );

                                    g.selectAll( "line.labelLine" )
                                    .attr("x2", labelPosition.labelLineX )
                                    .attr("y2", labelPosition.labelLineY );
                                }

                                const fontSize = Math.round( 1300 / scale / fontsSizedForScale )/100; //13 at scale 1
                                g.selectAll( "text.length" )
                                 .attr("font-size", fontSize + "px");

                                 g.selectAll( "text.alongPath" )
                                 .attr("font-size", fontSize + "px");
                       
                                g.selectAll( "circle" )
                                 .attr("r", Math.round(400 / scale / fontsSizedForScale)/100 );

                                const strokeWidth = a.getStrokeWidth( false, (selectedObject===a) );

                                g.selectAll( "line" )
                                    .attr( "stroke-width", strokeWidth );

                                g.selectAll( "path" )
                                    .attr( "stroke-width", strokeWidth );

                                g.selectAll( "ellipse" )
                                    .attr( "stroke-width", strokeWidth );
                            }

                            g = a.outlineSvg;
                            if ( g )
                            {
                                const strokeWidth = a.getStrokeWidth( true );

                                g.selectAll( "line" )
                                 .attr( "stroke-width", strokeWidth );

                                g.selectAll( "path" )
                                 .attr( "stroke-width", strokeWidth );           

                                g.selectAll( "ellipse" )
                                 .attr( "stroke-width", strokeWidth );           

                                g.selectAll( "circle" )
                                    .attr("r", Math.round( 1200 / scale / fontsSizedForScale )/100 );
                            }
                        }        

                        //TODO for each piece also scale their stroke width

                        
                    }
                }, 50);         
            }
        }
        updateServerAfterDelay();         
    };           

    fontsSizedForScale = 1; //the starting scale of transformGroup1.

    if ( editorOptions.allowPanAndZoom )
    {
        //TODO just the fontsize needs setting initially to take editorOptions.scale into account

        const transform = d3.zoomIdentity.translate(editorOptions.translateX, editorOptions.translateY).scale(editorOptions.scale);
        const zoom = d3.zoom()
                    .extent([[0, 0], [width, height]])
                    .scaleExtent([0.5, 32])
                    .on("zoom", zoomed);
        svg.call( zoom)
           .call(zoom.transform, transform);

        fontsSizedForScale = editorOptions.scale;

        if ( controls) 
            controls.select( ".zoom-to-fit" ).on( "click", function() {
                d3.event.preventDefault();

                //Reset transformGroup1 to 0,0 and scale 1
                svg.call(zoom)
                .call(zoom.transform, d3.zoomIdentity);
                
                if ( editorOptions.updateServer )
                {
                    const zt = d3.zoomTransform( transformGroup1.node() );
                    editorOptions.updateServer( zt.k, zt.x, zt.y );
                }
            } );
    }
}


function doDrawing( drawing, transformGroup3, editorOptions, onclick, contextMenu ) 
{
    const outlineGroup = ! editorOptions.interactive ? undefined : transformGroup3.append("g").attr("class","j-outline");
    const drawingGroup = transformGroup3.append("g").attr("class","j-drawing");

    const drawObject = function( d, g, drawingOptions ) {
        const gd3 = d3.select( g );                        
        if (   ( typeof d.draw === "function" ) 
            && ( ! d.error )
            && ( d.isVisible( editorOptions ) ) )
        try {
            d.draw( gd3, drawingOptions );
            d.drawingSvg = gd3; //not necessary if this is thumbnail
        } catch ( e ) {
            d.error = "Drawing failed. " + e;
        }
    };

    if ( editorOptions.interactive )
    {
        const drawingOptions = { "outline": false, 
                                    "label": (! editorOptions.hideLabels),
                                    "dot":  (! editorOptions.hideLabels) };
        drawingGroup.selectAll("g")
        .data( drawing.drawingObjects )
        .enter()
        .append("g")
        .on("contextmenu", contextMenu)
        .on("click", onclick)
        .on('touchstart', function() { 
            this.touchStartTime = new Date(); 
            if ( event ) event.preventDefault();
        })
        .on('touchend',function(d) {    
            const endTime = new Date(); 
            const duration = endTime - this.touchStartTime;

            if ( event ) 
                event.preventDefault();

            if (( duration > 400) || ( selectedObject === d ))
            { 
                //console.log("long touch, " + (duration) + " milliseconds long");
                contextMenu(d);
            }
            else {
                //console.log("regular touch, " + (duration) + " milliseconds long");
                onclick(d);
            }                    
        })
        .each( function(d,i) {
            drawObject( d, this, drawingOptions );
        });
    }
    else //thumbnail
    {
        //In order to have the minimum SVG then don't create a group for each drawing object. 
        const drawingOptions = { "outline": false, 
                                    "label": (! editorOptions.hideLabels),
                                    "dot":  (! editorOptions.hideLabels) };
        drawingGroup.selectAll("g")
            .data( drawing.drawingObjects )
            .enter()
            .each( function(d,i) {
                drawObject( d, this, drawingOptions );
            });
    }

    if ( outlineGroup )
    {
        outlineGroup.selectAll("g") 
            .data( drawing.drawingObjects )
            .enter()
            .append("g")
            .on("contextmenu", contextMenu)
            .on("click", onclick)
            .on('touchstart', function() { 
                this.touchStartTime = new Date(); 
                if ( event ) event.preventDefault();
            })
            .on('touchend',function(d) {    
                const endTime = new Date(); 
                const duration = endTime - this.touchStartTime;
                if ( event ) event.preventDefault();
                if (( duration > 400) || ( selectedObject === d ))
                { 
                    //console.log("long touch, " + (duration) + " milliseconds long");
                    contextMenu(d);
                }
                else {
                    //console.log("regular touch, " + (duration) + " milliseconds long");
                    onclick(d);
                }                    
            })                
            .each( function(d,i) {
                const g = d3.select( this );
                if (   ( typeof d.draw === "function" ) 
                    && ( ! d.error )
                    && ( d.isVisible( editorOptions ) ) )
                {
                    d.draw( g, { "outline": true, "label": false, "dot":true } );
                    d.outlineSvg = g;
                }
            });
    }
}


function doPieces( drawing, transformGroup3, editorOptions )
{
    let piecesToDraw = drawing.pieces;

    //Skip non-default pieces when making thumbnail
    if ( editorOptions.thumbnail )
    {
        piecesToDraw = [];
        for( const p of drawing.pieces )
        {
            if ( p.data.inLayout )
                piecesToDraw.push( p );
        }
        if ( piecesToDraw.length === 0)
            piecesToDraw = drawing.pieces; //revert back to all pieces
    }

    const pieceGroup = transformGroup3.append("g").attr("class","j-pieces");
    pieceGroup.selectAll("g")
                .data( piecesToDraw )
                .enter()
                .append("g")        
    //.on("contextmenu", contextMenu)
    //.on("click", onclick)
                .each( function(p,i) {
                    const g = d3.select( this );
                    g.attr("id", p.name );

                    //if doing an export of multiple pieces then take the piece.mx/my into account
                    if ( editorOptions.targetPiece === "all" ) //OR AN ARRAY WITH >1 length
                    {
                        g.attr("transform", "translate(" + ( 1.0 * p.data.mx ) + "," +  (1.0 * p.data.my ) + ")");    
                    }

                    p.svg = g;

                    if ( ! editorOptions.skipPieces )
                    {
                        if ( typeof p.drawSeamLine === "function" )
                        {                            
                            p.drawPiece( editorOptions );
                        }
                    }
            });
}


function doWallpapers( wallpaperGroups, pattern )
{
    const visibleWallpapers = [];
    for( const w of pattern.wallpapers )
    {
        if ( ! w.hide )
            visibleWallpapers.push( w );
    }

    const drag = d3.drag()
        .on("start", function(wallpaper) {
            wallpaper.offsetXdragStart = wallpaper.offsetX - d3.event.x;
            wallpaper.offsetYdragStart = wallpaper.offsetY - d3.event.y;
        })
        .on("drag", function(wallpaper) {
            const wallpaperG = d3.select(this);        
            wallpaper.offsetX = wallpaper.offsetXdragStart + d3.event.x;
            wallpaper.offsetY = wallpaper.offsetYdragStart + d3.event.y;
            wallpaperG.attr("transform", "translate(" + wallpaper.offsetX + "," + wallpaper.offsetY + ") " + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + " )" );
        })
        .on("end", function(wallpaper){
            wallpaper.updateServer( d3.event );
        });

    const data = wallpaperGroups.selectAll("g.wallpaper")
                    .data( visibleWallpapers, function(d){ return d.patternurl || d.imageurl } //required to correctly match wallpapers to objects
                    );

    data.enter()
        .append("g")
        .attr( "class", function(w){ return w.editable ? "wallpaper editable" : "wallpaper" } )
        .attr( "transform", function(wallpaper) { return  "translate(" + ( wallpaper.offsetX ) + "," + ( wallpaper.offsetY ) + ")"
                                                        + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + ")" } )
        .each( function(w){
            //Set this up so that we can later use dimensionsKnown()

            if ( w.imageurl )
            {
                //if we know the dimensions already, set them! (Safari needs this on showing a hidden wallpaper)
                const imaged3 = d3.select(this).append("image")
                                        .attr( "href", w.imageurl )
                                        .attr( "opacity", w.opacity )
                                        .attr( "width", w.width)
                                        .attr( "height", w.height);
                imaged3.each( function(i) {
                    w.image = this;
                });
            }
            else if ( w.patternurl ) 
            {
                w.g = this;
                d3.select(this).attr("opacity", w.opacity );
                if ( w.pattern ) //pattern loaded already, including when toggling full screen
                    w.drawPatternWallpaper();
            }
        } );

    data.exit()
        .remove();

    const resize = d3.drag()
                    .on("start", function(wallpaper) {
                        wallpaper.offsetXdragStart = d3.event.x - wallpaper.width;
                        wallpaper.offsetYdragStart = d3.event.y - wallpaper.height;
                        //console.log("start offsetXdragStart:" + wallpaper.offsetXdragStart );
                    })
                    .on("end", function(wallpaper) {
                        const wallpaperG = d3.select(this.parentNode);
                        const circle = d3.select(this);
                        const rect = wallpaperG.select("rect");
                        const ratio = circle.attr("cx") / wallpaper.width;     
                        //const scaleXbefore = wallpaper.scaleX;                   
                        wallpaper.scaleX = wallpaper.scaleX * ratio; //fixed aspect?
                        wallpaper.scaleY = wallpaper.scaleY * ratio;
                        //console.log( "cx:" + circle.attr("cx") + " image:" + wallpaper.width + "  ratio:" + ratio + "  scaleXbefore:" + scaleXbefore + "  scaleXNow:" + wallpaper.scaleX );
                        wallpaperG.attr("transform", "translate(" + wallpaper.offsetX + "," + wallpaper.offsetY + ") " + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + " )" );
                        circle.attr("cx", wallpaper.width )
                              .attr("cy", wallpaper.height );
                        rect.attr("width", wallpaper.width )
                            .attr("height", wallpaper.height );
                        wallpaper.updateServer( d3.event );
                    } )
                    .on("drag", function(wallpaper) {
                        const wallpaperG = d3.select(this.parentNode);
                        const circle = d3.select(this);
                        const rect = wallpaperG.select("rect");
                        let newX = d3.event.x - wallpaper.offsetXdragStart;
                        let newY = d3.event.y - wallpaper.offsetYdragStart;
                        //console.log("drag d3.event.x:" + d3.event.x + "  newX:" + newX );

                        //fixed aspect
                        const ratioX = newX / wallpaper.width;
                        const ratioY = newY / wallpaper.height;
                        const ratio = (ratioX+ratioY)/2.0;
                        newX = ratio * wallpaper.width;
                        newY = ratio * wallpaper.height;

                        circle.attr("cx", newX )
                              .attr("cy", newY );
                        rect.attr("width", newX )
                            .attr("height", newY );
                    });

    //Add a resizing boundary to each editable wallpaper.                 
    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers ,function(d){return d.patternurl || d.imageurl} )
                    .each( function(w,i) {
                        const g = d3.select(this);
                        //This worked on Firefox and Chrome, but not Safari.
                        //var box = g.node().getBBox();
                        //w.width = box.width;
                        //w.height = box.height;

                        if ( w.editable )
                        {
                            g.append("rect")
                            .attr("x",0)
                            .attr("y",0)
                            .attr("stroke", "red")
                            .attr("fill", "none")
                            .attr("width", w.width)
                            .attr("height", w.height);
    
                            if ( ! w.patternurl ) //don't allow re-sizing of patterns, just images
                                g.append( "circle") 
                                .attr("cx", function(w) { return w.width } )
                                .attr("cy", function(w) { return w.height } )
                                .attr("r", 10 / scale / w.scaleX / fontsSizedForScale )
                                .attr("fill", "red")
                                .call(resize);
                                
                            g.call(drag);
                        }
                        else
                        {
                            g.select("rect").remove();
                            g.select("circle").remove();
                            g.on(".drag", null );
                        }
                    } );
}


function doTable( graphdiv, pattern, editorOptions, contextMenu, focusDrawingObject )
{
    const layoutConfig = editorOptions.layoutConfig;
    const margin = layoutConfig.tableMargin;//25; 
    const width =  layoutConfig.tableWidth;//400;
    const height = layoutConfig.tableHeight;//600;
    const minItemHeight = 30; //should not be required
    const itemMargin = 8;
    const itemWidth = width *3/4;
    let ypos = 0;
    const asFormula = editorOptions.showFormulas; 

    const onclick = function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,false);
    }

    graphdiv.select("div.pattern-table").remove();

    let combinedObjects = [];

    //TODO quick jump to start of pattern, variatble, pieces
    if ( pattern.measurement )
    {
        for( const m in pattern.measurement )
            combinedObjects.push( pattern.measurement[m] );
    }

    if ( pattern.variable )
    {
        for( const i in pattern.variable )
            combinedObjects.push( pattern.variable[i] );
    }

    for( const drawing of pattern.drawings )
    {
        combinedObjects = combinedObjects.concat( drawing.drawingObjects );
        combinedObjects = combinedObjects.concat( drawing.pieces );
    }

    const sanitiseForHTML = function ( s ) {

            if ( typeof s !== "string" )
                s = "" + s;
                    
            return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
        };

    const svg = graphdiv.append("div")
                        .attr("class", "pattern-table")
                        .style( "height", height +"px" )    
                        .append("svg")
                        .attr("width", width + ( 2 * margin ) )
                        .attr("height", minItemHeight * combinedObjects.length );    

    svg.selectAll("g")
       .data( combinedObjects )
       .enter()        
       .append("g")
       .each( function(d,i) {

        const divHeight = function(that) {

            //this - the dom svg element
            //that - the data object

            const h = $(this).find( "div.outer" ).height();
            
            if ( h < minItemHeight )
                return minItemHeight;

            return h;
        };

        const g = d3.select( this );

        let classes = "j-item";

        if ( d.isMeasurement )
            classes += " j-measurement";
        else if ( d.isVariable )
            classes += " j-variable";
        else if ( d instanceof DrawingObject )
        {   
            if ( ! d.isVisible( editorOptions ) ) //is a drawing object
                classes += " group-hidden"; //hidden because of groups
        }
        else if ( d instanceof Piece )
            classes += " j-piece";

        d.tableSvg = g;
        d.tableSvgX = itemWidth;
        d.tableSvgY = ypos + ( 0.5 * minItemHeight );

        const fo = g.append( "foreignObject" )
                    .attr( "x", 0 )
                    .attr( "y", function (d) { 
                                return ypos;
                              } )
                    .attr( "width", itemWidth  );

        let html;
        try {
            html = d.html( asFormula );
            if ( d.data?.comments )
                html = '<div class="comments">' + sanitiseForHTML( d.data.comments ) + '</div>' + html;
            if (d.error)
                html += '<div class="error">' + sanitiseForHTML( d.error ) + '</div>' ;
        } catch ( e ) {

            if ( ! d.error )
                d.error = "Failed to generate description.";

            html = '<div class="error">' + sanitiseForHTML( d.error ) + '</div>';
        }

        if ( d.error )
            classes += " error";

        g.attr( "class", classes ) ;    

        fo.append( "xhtml:div" )
           .attr("class","outer")
           .append( "xhtml:div" )
           .attr("class","desc")
           .html( html );

        fo.attr( "height", 1 ); //required by firefox otherwise bounding rects returns nonsense
        fo.attr( "height", divHeight );

        g.attr( "height", divHeight )
         .attr( "y", function (d) { //Get the height of the foreignObject.
                                    const h = this.childNodes[0].getBoundingClientRect().height;
                                    ypos += h + itemMargin; 
                                    //console.log("y: " + ypos );
                                    return ypos } )

        g.on("contextmenu", contextMenu)
         .on("click", onclick )
         .on('touchstart', function() { 
            this.touchStartTime = new Date(); 
            if ( event ) event.preventDefault();
         })
         .on('touchend',function(d) {    
            const endTime = new Date(); 
            const duration = endTime - this.touchStartTime;
            if ( event ) event.preventDefault();
            if (( duration > 400) || ( selectedObject === d ))
            { 
                //console.log("long touch, " + (duration) + " milliseconds long");
                contextMenu(d);
            }
            else {
                //console.log("regular touch, " + (duration) + " milliseconds long");
                onclick(d);
            }                    
         });
    }); //.each
        
    svg.attr("height", ypos );    

    linksGroup = svg.append("g")
                    .attr("class", "links");

    //Links area is width/4 by ypos.            
    const linkScale = (width/4) / Math.log( Math.abs( ypos /30 ) );   

    drawLinks( pattern, linkScale );
}


function drawLinks( pattern, linkScale ) {
    const linkData = pattern.dependencies.dependencies;
    
    linksGroup.selectAll("path.link") //rename .link to .dependency
                    .data(linkData)
                    .enter().append("path")
                    .attr("class", "link" )
                    .attr("d", function( link ) {
                        const x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
                              x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;
                    
                        const dy = y0 - y1,
                              l = Math.log( Math.abs(dy /30 ) ) * linkScale;
                    
                        const path = d3.path();
                        path.moveTo( x0, y0 );
                        path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
                        return path;                      
                    } );
}


/*
 * Curve that connects items in the table.
 */
function curve(link) {
    const x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
          x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;

    const dy = y0 - y1,
          l = Math.log( Math.abs(dy /30 ) ) * 50;

    const path = d3.path();
    path.moveTo( x0, y0 );
    path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
    return path;                      
}


//TODO move to kinodbglue
function newkvpSet(noRefresh)
{
    const kvp = { } ;
    kvp.kvps = new Array() ;

    kvp.add = function (k, v)
    {
        this.kvps.push ( {k: k, v: v} ) ;
    } ;

    kvp.toString = function (p)
    {
        let r = '' ;

        for ( const kvp of this.kvps )
            r += '&' + p + kvp.k + '=' + encodeURIComponent( kvp.v );

        return r ;
    } ;

    if (noRefresh)
        kvp.add("_noRefresh", -1) ;

    return kvp ;
}

//TODO move to kinodbglue
function fakeEvent(location, x, y)
{
    let pXY = {x: 0, y: 0} ;
    
    if (location !== undefined)
    {
        pXY = getElementXY(location) ;
        pXY.x = Math.round(pXY.x + x) ;
        pXY.y = Math.round(pXY.y + y) ;
    }
    else
    {
        pXY.x = Math.round(x) ;
        pXY.y = Math.round(y) ;
    }
    
    // event to satisfy goGraph's requirements
    return { target: location, pageX: 0, pageY: 0, processedXY: pXY } ;
}


export{ PatternDrawing, doDrawings, doTable, drawPattern  };
//(c) Copyright 2019 Jason Dore
//
//Inspired by the excellent Seamly2D/Valentina pattern drawing software.
//This library is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the Seamly2D/Valentina pattern making systen in order to support the community
//pattern sharing website https://my-pattern.cloud/ . 
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

class Expression {

    constructor(data, pattern, drawing) {
        this.dataDebug = data;
        this.pattern = pattern;
        this.drawing = drawing;

        //divide, multiply etc. and functions too
        if (typeof data.parameter !== "undefined") 
        {
            this.params = data.parameter;
            for ( const a in this.params ) {
                this.params[a] = new Expression( this.params[a], pattern, drawing);
            }            
        }

        if (typeof data.integerValue !== "undefined") 
        {
            this.constant = data.integerValue;
            this.value = this.constantValue; //the method constantValue()
        }
        else if (typeof data.decimalValue !== "undefined") 
        {
            this.constant = data.decimalValue;
            this.value = this.constantValue; //the method constantValue()
        }
        //else 
        //if (this.operation === "Variable") 
        //{
            else if (  typeof data.keyword !== "undefined" )
            {
                this.variable = data.keyword;
                this.value = this.keywordValue;
            }
            else if ( typeof data.variable !== "undefined")
            {
                this.variable = pattern.getVariable( data.variable );
                this.value = this.variableValue;
            }
            else if ( data.measurement )
            {
                this.variable = pattern.getMeasurement( data.measurement );
                this.value = this.measurementValue;
            }
            else if (    ( data.variableType === "angleOfLine" )
                      || ( data.variableType === "lengthOfLine" ) )
            {
                this.drawingObject1 = drawing.getObject( data.drawingObject1 );
                this.drawingObject2 = drawing.getObject( data.drawingObject2 );
                this.function = data.variableType;
                this.value = this.functionValue;
            }
            else if (    ( data.variableType === "lengthOfSplinePath" )
                      || ( data.variableType === "lengthOfSpline" )
                      || ( data.variableType === "angle1OfSpline" )
                      || ( data.variableType === "angle2OfSpline" ) 
                      || ( data.variableType === "lengthOfSplineControl1" ) 
                      || ( data.variableType === "lengthOfSplineControl2" ) 
                      )
            {
                if ( data.drawingObject1 && data.drawingObject2 )
                {
                    //This shouldn't find an object, otherwise we'd have passed it as a single drawingObject.
                    this.drawingObject = drawing.getObject( "Spl_" + data.drawingObject1 + "_" + data.drawingObject2 );

                    //at least one of these will be an intersect on a curve, or position along a curve, otherwise they are end points of the curve. 
                    if ( ! this.drawingObject )
                    {
                        this.drawingObject1 = drawing.getObject( data.drawingObject1 );
                        this.drawingObject2 = drawing.getObject( data.drawingObject2 );
                        //one of these will be a Spline, the other will be an intersection point on it, or distance along it. 

                        //We're not the whole spline, just a segment of it. We need to find a curve that both drawing objects are on.

                        const curveBeingCut = function( d ) {
                            if ( d.arc )                             
                                return d.arc;
                            else if ( d.curve )                             
                                return d.curve;
                            else
                                throw new Error( "Path not found." ); 
                        };

                        //Return true if 'other' is the start or end of this curve. 
                        const checkRelevant = function( curve, other ) {
                            return    ( curve?.startPoint === other ) 
                                   || ( curve?.endPoint === other )
                                   || ( curve?.data?.pathNode?.[0].point === other )
                                   || ( curve?.data?.pathNode?.[curve?.data?.pathNode?.length-1]?.point === other )
                                   || ( curve?.curve?.nodeData?.[0].point.equals( other.p ) ) //curve is itself an operation result
                                   || ( curve?.curve?.nodeData?.[ curve?.curve?.nodeData?.length -1 ].point.equals( other.p ) )
                        };

                        let drawingObjectCuttingSpline;

                        if (    (    ( this.drawingObject1.data.objectType === "pointIntersectArcAndAxis" )               
                                  || ( this.drawingObject1.data.objectType === "pointCutSplinePath" ) 
                                  || ( this.drawingObject1.data.objectType === "cutSpline" ) )
                             && checkRelevant( curveBeingCut( this.drawingObject1 ), this.drawingObject2 ) )
                            drawingObjectCuttingSpline = this.drawingObject1;

                        else if (    (    ( this.drawingObject2.data.objectType === "pointIntersectArcAndAxis" )               
                                       || ( this.drawingObject2.data.objectType === "pointCutSplinePath" ) 
                                       || ( this.drawingObject2.data.objectType === "cutSpline" ) )
                                 && checkRelevant( curveBeingCut( this.drawingObject2 ), this.drawingObject1 ) )
                                 drawingObjectCuttingSpline = this.drawingObject2;

                        if ( ! drawingObjectCuttingSpline )
                            throw new Error( "No object cutting spline. " );

                        this.splineDrawingObject = curveBeingCut( drawingObjectCuttingSpline );

                        //The other drawing object will either be the start or end of this curve, OR another intersect on the same curve. 
                    }
                }
                else
                    //this is the spline drawing object itself, the curve comes directly from it. 
                    this.drawingObject = drawing.getObject( data.drawingObject1 );

                if (( data.segment ) && ( parseInt(data.segment) !== 0 ))
                    this.segment = parseInt(data.segment);

                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( data.variableType === "lengthOfArc" )
            {
                this.drawingObject = drawing.getObject( data.drawingObject1 );
                this.arcSelection = data.arcSelection;
                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( data.variableType === "radiusOfArc" )
            {
                this.drawingObject = drawing.getObject( data.drawingObject1 );

                if ( data.radiusSelection === "ellipticalArcRadius1" )
                    this.radiusSelection = 1;
                else if ( data.radiusSelection === "ellipticalArcRadius2" )
                    this.radiusSelection = 2;
                else
                    this.radiusSelection = null;

                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( typeof data.variableType !== "undefined" )
                throw new Error( "Unsupported variableType:" + data.variableType );
        //}
        else if ( typeof data.functionName !== "undefined" )
        {
            this.function = data.functionName;
            this.value = this.functionValue;
            //having done the parameters earlier. 
        }
        else if ( typeof data.operation !== "undefined" )
        {
            //add, multiply etc.
            this.operation = data.operation;
            this.value = this.operationValue;
        }
        //Don't throw, we still need to continue with setting up the expression so we can describe what is wrong. 
        //else throw "Unsupported expression." ;
    }

    
    variableValue() {
        return this.variable.value();
    }    


    measurementValue() {
        //console.log("Measurement units " + this.variable.units );
        //console.log("Pattern units " + this.pattern.units );
        const measurementUnits = this.variable.units;
        const patternUnits = this.pattern.units;
        if ( measurementUnits === patternUnits )
            return this.variable.value();

        let mm = 1;
        if ( measurementUnits === "cm" )
            mm = 10;
        else if ( measurementUnits === "inch" )
            mm = 25.4;

        let pp = mm;

        if ( patternUnits === "cm" )
            pp = mm / 10;
        else if ( patternUnits === "inch" )
            pp = mm / 25.4;

        return pp * this.variable.value();
    }    


    functionValue(currentLength) {

        let r; 

        switch( this.function )
        {
            case "angleOfLine":
            {
                const point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
                const point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
                const line = new GeoLine( point1, point2 );
                let deg = line.angleDeg();
                if ( deg < 0 )
                    deg += 360; 
                r = deg;
                break;
            }
            case "lengthOfLine":
            {
                const point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
                const point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
                const line = new GeoLine( point1, point2 );
                r = line.getLength();
                break;
            }
            case "lengthOfSplinePath":
            case "lengthOfSpline":
            {
                if ( ! this.drawingObject ) 
                {
                    //how far along the spline is each drawingObject (one is likely at the start or end)
                    //create a copy of the spline with the intersection point added (where along the line if it has multiple nodes? the place where the line length doesn't grow).
                    //https://pomax.github.io/bezierinfo/#splitting
                    return    this.splineDrawingObject.curve.pathLengthAtPoint( this.drawingObject2.p )
                            - this.splineDrawingObject.curve.pathLengthAtPoint( this.drawingObject1.p );
                    //TODO. or we could use, though they amound to a similar thing. 
                //     return this.splineDrawingObject.curve.splineBetweenPoints( this.drawingObject1.p, this.drawingObject2.p ).pathLength();
                }

                if (    ( this.function === "lengthOfSplinePath" )
                    && ( this.segment ) )
                    r = this.drawingObject.curve.pathLength( this.segment );
                else 
                    r = this.drawingObject.curve.pathLength();

                break;
            }
            case "angle1OfSpline":
            case "angle2OfSpline":
            case "lengthOfSplineControl1":
            case "lengthOfSplineControl2":    
            {
                let spline;
                if ( this.drawingObject ) //the simple case, we are looking at the start/end of a path (not a point along the line, but could be a segment)
                {
                    spline = this.drawingObject.curve;
                    if ( this.segment )
                        spline = spline.pathSegment( this.segment );
                }
                else
                {
                    //this.splineDrawingObject is our spl or splpath, and drawingObject1 and drawingObject2 are either its ends, or intersection/pointalong
                    //and we may also have a segment?
                    spline = this.splineDrawingObject.curve;
                    spline = spline.splineBetweenPoints( this.drawingObject1.p, this.drawingObject2.p );
                }

                switch( this.function )
                {
                    case "angle1OfSpline":
                        r = spline.nodeData[0].outAngle;
                        break;
                    case "angle2OfSpline":
                        r = spline.nodeData[ spline.nodeData.length-1 ].inAngle;
                        break;
                    case "lengthOfSplineControl1":
                        r = spline.nodeData[0].outLength;
                        break;
                    case "lengthOfSplineControl2":
                        r = spline.nodeData[ spline.nodeData.length-1 ].inLength;
                        break;
                }

                break;
            }
            case "lengthOfArc":
            {
                if ( this.arcSelection === "wholeArc")
                    r = this.drawingObject.arc.pathLength();
                else
                {
                    //this.drawingObject is a cut object
                    const arcDrawingObject = this.drawingObject.curve ? this.drawingObject.curve : this.drawingObject.arc;

                    //where in the arc is this.drawingObject.curve?
                    const radiusToIntersectLine = new GeoLine( arcDrawingObject.center.p, this.drawingObject.p );
                    const angleToIntersectRad = radiusToIntersectLine.angle;
                    if ( this.arcSelection === "beforeArcCut")
                    {
                        if ( arcDrawingObject.arc instanceof GeoEllipticalArc )
                        {
                            //else elliptical arc: from the arc's start angle to this cut angle. 
                            const cutArc = arcDrawingObject.arc.clone();
                            cutArc.angle2 = radiusToIntersectLine.angleDeg() - cutArc.rotationAngle;
                            if ( cutArc.angle2 < 0 )
                                cutArc.angle2 += 360;
                            r = cutArc.pathLength();
                        }
                        else //if arc
                        {
                            const arcStartAngleRad = arcDrawingObject.angle1.value() / 360 * 2 * Math.PI;
                            const segmentRad = angleToIntersectRad-arcStartAngleRad;                    
                            const length = radiusToIntersectLine.length * segmentRad; //because circumference of a arc is radius * angle (if angle is expressed in radians, where a full circle would be Math.PI*2 )
                            r = length;
                        }                    
                    }
                    else //afterArcCut
                    {
                        if ( arcDrawingObject.arc instanceof GeoEllipticalArc )
                        {
                            const cutArc = arcDrawingObject.arc.clone();
                            cutArc.angle1 = radiusToIntersectLine.angleDeg()  - cutArc.rotationAngle;
                            if ( cutArc.angle1 < 0 )
                                cutArc.angle1 += 360;
                            r = cutArc.pathLength();
                        }
                        else //if arc
                        {
                            const arcEndAngleRad = arcDrawingObject.angle2.value() / 360 * 2 * Math.PI;
                            const segmentRad = arcEndAngleRad - angleToIntersectRad;
                            const length = radiusToIntersectLine.length * segmentRad;
                            r = length;
                        }
                    }
                }
                break;
            }    
            case "radiusOfArc":
            {
                if ( this.radiusSelection === 1 )
                    r = this.drawingObject.radius1.value();
                else if ( this.radiusSelection === 2 )
                    r = this.drawingObject.radius2.value();
                else
                    r = this.drawingObject.radius.value();

                break;
            }
            case "sqrt":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.sqrt( p1 ); 
                break;
            }
            case "-":
            {
                const p1 = this.params[0].value(currentLength);
                r = -p1; 
                break;
            }
            case "min":
            {
                const p1 = this.params[0].value(currentLength);
                const p2 = this.params[1].value(currentLength);
                r = Math.min( p1, p2 );
                break;
            }
            case "max":
            {
                const p1 = this.params[0].value(currentLength);
                const p2 = this.params[1].value(currentLength);
                r = Math.max( p1, p2 );
                break;
            }
            case "sin":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.sin( p1 * Math.PI / 180 );
                break;
            }
            case "cos":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.cos( p1 * Math.PI / 180 );
                break;
            }
            case "tan":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.tan( p1 * Math.PI / 180 );
                break;
            }
            case "sinD":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.sin( p1 );
                break;
            }
            case "cosD":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.cos( p1 );
                break;
            }
            case "tanD":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.tan( p1 );
                break;
            }
            case "asin":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.asin( p1 ) * 180 / Math.PI;
                break;
            }
            case "acos":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.acos( p1 ) * 180 / Math.PI;
                break;
            }
            case "atan":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.atan( p1 ) * 180 / Math.PI;
                break;
            }        
            case "abs":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.abs( p1 );
                break;
            }        
            default:
                throw new Error ("Unknown function: " + this.function );
        }

        if ( r === undefined || Number.isNaN( r ) )
            throw new Error( this.function + " - result not a number. " );

        return r;
    }
    

    constantValue() {
        return this.constant;
    }


    operationValue(currentLength) {

        if (typeof this.params[0].value !== "function")
            throw new Error( "expression p1 not valid." );

        if ( this.operation !== "()" )    
        {
            if (typeof this.params[1].value !== "function")
                throw new Error(  "expression p2 not valid." );
        }

        if (this.operation === "+")
            return this.params[0].value(currentLength) + this.params[1].value(currentLength);

        else if (this.operation === "-")
            return this.params[0].value(currentLength) - this.params[1].value(currentLength);

        else if (this.operation === "*")
            return this.params[0].value(currentLength) * this.params[1].value(currentLength);

        else if (this.operation === "/")
            return this.params[0].value(currentLength) / this.params[1].value(currentLength);
            
        else if (this.operation === "==")
            return this.params[0].value(currentLength) == this.params[1].value(currentLength);

        else if (this.operation === "!=")
            return this.params[0].value(currentLength) != this.params[1].value(currentLength);

        else if (this.operation === "<")
            return this.params[0].value(currentLength) < this.params[1].value(currentLength);

        else if (this.operation === "<=")
            return this.params[0].value(currentLength) <= this.params[1].value(currentLength);
            
        else if (this.operation === ">")
            return this.params[0].value(currentLength) > this.params[1].value(currentLength);

        else if (this.operation === ">=")
            return this.params[0].value(currentLength) >= this.params[1].value(currentLength);

        else if (this.operation === "()")
            return this.params[0].value(currentLength);

        else if  ( this.operation === "^" )
        {
            const p1 = this.params[0].value(currentLength);
            const p2 = this.params[1].value(currentLength);
            return Math.pow( p1, p2 );
        }    
        else if (this.operation === "?")
        {
            const conditionTestResult = this.params[0].value(currentLength);
            if ( conditionTestResult )
                return this.params[1].value(currentLength);
            else
                return this.params[2].value(currentLength);
        }


        throw new Error( "Unknown operation: " + this.operation );
    }


    keywordValue(currentLength) {
        if (this.variable === "CurrentLength")
            return currentLength;
        throw new Error( "Unknown keyword: " + this.variable );
    }


    nameWithPopupValue( name ) {
        try {
            return '<span title="' + ( Math.round( this.value() * 1000 ) / 1000 ) + ' ' + this.pattern.units + '">' + name + '</span>';
        } catch ( e ) {
            return "ERROR1:" + name;
        }
    }


    html( asFormula, currentLength, parentPrecedence ) {

        if ( ! asFormula )
        {
            try { 
                return this.value( currentLength );
                //return Number.parseFloat( this.value( currentLength ) ).toPrecision(4); 
            } catch ( e ) {
                return "???"
            }
        }

        if ( this.variable )
        {
            if (this.variable === "CurrentLength")
                return this.nameWithPopupValue( "CurrentLength" );

            return this.nameWithPopupValue( this.variable.name );
        }

        if ( this.constant !== undefined )
            return this.constant;

        if ( this.function )
        {
            switch ( this.function ) {

            case "lengthOfLine":
                return this.nameWithPopupValue( "lengthOfLine(" + this.drawingObject1.ref() + ", " + this.drawingObject2.ref() + ")" );

            case "angleOfLine":
                return this.nameWithPopupValue( "angleOfLine(" + this.drawingObject1.ref() + ", " + this.drawingObject2.ref() + ")" );

            case "lengthOfSpline":
            case "lengthOfSplinePath":
            
                if ( ! this.drawingObject )
                    return this.nameWithPopupValue( this.function + "( curve:" + this.splineDrawingObject.ref() + ", from:" + this.drawingObject1.ref() + ", to:" + this.drawingObject2.ref() + ")" );
                
                return this.nameWithPopupValue( this.function + "(" + this.drawingObject.ref() + (this.segment?", segment:" + this.segment:"") + ")" );

            case "angle1OfSpline":
            case "angle2OfSpline":
            case "lengthOfSplineControl1":
            case "lengthOfSplineControl2":
            
                if ( ! this.drawingObject )
                    return this.nameWithPopupValue( this.function + "( curve:" + this.splineDrawingObject.ref() + ", at:" +
                                            ((( this.splineDrawingObject.startPoint == this.drawingObject1 ) || ( this.splineDrawingObject.endPoint == this.drawingObject1 ))
                                            ? this.drawingObject2.ref() : this.drawingObject1.ref() ) + ")" );

                return this.nameWithPopupValue( this.function + "(" + this.drawingObject.ref() + ")" );

            case "lengthOfArc":
            
                if ( ! this.drawingObject )
                    return "lengthOfArc( ??? )";
                
                return this.nameWithPopupValue( "lengthOfArc(" + this.arcSelection + " " + this.drawingObject.ref() + ")" );

            case "radiusOfArc":

                if ( ! this.drawingObject )
                    return "radiusOfArc( ??? )";
                
                return this.nameWithPopupValue( "radiusOfArc(" + this.drawingObject.ref() + ( this.radiusSelection ? ", radius-" + this.radiusSelection : "" ) + ")" );
            
            case "-":
            
                return ( "-(" + this.params[0].html( asFormula, currentLength ) + ")" ); 
            
            case "sqrt":
            case "sin":
            case "cos":
            case "tan": 
            case "sinD":
            case "cosD":
            case "tanD": 
            case "asin":
            case "acos":
            case "atan": 
            case "abs":
                return ( this.function + "(" + this.params[0].html( asFormula, currentLength ) + ")" ); 

            default:
                return "UNKNOWN FUNCTION TYPE" + this.function;
            }
        }

        if ( this.operation === "?" )
        {
            return this.params[0].html( asFormula, currentLength ) + " ? " +
                   this.params[1].html( asFormula, currentLength ) + " : " +
                   this.params[2].html( asFormula, currentLength );
        }
        else if ( this.operation ) 
        {
            let useOperatorNotation = false;
            let precedence = 0;

            if (    (this.operation === "+") 
                 || (this.operation === "-") )
            {
                useOperatorNotation = " " + this.operation + " ";
                precedence = 3;
            }
            else if (    (this.operation === "/") 
                      || (this.operation === "*") ) 
            {
                useOperatorNotation = " " + this.operation + " ";
                precedence = 4;
            }
            else if (    (this.operation === "==") 
                      || (this.operation === "!=") 
                      || (this.operation === ">=") 
                      || (this.operation === "<=") 
                      || (this.operation === ">") 
                      || (this.operation === "<") )
            {
                useOperatorNotation = " " + this.operation + " ";
                precedence = 2;
            }
            //power = 5
            //ternary = 2

            let t = ( useOperatorNotation || this.operation === "()" ? "" : this.operation );
            
            const useParenthesis = ( ( this.operation === "()" ) || ( precedence < parentPrecedence ) || (!useOperatorNotation) );

            if ( useParenthesis )
                t += "(";

            let first = true;
            for ( const p of this.params )
            {
                if ( ! first )
                {
                    if ( useOperatorNotation )
                        t += useOperatorNotation;
                    else
                        t += ",";
                }
                t += p.html( asFormula, currentLength, precedence );
                first = false;
            }

            if ( useParenthesis )
                t += ")";

            return t;
        }

        return "???";
    };


    //The dependencies of this expression need adding to the source drawingObject that uses this expression
    addDependencies( source, dependencies ) 
    {
        if ( typeof this.drawingObject1 !== "undefined" )
            dependencies.add( source, this.drawingObject1 );

        if ( typeof this.drawingObject2 !== "undefined" )
            dependencies.add( source, this.drawingObject2 );

        if ( typeof this.splineDrawingObject !== "undefined" )
            dependencies.add( source, this.splineDrawingObject );

        if ( typeof this.drawingObject !== "undefined" ) //e.g. lengthOfArc
            dependencies.add( source, this.drawingObject );

        //variable or measurement
        if (    ( typeof this.variable !== "undefined")
             && (    ( this.variable.isMeasurement  )
                  || ( this.variable.isVariable  ) ) )
            dependencies.add( source, this.variable );

        //recurse into the expression parameters.
        if ( this.params )
        {       
            for ( const p of this.params ) {
                p.addDependencies( source, dependencies );
            }
        }
    }
}



//(c) Copyright 2019 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Bounds {
    
    constructor() {
        this.minX = undefined;
        this.maxX = undefined;
        this.minY = undefined;
        this.maxY = undefined;
    }

    //offset is optinoal
    adjust( p, offset ) {

        if (!p)
            return; //e.g. an error

        const mx = offset?.mx;
        const my = offset?.my;
        this.adjustToIncludeXY( p.x + ( mx !== undefined ? mx : 0 ) , p.y + ( my !== undefined ? my : 0 ) );
    }

    adjustToIncludeXY( x, y ) {

        if (x !== undefined) {
            if ((this.minX === undefined) || (x < this.minX))
                this.minX = x;
            if ((this.maxX === undefined) || (x > this.maxX))
                this.maxX = x;
        }

        if (y !== undefined) {
            if ((this.minY === undefined) || (y < this.minY))
                this.minY = y;
            if ((this.maxY === undefined) || (y > this.maxY))
                this.maxY = y;
        }

        if ( this.parent )
            this.parent.adjustToIncludeXY( x,y );
    }

    adjustForLine(line, offset) {

        if (!line)
            return;

        this.adjust(line.p1, offset);
        this.adjust(line.p2, offset);
    }

    diagonaglLength() {

        const deltaX = ( this.maxX - this.minX );
        const deltaY = ( this.maxY - this.minY );
    
        return Math.sqrt( Math.pow(deltaX,2) + Math.pow(deltaY,2) );
    }

    
    /**
     * Return true if these bounds contain the point, false if the point
     * is outside these bounds. 
     * 
     * @param {*} p 
     */
    containsPoint( p, tolerance )
    {
        tolerance = tolerance === undefined ? 0 : tolerance;
        return    ( p.x >= ( this.minX - tolerance ) )
               && ( p.x <= ( this.maxX + tolerance ) )
               && ( p.y >= ( this.minY - tolerance ) )
               && ( p.y <= ( this.maxY + tolerance ) );
    }
}



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

//If making improvements also research:
//https://github.com/DmitryBaranovskiy/raphael/blob/v2.1.1/dev/raphael.core.js#L1837
//https://github.com/jarek-foksa/path-data-polyfill/blob/master/path-data-polyfill.js

import { Intersection, Point2D, ShapeInfo } from '../node_modules/kld-intersections/dist/index-esm.js';


//An arc of a circle
class GeoArc {

    //center
    //radius
    //angle1 - degrees!
    //angle2 - degrees!

    constructor( center, radius, angle1 /*deg*/, angle2 /*deg*/ ) {
        this.center = center;
        this.radius = radius;
        this.angle1 = angle1;
        this.angle2 = angle2;

        //Correct 180-0 to 180-360
        if ( this.angle2 < this.angle1 )
            this.angle2+=360;
    }

    intersect( arc2 )
    {
        //https://mathworld.wolfram.com/Circle-CircleIntersection.html
        //consider this arc to be centred at 0,0 and re-base arc 2 so that its origin is relative to this
        const a1 = new GeoArc( new GeoPoint(0,0), this.radius, this.angle1, this.angle2 );
        const a2 = new GeoArc( new GeoPoint( arc2.center.x - this.center.x, arc2.center.y - this.center.y), arc2.radius, arc2.angle1, arc2.angle2 );

        //rotate both arcs to be on the x axis. 
        const currentAngle = (new GeoLine( a1.center, a2.center )).angleDeg();
        a1.angle1 -= currentAngle;
        a1.angle2 -= currentAngle;
        a2.angle1 -= currentAngle;
        a2.angle2 -= currentAngle;
        //rotate a2's center.
        a2.center = a2.center.rotate( a1.center, -currentAngle );

        //Now both a1 and a2 have been shift and rotated such that a1 is at 0,0 an a2 is at x,0.
        //d - distance between centers
        const d = Math.abs( a2.center.x );
        if ( d > ( a1.radius + a2.radius ) )
            return []; //circles are too far apart, they don't intersect.

        const x =  ( Math.pow( d, 2 ) - Math.pow( a2.radius, 2 ) + Math.pow( a1.radius, 2 ) ) / ( 2 * d );
        const y = Math.sqrt( Math.pow( a1.radius, 2 ) - Math.pow( x, 2 ) );  //the other point is -y

        let i1 = new GeoPoint( x, y );
        let i2 = new GeoPoint( x, -y );

        const intersects = [ i1, i2 ];
        const goodIntersects = [];

        for( let n in intersects )
        {
            let i = intersects[n];

            //Rotate back
            i = i.rotate( a1.center, currentAngle );

            //Translate back onto the original coordinate system
            i.x = i.x + this.center.x;
            i.y = i.y + this.center.y;

            //Finally check whether either or both of these intersections are within the angles of the arc.
            if (   ( this.isPointOnArc( i ) )
                && ( arc2.isPointOnArc( i ) ) )
                goodIntersects.push( i );    
        }

        return goodIntersects;
    }

    //nb for this use we don't need to check radius. 
    isPointOnArc( p )
    {
        //nb, what about arcs spanning 0 ?  +360?
        const line1 = new GeoLine( this.center, p )
        return ( line1.angleDeg() >= this.angle1 ) && ( line1.angleDeg() <= this.angle2); 
    }

    //https://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes F.6.4 Conversion from center to endpoint parameterization
    //Hashed together from https://stackoverflow.com/questions/30277646/svg-convert-arcs-to-cubic-bezier and https://github.com/BigBadaboom/androidsvg/blob/5db71ef0007b41644258c1f139f941017aef7de3/androidsvg/src/main/java/com/caverock/androidsvg/utils/SVGAndroidRenderer.java#L2889
    asGeoSpline() {

        const angleStartRad = this.angle1 / 360.0 * 2.0 * Math.PI;
        const angleEndRad = this.angle2 / 360.0 * 2.0 * Math.PI;
        const angleExtentRad = angleEndRad - angleStartRad;
        const numSegments =  Math.ceil( Math.abs(angleExtentRad) * 2.0 / Math.PI); 
        const angleIncrement = angleExtentRad / numSegments;

        const controlLength = 4.0 / 3.0 * Math.sin(angleIncrement / 2.0) / (1.0 + Math.cos(angleIncrement / 2.0));

        const nodeData = [];

        let node = {};
        nodeData.push( node );

        for (let i=0; i<numSegments; i++)
        {
            let angle = angleStartRad + i * angleIncrement;
            let dx = Math.cos(angle) * this.radius;
            let dy = Math.sin(angle) * this.radius;

            if ( ! node.point )
                node.point = new GeoPoint( this.center.x + dx , this.center.y - dy );

            node.outControlPoint = new GeoPoint( this.center.x + dx - controlLength * dy, this.center.y - dy - controlLength * dx );

            angle += angleIncrement;
            dx = Math.cos(angle) * this.radius;
            dy = Math.sin(angle) * this.radius;

            node = {};
            nodeData.push( node );
            node.inControlPoint = new GeoPoint( this.center.x + dx + controlLength * dy, this.center.y - dy + controlLength * dx );
            node.point = new GeoPoint( this.center.x + dx, this.center.y - dy );
        }

        return new GeoSpline( nodeData );
    }


    splineBetweenPoints( previousP, nextP )
    {
        return this.asGeoSpline().splineBetweenPoints( previousP, nextP );
    }


    /**
     * Get the points on this arc where the tangents that go through
     * the specified point touch this arc.
     * 
     * @param {*} pointOnTangent 
     */
    getPointsOfTangent( pointOnTangent ) {
        //There is a right angle triangle where
        //hypotenous is the line tangent-arc.center - known length
        //lines tangent-p and p-center form a right angle.   p-center has length arc.radius
        //cos(i) = arc.radius / tangent-arc.center
        const radius  = this.radius;
        const h       = new GeoLine( this.center, pointOnTangent );
        const hLength = h.length;
        const angle   = Math.acos( radius/hLength ); //Would be an error if hLength < radius, as this means pointOnTangent is within the circle. 

        const tangentTouchPoints = [ this.center.pointAtDistanceAndAngleRad( radius, h.angle - angle ),
                                     this.center.pointAtDistanceAndAngleRad( radius, h.angle + angle ) ];        
        
        return tangentTouchPoints;
    }


    svgPath() {

        //TODO if this is a full circle we should really generate an svg circle rather than using a path

        const arcPath = d3.path();

        let a2 = this.angle2;

        if ( a2 < this.angle1 )
            a2 += 360;

        arcPath.arc( this.center.x, this.center.y, 
                    this.radius, 
                    -this.angle1 * Math.PI / 180, -a2 * Math.PI / 180, true );
             

                     //console.log( "Could have used d3:", arcPath.toString() );
        return arcPath.toString();

        //var a2 = this.angle2;
        //if ( this.angle2 < this.angle1 )
        //    a2 = a2 + 360;

        //THIS NOT WORKING
        //var svgParams = this.centeredToSVG( this.center.x, this.center.y, this.radius, this.radius, -this.angle1, a2-this.angle1, 0 );
        //var path = "M" + svgParams.x + "," + svgParams.y 
        //     + "A" + svgParams.rx + "," + svgParams.ry 
        //     + "," + svgParams.xAxisAngle + "," + svgParams.largeArc + "," + svgParams.sweep + ","
        //     + svgParams.x1 + "," + svgParams.y1 
        //
        //console.log( "svgPath() - ", path );

        //return path;
    }    

    
    pointAlongPath( length ) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        if ( length > path.getTotalLength() )
            length = path.getTotalLength();
        const p = path.getPointAtLength( length );
        return new GeoPoint( p.x, p.y );
    }        

    
    pointAlongPathFraction( fraction ) {

        if ( fraction == 0 )
        {
            return this.center.pointAtDistanceAndAngleDeg( this.radius, this.angle1 );
        }

        if ( fraction == 1 )
        {
            return this.center.pointAtDistanceAndAngleDeg( this.radius, this.angle2 );
        }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        const l = path.getTotalLength();
        const p = path.getPointAtLength( l * fraction );
        return new GeoPoint( p.x, p.y );
    }
    
    
    pathLength() {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }             


    asShapeInfo() {  
        if (( this.angle1 == 0 ) && ( this.angle2 == 360 ))
            return ShapeInfo.circle( this.center.x, this.center.y, this.radius );

        //ShapeInfo angles seem to go clockwise from East, rather than our anti-clickwise angles
        let angle1 = 360-this.angle2;
        let angle2 = 360-this.angle1;

        if ( angle1 < 0 )
        {
            angle1 += 360;
            angle2 += 360;
        }

        //if ( angle2 < 0 )
        //    angle2 += 360;

        if ( angle2 < angle1 )
            angle2 += 360;

        //if ( angle2 > 360 ) //the original angle1 was negative. 
        //{
        //    angle1 -= 360;
        //    angle2 -= 360;
        //}

        //if ( angle1 < 0 )
        //angle1 = 0;

        //if ( angle2 < 0 )
        //angle2 = 0;

       // if ( angle2 < angle1 )
       // {
       //     var t = angle2;
       //     angle2 = angle1;
       //     angle1 = t;
       // }
                
        return ShapeInfo.arc( this.center.x, this.center.y, this.radius, this.radius, angle1 * Math.PI/180, angle2 * Math.PI/180 );
    }    


    applyOperation( pointTransformer ) {//apply a operationFlip or operationRotate to this GeoArc
        const center2 = pointTransformer( this.center );

        //s = the point on the arc that we start drawing
        const s = this.center.pointAtDistanceAndAngleDeg( this.radius, this.angle1 );
        const s2 = pointTransformer( s );
        const s2line = new GeoLine( center2, s2 );
        const startAngle2 = s2line.angleDeg();

        //f = the point on the arc that we finish drawing
        const f = this.center.pointAtDistanceAndAngleDeg( this.radius, this.angle2 );
        const f2 = pointTransformer( f );
        const f2line = new GeoLine( center2, f2 );
        const finishAngle2 = f2line.angleDeg();

        //Because we've flipped the start angle becomes the finish angle and vice verasa.
        return new GeoArc(  center2, this.radius, finishAngle2 /*deg*/, startAngle2 /*deg*/  );
    }


    adjustBounds( bounds ) {

        //An arc, between 70, and 100 degrees would be bounded by the start and stop
        //points and the point at 90 degrees. 
        var startPoint = this.pointAlongPathFraction(0);
        var endPoint = this.pointAlongPathFraction(0);
        bounds.adjust( startPoint );
        bounds.adjust( endPoint );

        if (( this.angle1 < 90 ) && ( this.angle2 > 90 ))        
            bounds.adjustToIncludeXY( this.center.x, this.center.y - this.radius ); //add N

        if (( this.angle1 < 180 ) && ( this.angle2 > 180 ))        
            bounds.adjustToIncludeXY( this.center.x - this.radius, this.center.y ); //add W

        if (( this.angle1 < 270 ) && ( this.angle2 > 270 ))        
            bounds.adjustToIncludeXY( this.center.x, this.center.y + this.radius ); //add S

        if (( this.angle1 < 360 ) && ( this.angle2 > 360 ))        
            bounds.adjustToIncludeXY( this.center.x + this.radius, this.center.y ); //add E
    }
}



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

class GeoEllipticalArc {

    constructor( center, radius1, radius2, angle1, angle2, rotationAngle ) {
        this.center = center;
        this.radius1 = radius1;
        this.radius2 = radius2;
        this.angle1 = angle1;
        this.angle2 = angle2;
        this.rotationAngle = rotationAngle;
    }


    clone() {
        return new GeoEllipticalArc( this.center, 
                                     this.radius1, 
                                     this.radius2, 
                                     this.angle1,  
                                     this.angle2,
                                     this.rotationAngle );
    }

    //https://observablehq.com/@toja/ellipse-and-elliptical-arc-conversion
    //http://xahlee.info/js/svg_path_ellipse_arc.html
    //https://observablehq.com/@toja/ellipse-and-elliptical-arc-conversion
    getEllipsePointForAngle(cx, cy, rx, ry, phi, theta) {
        const { sin, cos, sqrt, pow } = Math;
        
        //https://en.wikipedia.org/wiki/Ellipse#Polar_form_relative_to_focus
        const radius=   ( rx * ry )
                      / sqrt( pow( rx * sin( theta ),2 ) + pow( ry * cos( theta ), 2 ) ); 

        const M = radius * cos(theta),
              N = radius * sin(theta);  

        return { x: cx + cos(phi) * M - sin(phi) * N,
                 y: cy + sin(phi) * M + cos(phi) * N };
     }


    //TODO based on SVG book, but corrected
    centeredToSVG( cx, cy, rx, ry, thetaDeg/*arcStart*/, deltaDeg/*arcExtent*/, phiDeg/*x axis rotation*/ ) {
        
        const theta = thetaDeg * Math.PI / 180;
        const endTheta = ( thetaDeg + deltaDeg ) * Math.PI / 180;
        const phiRad = phiDeg * Math.PI / 180;

        //console.log( "centeredToSVG thetaDeg: " + thetaDeg );
        //console.log( "centeredToSVG deltaDeg: " + deltaDeg );
        //console.log( "centeredToSVG endThetaDeg: " + ( thetaDeg + deltaDeg ) );
        //console.log( "centeredToSVG endTheta: " + endTheta );

        const start = this.getEllipsePointForAngle(cx, cy, rx, ry, phiRad, theta);
        const end = this.getEllipsePointForAngle(cx, cy, rx, ry, phiRad, endTheta);

        //console.log( "3. centeredToSVG x0,y0: " + x0 + "," + y0 );
        //console.log( "3. centeredToSVG x1,y1: " + x1 + "," + y1 );

        const largeArc = ( deltaDeg > 180 ) || ( deltaDeg < -180 ) ? 1 : 0;
        const sweep = ( deltaDeg > 0 ) ? 0 : 1;
         
        return { x: start.x,
                 y: start.y,
                rx: rx,
                ry: ry,
                xAxisAngle: phiDeg,
                largeArc: largeArc,
                sweep: sweep,
                x1: end.x,
                y1: end.y };
    }    


    useSvgEllipse() {
        //we can use <ellipse> if it is a full ellipse, otherwise we need to use an elliptical arc path
        return (    ( this.angle1 === 0 ) 
                 && ( this.angle2 === 360 ) );
    }


    svgPath() {
        // 90->180   -90 -> -180     -90,-90
        // 0->90   -0 +-90



        const d2 = this.centeredToSVG( this.center.x, this.center.y, this.radius1, this.radius2, 360-(this.angle1), -(this.angle2 - this.angle1), -this.rotationAngle );
        let path = "M" + d2.x + "," + d2.y;
        path += " A" + d2.rx + " " + d2.ry;
        path += " " + d2.xAxisAngle;
        path += " " + d2.largeArc + ",0";// + d2.sweep;
        path += " " + d2.x1 + "," + ( d2.y1 + (((d2.y===d2.y1)&&(d2.x===d2.x1))?0.001:0)  ) + " "; //we need to start/stop on a slightly different point
        //The fudge above that allows the path to work even for a full ellipse should never be needed as if it is a full ellipse useSvgEllipse() should return true.

        //console.log( "GeoEllipticalArc: " + path );

        return path;
    }


    asShapeInfo() {
        //TEMPORARY ON TRIAL - THIS WORKS, SO ROTATE TRANSLATE 
        //              cx, cy, rx, ry. start, end   
        if ( this.rotationAngle === 0 )
            return ShapeInfo.arc( this.center.x, this.center.y, this.radius1, this.radius2, this.angle1/180*Math.PI, this.angle2/180*Math.PI)

        const svgPath = this.svgPath();
        //console.log( "EllipticalArc.asShapeInfo() this might not work for intersections... " + svgPath );
        return ShapeInfo.path( svgPath );
    }
    

    asGeoSpline() {

        //Un-rotate this if it is rotated
        if ( this.rotationAngle !== 0 )
        {
            const center = this.center;
            const rotationAngle = this.rotationAngle;
            const unrotator = function( p ) {
                return p.rotate( center, -rotationAngle );
            };
            const unrotatedArc = this.applyOperation( unrotator );

            const unrotatedSplines = unrotatedArc.asGeoSpline();

            const rerotator = function( p ) {
                return p.rotate( center, rotationAngle );
            };

            return unrotatedSplines.applyOperation( rerotator );
        }

        //We won't be a rotated elipse. 

        const angleStartRad = this.angle1 / 360.0 * 2.0 * Math.PI;
        const angleEndRad = this.angle2 / 360.0 * 2.0 * Math.PI;
        const angleExtentRad = angleEndRad - angleStartRad;
        const numSegments =  Math.ceil( Math.abs(angleExtentRad) * 2.0 / Math.PI); 
        const angleIncrement = angleExtentRad / numSegments;

        const controlLength = 4.0 / 3.0 * Math.sin(angleIncrement / 2.0) / (1.0 + Math.cos(angleIncrement / 2.0));

        const nodeData = [];

        let node = {};
        nodeData.push( node );

        for (let i=0; i<numSegments; i++)
        {
            let angle = angleStartRad + i * angleIncrement;

            let dxr1 = Math.cos(angle) * this.radius1;
            let dxr2 = Math.cos(angle) * this.radius2;
            let dyr1 = Math.sin(angle) * this.radius1;
            let dyr2 = Math.sin(angle) * this.radius2;

            if ( ! node.point )
                node.point = new GeoPoint( this.center.x + dxr1 , this.center.y - dyr2 );

            node.outControlPoint = new GeoPoint( this.center.x + dxr1 - controlLength * dyr1, this.center.y - dyr2 - controlLength * dxr2 );

            angle += angleIncrement;
            dxr1 = Math.cos(angle) * this.radius1;
            dxr2 = Math.cos(angle) * this.radius2;
            dyr1 = Math.sin(angle) * this.radius1;
            dyr2 = Math.sin(angle) * this.radius2;

            node = {};
            nodeData.push( node );
            node.inControlPoint = new GeoPoint( this.center.x + dxr1 + controlLength * dyr1, this.center.y - dyr2 + controlLength * dxr2 );
            node.point = new GeoPoint( this.center.x + dxr1, this.center.y - dyr2 );
        }

        return new GeoSpline( nodeData );        
    }


    pointAlongPathFraction( fraction ) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        const l = path.getTotalLength();
        const p = path.getPointAtLength( l * fraction );
        return new GeoPoint( p.x, p.y );
    }       


    pointAlongPath( length ) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        const p = path.getPointAtLength( length );
        return new GeoPoint( p.x, p.y );
    }       


    pathLength() {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }             


    applyOperation( pointTransformer ) { //apply a operationFlip or operationRotate to this GeoEllipticalArc

        const center2 = pointTransformer( this.center );

        //Converted start and finishing angles are calculated identically to a circle
        //It doesn't matter from this perspective whether we use radius1 or radius2

        //s = the point on the arc that we start drawing
        const s = this.center.pointAtDistanceAndAngleDeg( this.radius1, this.angle1 + this.rotationAngle );
        const s2 = pointTransformer( s );
        const s2line = new GeoLine( center2, s2 );
        let startAngle2 = s2line.angleDeg();

        //f = the point on the arc that we finish drawing
        const f = this.center.pointAtDistanceAndAngleDeg( this.radius1, this.angle2 + this.rotationAngle );
        const f2 = pointTransformer( f );
        const f2line = new GeoLine( center2, f2 );
        let finishAngle2 = f2line.angleDeg();

        //don't abritrarily convert 360 to 0. 
        if (( finishAngle2 === 0 ) && ( this.angle2 === 360 ))
            finishAngle2 = 360;

        if (( startAngle2 === 0 ) && ( this.angle1 === 360 ))
            startAngle2 = 360;

        //Is this a good enough test?
        const isFlip = ( this.angle1 < this.angle2 ) != ( startAngle2 < finishAngle2 );

        //This is an ellipse, so we also need to adjust the ellipse rotation. 
        const r = this.center.pointAtDistanceAndAngleDeg( this.radius1, this.rotationAngle );
        const r2 = pointTransformer( r );
        const r2line = new GeoLine( center2, r2 );
        let rotationAngle2 = r2line.angleDeg() + ( isFlip ? 180 : 0 );

        // + 180;
        if ( rotationAngle2 >= 360 )
            rotationAngle2 -= 360;

        //finally, start and finish point angles are defined with respect to the rotation angle
        startAngle2 -= rotationAngle2;
        finishAngle2 -= rotationAngle2;

        //If we've flipped the start angle becomes the finish angle and vice versa.
        return new GeoEllipticalArc( center2, this.radius1, this.radius2, isFlip ? finishAngle2 : startAngle2/*deg*/, isFlip ? startAngle2 : finishAngle2/*deg*/, rotationAngle2 /*deg*/ )
    }


    adjustBounds( bounds ) {
        //TODO determine the bounds for a similar non-rotated ellipse
        //and rotate

        bounds.adjust( this.pointAlongPathFraction( 0 ) );
        bounds.adjust( this.pointAlongPathFraction( 0.25 ) );
        bounds.adjust( this.pointAlongPathFraction( 0.5 ) );
        bounds.adjust( this.pointAlongPathFraction( 0.75 ) );
        bounds.adjust( this.pointAlongPathFraction( 1 ) );
    }
}


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

//A line
class GeoLine {

    //p1;
    //p2;

    constructor( p1, p2 ) {

        if ( ! p1 )
            throw new Error( "GeoLine p1 not defined." );

        if ( ! p2 )
            throw new Error( "GeoLine p2 not defined." );

        this.p1 = p1;
        this.p2 = p2;
    
        this.deltaX = ( this.p2.x - this.p1.x ); //nb. +ve to the east from p1 to p2
        this.deltaY = ( this.p2.y - this.p1.y ); //nb +ve to the south from p1 to p2
    
        this.length = Math.sqrt( Math.pow(this.deltaX,2) + Math.pow(this.deltaY,2) );

        //angle is anti-clockwise starting east in radians
        this.angle = Math.atan2( -this.deltaY, this.deltaX );

        if ( this.angle < 0 )
            this.angle = this.angle + (2 * Math.PI);          
    
        this.slope  = ( this.deltaY / this.deltaX );
        this.offset = this.p1.y - ( this.p1.x * this.slope ); //the y values where x = 0; the intersection of the line with the y-axis
        //this line is generically: y = offset + ( x * slope )
    }

    //Return a GeoPoint for the intersection of this line with line2. 
    intersect( line2 ) {    
        //intersection
        //  // offset - line2.offset / ( line2.slope - slope ) = x

        const swap = Math.abs( this.deltaX ) > Math.abs( line2.deltaX );
        const line1s = swap ? this : line2;
        const line2s = swap ? line2 : this;

        let x, y;

        if (    ( line2s.slope === Infinity ) 
             || ( line2s.slope === -Infinity )  )
            x = line2s.p1.x;
        else
            x = ( line1s.offset - line2s.offset ) / ( line2s.slope - line1s.slope );

        if ( line1s.slope === 0 )
            y = line1s.p1.y;
        else
            y = line1s.p1.y + ( line1s.slope * ( x - line1s.p1.x ) );

        return new GeoPoint(x,y);

        //Using the Intersection libary requires that the finite lines intersect, rather than
        //their infinite versions. 
        //var line1SI = this.asShapeInfo();
        //var line2SI = line2.asShapeInfo();
        //var intersections = Intersection.intersect(line1SI, line2SI);        
        //intersections.points.forEach(console.log);    
        //return new GeoPoint( intersections.points[0].x, intersections.points[0].y );
    }    


    //Return a GeoPoint for where this line intersects the specified GeoArc, GeoEllipticalArc, or GeoSpline.
    intersectArc( arc, alreadyTweaked ) { 
        //work around a bug where the arc spans 0 deg
        if (    ( arc instanceof GeoArc )
             && ( arc.angle1 < 0 ) 
             && ( arc.angle2 > 0 ) 
              ) //not an elliptical
        {
            try { 
                const arc1 = new GeoArc( arc.center, arc.radius, 0, arc.angle2 );
                return this.intersectArc( arc1 );
            } catch ( e ) {
                const arc2 = new GeoArc( arc.center, arc.radius, arc.angle1 + 360, 360 );
                return this.intersectArc( arc2 );
            }
        }
        if (    ( arc.angle1 < 360 ) 
             && ( arc.angle2 > 360 ) 
             && ( arc instanceof GeoArc ) ) //not an elliptical
        {
            try { 
                const arc1 = new GeoArc( arc.center, arc.radius, 0, arc.angle2 -360 );
                return this.intersectArc( arc1 );
            } catch ( e ) {
                const arc2 = new GeoArc( arc.center, arc.radius, arc.angle1, 360 );
                return this.intersectArc( arc2 );
            }
        }

        let arcSI,lineSI;

        //nb there is a special case for GeoEllipticalArc where this.p1 == arc.center in 
        //which case a simple formula gives the intersect.

        if (( arc instanceof GeoEllipticalArc ) && ( arc.rotationAngle !== 0 ))
        {            
            //console.log("elliptical arc ");
            
            //create an equivalent arc that is not rotated.
            //create a new line, rotate the startpoint by -rotationAngle, the new lines angle should also be less by -rotationAngle
            //finally rotate the intersect point back
            const nrArc = new GeoEllipticalArc( arc.center,
                                              arc.radius1,
                                              arc.radius2, 
                                              arc.angle1, 
                                              arc.angle2,
                                              0 );
            const p1rotated = this.p1.rotate( arc.center, -arc.rotationAngle );
            const bounds = new Bounds();
            bounds.adjust( p1rotated );
            arc.adjustBounds( bounds );
            const maxLineLength = bounds.diagonaglLength() * 1.25;
            const lineRotated = new GeoLine( p1rotated, p1rotated.pointAtDistanceAndAngleDeg( maxLineLength/*infinite*/, (this.angleDeg() - arc.rotationAngle) ) );
            lineSI = lineRotated.asShapeInfo();
            arcSI = nrArc.asShapeInfo();
        }
        else
        {
            const bounds = new Bounds();
            bounds.adjust( this.p1 );
            arc.adjustBounds( bounds );
            const maxLineLength = bounds.diagonaglLength() * 1.25;
            
            //This should be sufficient, extend our line forward enough that it should intersect...
            //Ensure that the line is long enough to intersect. 
            const extendedLine = new GeoLine( this.p1, this.p1.pointAtDistanceAndAngleRad( maxLineLength, this.angle ));  

            arcSI = arc.asShapeInfo();
            lineSI = extendedLine.asShapeInfo();    
        }
    
        let intersections = Intersection.intersect(arcSI, lineSI);
        
        if ( intersections.points.length === 0 )
        { 
            if ( ! alreadyTweaked )
            {
                //console.log( "Failed for angle ", this.angle );
                //console.log( "PI:", this.angle/Math.PI );
                const lineTweaked = new GeoLine( this.p1, this.p1.pointAtDistanceAndAngleRad( this.length, this.angle + (Math.PI/180 * 0.00000001) )); //Adding a billionth of a degree fixes the broken intersection issue.

                try {
                    //This should be no different, but sometimes this works when arc-line intersect fails
                    return lineTweaked.intersectArc( arc, true );
                } catch ( e ) {
                    //There still appears to be a bug in arc intersection. 
                    if (( arc instanceof GeoArc ) || ( arc instanceof GeoEllipticalArc ))
                    {
                        const arcAsSpline = arc.asGeoSpline();
                        return this.intersectArc( arcAsSpline );
                    }
                    else
                        throw e;
                }
            }
            throw new Error( "No intersection with arc. " );
        }

        let whichPoint = 0;
        if ( intersections.points.length > 1 )//-1;//0; //0 for G1 in headpattern. //intersections.points.length -1; //TODO do this properly
        {            
            //choose the first point we get to along the line. 
            let smallestDistance;
            for (const i in intersections.points ) 
            {
                const pi = intersections.points[i];
                const p1pi = new GeoLine( this.p1, pi );
                
                if (    ( smallestDistance === undefined ) 
                        || (    ( Math.abs( p1pi.angle - this.angle ) < 0.0001 ) //rather than 180 deg the other way (allowing for rounding errors)
                            && ( p1pi.length < smallestDistance ) ) )
                {
                    smallestDistance = p1pi.length;
                    whichPoint = i;
                }
            }
        }

        let intersect = new GeoPoint( intersections.points[whichPoint].x, intersections.points[whichPoint].y );

        if (( arc instanceof GeoEllipticalArc ) && ( arc.rotationAngle !== 0 ))
        {
            intersect = intersect.rotate( arc.center, +arc.rotationAngle );
        }

        return intersect;
    }


    //Return a GeoLine having applied the operationFlip or operationRotate to this GeoLine.
    applyOperation( pointTransformer ) {
        const p1Transformed = pointTransformer( this.p1 );
        const p2Transformed =  pointTransformer( this.p2 );
        return new GeoLine( p1Transformed, p2Transformed );
    }    


    asShapeInfo() {
        return ShapeInfo.line( this.p1.x, this.p1.y, this.p2.x, this.p2.y );
    }


    svgPath() 
    {
        return "M" + this.p1.x + "," + this.p1.y + " " +
               "L" + this.p2.x + "," + this.p2.y + " ";
    }


    angleDeg() {

       return this.angle * 180 / Math.PI;
    }


    angleRad() {
        return this.angle;
    }


    getLength() {
        return this.length;
    }


    pointAlongPathFraction( fraction ) {
        if ( fraction == 0 )
            return this.p1;

        if ( fraction == 100 )
            return this.p2;

        return new GeoPoint( ( this.p2.x - this.p1.x ) * fraction + this.p1.x,
                             ( this.p2.y - this.p1.y ) * fraction + this.p1.y );
    }
}


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


//A point
class GeoPoint {

    constructor( x, y ) {
        this.x = x;
        this.y = y;

        if ( isNaN( this.x ) )
            throw new Error( "GeoPoint x not a number." );
            
        if ( isNaN( this.y ) )
            throw new Error( "GeoPoint y not a number." );
    }

    
    line( point2 ) {    
        throw "this looks broken, two params, not four";
        return new GeoLine( this.x, this.y, point2.x, point2.y );
    }


    pointAtDistanceAndAngleRad( length, angle /*radians anti-clockwise from east*/ ) {        
        const x = this.x + length * Math.cos( -1 * angle ); //TODO this is a guess!
        const y = this.y + length * Math.sin( -1 * angle );   
        return new GeoPoint( x, y );
    }


    pointAtDistanceAndAngleDeg( length, angle /*deg anti-clockwise from east*/ ) {        
        return this.pointAtDistanceAndAngleRad( length, angle * Math.PI / 180 );
    }


    rotate( center, rotateAngleDeg ) {
        //Convert degrees to radians
        
        const centerToSourceLine = new GeoLine( center, this );
        const distance = centerToSourceLine.getLength();
        const angle = centerToSourceLine.angleDeg() + rotateAngleDeg;

        const result = center.pointAtDistanceAndAngleDeg( distance, angle );
        return result;
    }


    asPoint2D() {
        return new Point2D( this.x, this.y );
    }


    equals( p )
    {
        if ( p === this )
            return true;

        if ( this.x === p.x && this.y === p.y )
            return true;

        const dx = Math.abs( this.x - p.x );
        const dy = Math.abs( this.y - p.y );
        
        if (( dx < 0.01 ) && ( dy < 0.01 ))
        {
            if (( dx < 0.001 ) && ( dy < 0.001 ))
            {
                //console.warn("EQUALS - CLOSE! " + Math.max( dx, dy ) + " MATCHED");
                return true;
            }
            //else
            //    console.warn("EQUALS - CLOSE! " + Math.max( dx, dy ) + " X");
        }

        return this.x === p.x && this.y === p.y;
    }


    toString()
    {
        return "(" + Math.round(this.x*100)/100 + "," + Math.round(this.y*100)/100 + ")";
    }
}


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

class GeoSpline {

    //nodeData - an array of
    //{ 
    //  inAngle  : deg
    //  inLength : 
    //  point    : 
    //  outAngle : deg
    //  outLength:  
    //} 

    constructor( nodeData ) {
        this.nodeData = nodeData;

        for( const n of this.nodeData )
        {
            if (( ! n.outControlPoint ) && ( typeof n.outAngle === "number" ) && ( typeof n.outLength === "number" ))
            {
                n.outControlPoint = n.point.pointAtDistanceAndAngleDeg( n.outLength, n.outAngle );
            }
            else if (    n.outControlPoint 
                     && ( n.outAngle === undefined || n.outLength === undefined ) )
            {
                //using angles in formulas requires that these are set
                const l = new GeoLine( n.point, n.outControlPoint );
                n.outAngle = l.angleDeg();
                n.outLength = l.getLength();
            }

            if (( ! n.inControlPoint ) && ( typeof n.inAngle === "number" ) && ( typeof n.inLength === "number" ))
            {
                n.inControlPoint = n.point.pointAtDistanceAndAngleDeg( n.inLength, n.inAngle );
            }
            else if ( n.inControlPoint
                      && ( n.inAngle === undefined || n.inLength === null ))
            {
                const l = new GeoLine( n.point, n.inControlPoint );
                n.inAngle = l.angleDeg();
                n.inLength = l.getLength();
            }
        }
    }


    applyOperation( pointTransformer ) { //apply a operationFlip or operationRotate to this GeoSpline
        const nodeData = [];
        for ( const node of this.nodeData )
        {
            //Need a control point, not a length and angle. 
            let inPoint = node.inControlPoint;
            let outPoint = node.outControlPoint;
            
            if ( ( ! inPoint ) && ( node.inLength !== undefined ) )            
                inPoint = node.point.pointAtDistanceAndAngleDeg( node.inLength, node.inAngle );

            if ( ( ! outPoint ) && ( node.outLength !== undefined ) )
                outPoint = node.point.pointAtDistanceAndAngleDeg( node.outLength, node.outAngle );
    
            const inPointTransformed = inPoint === undefined ? undefined : pointTransformer( inPoint );
            const outPointTransformed =  outPoint === undefined ? undefined : pointTransformer( outPoint );

            nodeData.push( {inControlPoint:   inPointTransformed,
                            point:            pointTransformer( node.point ),
                            outControlPoint:  outPointTransformed } ) ;
        }
        return new GeoSpline( nodeData );
    }


    svgPath( continuePath ) {
        const nodeData = this.nodeData;
        let path = continuePath ? continuePath : "";
        for ( let i=0; i<nodeData.length; i++ )
        {
            if ( i===0 )
            {
                path+= ( continuePath ? "L" : "M" ) + Math.round( nodeData[i].point.x *1000 )/1000 + "," + Math.round( this.nodeData[i].point.y *1000)/1000 ;
            }
            else
            {
                const controlPoint1 = ( typeof nodeData[i-1].outControlPoint !== "undefined" ) ? nodeData[i-1].outControlPoint
                                                                                             : nodeData[i-1].point.pointAtDistanceAndAngleDeg( nodeData[i-1].outLength, nodeData[i-1].outAngle );

                const controlPoint2 = ( typeof nodeData[i].inControlPoint !== "undefined" ) ? nodeData[i].inControlPoint
                                                                                          : nodeData[i].point.pointAtDistanceAndAngleDeg( nodeData[i].inLength, nodeData[i].inAngle );

                path += "C" + Math.round( controlPoint1.x * 1000 ) / 1000 + "," + Math.round( controlPoint1.y * 1000 ) / 1000 +
                        " " + Math.round( controlPoint2.x * 1000 ) / 1000 + "," + Math.round( controlPoint2.y * 1000 ) / 1000 +
                        " " + Math.round( nodeData[i].point.x * 1000 ) / 1000 + "," + Math.round( nodeData[i].point.y * 1000 ) / 1000 + " ";
            }
        }
        //console.log( "GeoSpline: " + path );
        return path;
    }


    reverse()
    {
        const len = this.nodeData.length;
        const revNodeData = [len];
        for ( const i in this.nodeData )
        {
            const node = this.nodeData[i];

            revNodeData[len-i-1] =  { inControlPoint:   node.outControlPoint,
                                      point:            node.point,
                                      outControlPoint:  node.inControlPoint };
        }
        return new GeoSpline( revNodeData );
    }


    asShapeInfo() {
        return ShapeInfo.path( this.svgPath() );
    }
    

    pointAlongPathFraction( fraction ) {

        if ( fraction == 0 )
            return this.nodeData[0].point;

        if ( fraction == 1 )
            return this.nodeData[ this.nodeData.length-1 ].point;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        const l = path.getTotalLength();
        const p = path.getPointAtLength( l * fraction );

        //Note, we cannot, even if a single segment use this.getPointForT() because
        //length is not linear with t.
        //
        //If we want to do the calculation ourselves it will by treating the curve
        //as 50 or so little lines using this.getPointForT() and using the length of
        //those lines. 

        return new GeoPoint( p.x, p.y );
    }       


    pointAlongPath( length ) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        const xy = path.getPointAtLength( length );    
        const p = new GeoPoint( xy.x, xy.y );

        //If we want to do the calculation ourselves: 
        //iterate over the segments, adding their length to the total
        //if a segment would blow the total, then instead guess a value 
        //of t for the last bit of length required. Return the point appropriate to that t. 
        //t = 0
        //g = 0.01
        //lastP = nodeData[0].point;
        //for( var t=0.0; t<1.0; t+=g )
        //   nextP = this.getPointForT( t + g );
        //   lineLength = 
        //   totalLength += lineLength
        //   if ( totalLength > length )
        //      return a point along this last line. 

        //let's cross check!
        if ( this.nodeData.length === 2 )
        {
            const t = this.findTForPoint( p );

            if ( t === undefined )
                console.log("ERROR: Result of pointAlongPath() is not on path?" );
        }
        else
        {
            const cut = this.cutAtPoint( p );
            if ( cut === undefined )
                console.log("ERROR: Result of pointAlongPath() is not on path?" );
        }

        return p;
    }


    pathLengthAtPoint( p ) {
        //do a binary search on the length of the curve to find out best % along curve that is our intersection point. 

        const firstNode = this.nodeData[0].point;
        if (    ( p.x === firstNode.x )
             && ( p.y === firstNode.y ) )
             return 0;

        const lastNode = this.nodeData[ this.nodeData.length -1 ].point;
        if (    ( p.x === lastNode.x )
             && ( p.y === lastNode.y ) )
             return this.pathLength();

        const cutSpline = this.cutAtPoint( p ).beforePoint;

        return cutSpline.pathLength();
    }


    /**
     * Return the value t for this spline.
     * If this spline has two nodes, then t is between 0 and 1, or undefined if point p is not on the curve.
     * If this spline has three+ nodes then t is between 0 and nodes.length-1. 
     * @param {*} p 
     * @returns 
     */
    findTForPoint(p) {

        //We could do this for each segnment and instantly dismiss any segment where p not in the box bounded by
        //the polygon nodeDate[0].point, nodeData[0].outControlPoint, nodeData[1].inControlPoint, nodeData[1].point. 
        if ( this.nodeData.length !== 2 )
        {
            for ( let i=0; i<(this.nodeData.length-1); i++ )
            {
                const node1 = this.nodeData[i];
                const node2 = this.nodeData[i+1];

                if ( node1.point.equals( p ) )
                    return i * 1.0;

                if ( node2.point.equals( p ) )
                    return (i+1) *1.0;

                const segment = new GeoSpline( [ node1, node2 ] );
                const bounds = new Bounds();
                segment.adjustBounds( bounds );

                if ( ! bounds.containsPoint(p, 0.0002 ) )
                    continue;

                //console.log( "Segment " + i );
                const t = segment.findTForPoint(p);
                if ( t !== undefined )
                    return t+i
            }

            //console.warn("Point not on curve. not in any segments bounding box");    
            return undefined;
        }

        //only where nodeData.length == 2
        //sometimes we're testing whether point p is on the arc. 

        if ( this.nodeData[0].point.equals( p ) )
            return 0.0;

        if ( this.nodeData[1].point.equals( p ) )
            return 1.0;        

        let minT = 0.0,
            maxT = 1.0,
            iter = 0;

        const threshold = 0.0001;

        let t;
        let closestDistance;
        let closestT;
        while( iter < 20 ) { //after 20 iterations the interval will be tiny
            iter++;
            closestDistance = undefined;
            closestT = null;
            const interval = (maxT - minT)/4; //0.25 first time around.
            for( t = minT; t<=maxT; t+= interval ) //five iterations the first time, 0, 0.25, 0.5, 0.75, 1.0
            {
                const pt = this.getPointForT( t );
                const d = Math.sqrt( Math.pow( pt.x - p.x, 2) + Math.pow( pt.y - p.y, 2) );
                if (( closestDistance === undefined ) || ( d < closestDistance ))
                {
                    closestT = t;
                    closestDistance = d;
                }

                if ( d < threshold )
                {
                    //console.log( "findT i:" + iter + " t:" + t + " d:" + d + " FOUND" );
                    return t;
                }

            }
            minT = Math.max( closestT - (interval*1.001), 0.0 ); //So at the end of iteration 1 we'll be setting up a span next time that is 0.5 wide, which we'll cut into five slots 
            maxT = Math.min( closestT + (interval*1.001), 1.0 );
            //console.log( "i:" + iter + " minT:" + minT + " maxT:" + maxT + " closestT:" + closestT + " threshold:" + threshold + " closestDistance: " + closestDistance  );
        }
        
        if (   ( closestT >= 0.0 ) 
            && ( closestT <= 1.0 ) )
        {
            const pt = this.getPointForT( closestT );
            const d = Math.sqrt( Math.pow( pt.x - p.x, 2) + Math.pow( pt.y - p.y, 2) );

            if ( d <= (threshold*10) ) //Stocking top appears to need threshold*2
            {
                //console.warn("Iter max reached. interval:" + (maxT-minT) + " d:" + d + " threshold:" + threshold + " closestT"+ closestT + " FOUND");    
                return t; 
            }

        }

        //console.warn("Point not on curve. interval:" + (maxT-minT) + " d:" + closestDistance + " threshold:" + threshold + " closestT"+ closestT);    

        return undefined;
    }

    pathSegment( segment ) {
        if ( ! segment )
            return this;

        //Create a shorter path
        const startNode = this.nodeData[ segment -1 ];
        const endNode = this.nodeData[ segment ];
        const shorterPath = new GeoSpline( [ startNode, endNode ] );
        return shorterPath;
    }


    /**
     * Return the length of this spline, or the given segment. 
     * @param {*} segment 
     * @returns 
     */
    pathLength( segment ) {

        if ( segment ) {
            return this.pathSegment(segment).pathLength();
        }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }


    splineBetweenPoints( p1, p2 )
    {
        let t1 = this.findTForPoint(p1);

        if ( t1 === undefined )
            throw new Error( "p1 is not on spline." );

        let t2 = this.findTForPoint(p2);

        if ( t2 === undefined )
            throw new Error( "p2 is not on spline." );

        if (( t1 === 0 ) && ( t2 === this.nodeData.length ))
            return this;

        if ( t1 > t2 )
        {
            //Swap the parameters
            const p = p1;
            p1 = p2;
            p2 = p;
            const t = t1;
            t1 = t2;
            t2 = t;
        }

        if (    Number.isInteger( t1 ) 
             && Number.isInteger( t2 ) )
        {
            //An easy subset of the curve matching the nodes.
            const nodeSubset = [];
            for ( let i= t1; i<=t2; i++ )
                nodeSubset.push( this.nodeData[i] );
            return new GeoSpline( nodeSubset );
        } 

        //This alternative doesn't quite work out the way it should, but would be slightly more efficient. 
        //E.g. if t1=0.5 t2=4.5
        //For each of 0,1,2,3,4,5
        //0 less than t1, split and add part2 and modified node 1
        //1 skip as we added a modified node1
        //2 add
        //3 add
        //4 add
        //5 greater than t2, split and add part1, and modify what we added in 4
        //1.2 - 1.3
        //1 less than t1, split and add part 2
        //2 greater than t2, split and add part 1;
        try{        

            if (    ( Math.floor(t1) != Math.floor(t2) )
                 && ( Math.ceil(t1) != Math.ceil(t2) ) ) //e.g. 0.5 and 1 would fail the first test, but match this one. 
            {
                const nodeSubset = [];
                for ( let i= Math.floor(t1); i<=Math.ceil(t2); i++ )
                {
                    if ( i < t1 )
                    {
                        const segment = this.pathSegment( i+1 ); 
                        const splits = segment.cutAtT( t1 - Math.floor(t1) );
                        const n2 = this.nodeData[i+1];
                        splits.afterPoint.nodeData[1].outControlPoint = n2.outControlPoint;
                        splits.afterPoint.nodeData[1].outAngle = n2.outAngle;
                        splits.afterPoint.nodeData[1].outLength = n2.outLength;
                        nodeSubset.push( splits.afterPoint.nodeData[0] );
                        nodeSubset.push( splits.afterPoint.nodeData[1] );
                        i++; //we've already done i+1
                    }
                    else if ( i > t2 )
                    {
                        const segment = this.pathSegment( i ); 
                        const splits = segment.cutAtT( t2 - Math.floor(t2) );
                        const p = nodeSubset.pop();
                        splits.beforePoint.nodeData[0].inControlPoint = p.inControlPoint;
                        splits.beforePoint.nodeData[0].inAngle = p.inAngle;
                        splits.beforePoint.nodeData[0].inLength = p.inLength;
                        nodeSubset.push( splits.beforePoint.nodeData[0] );
                        nodeSubset.push( splits.beforePoint.nodeData[1] );
                    }
                    else
                        nodeSubset.push( this.nodeData[i] )
                }
                return new GeoSpline( nodeSubset );
            }
            
        } catch ( e ) {
            console.log("Failed fast splineBetweenPoints() ", e );
        }

        //The older way which works but needs to find t2 afresh
        const c1 = this.cutAtPoint( p1 );

        if ( c1 === undefined )
            throw new Error( "p1 is not on spline." );

        const splineAfterPoint = c1.afterPoint;
        const c3 = splineAfterPoint.cutAtPoint( p2 );
        if ( ! c3 )
            console.log("c3 not found"); //this is odd because c1 and c2 were found
        const cut2 = c3 ? c3.beforePoint : splineAfterPoint;
        return cut2;
        //Compare the two approaches
        // if ( alt )
        // {
        //     if ( alt.nodeData.length == cut2.nodeData.length )
        //     {
        //         if ( alt.toString() !== cut2.toString() )
        //         {
        //             console.log( "*********** ERROR ********** - same length" );
        //             console.log( alt.toString() );
        //             console.log( cut2.toString() );
        //         }
        //     }
        //     else
        //     {
        //         console.log( "*********** ERROR ********** - different length" );
        //     }

        //     if ( alt.svgPath() == cut2.svgPath() )
        //     {
        //         console.log("******* GREAT *****" );
        //     }
        //     else{
        //         console.log("*********** ERROR **********" );
        //         console.log( alt.svgPath() );
        //         console.log( cut2.svgPath() );
        //     }            
        // }

        
    }


    //https://pomax.github.io/bezierinfo/chapters/decasteljau/decasteljau.js
    getStrutPoints(t) {
        return this.applyDecasteljau(t).strutPoints;
    }


    getPointForT(t) {
        return this.applyDecasteljau(t).point;
    }

    
    //private
    applyDecasteljau(t) {
        //only valid where nodeData.length === 2
        if ( this.nodeData.length !== 2 )
            throw( "applyDecasteljau only valid for a segment" );

        let points = [ this.nodeData[0].point, this.nodeData[0].outControlPoint, this.nodeData[1].inControlPoint, this.nodeData[1].point ];
        const strutPoints = [];

        for( const p of points )
            strutPoints.push( p );

        while( points.length > 1 )
        {
            const newPoints = [];
            for( let i=0; i<points.length-1; i++ )
            {

                const newPoint = new GeoPoint( (1-t) * points[i].x + t * points[i+1].x,
                                             (1-t) * points[i].y + t * points[i+1].y );
                newPoints.push( newPoint );
                strutPoints.push( newPoint );
            }
            points = newPoints;
        }

        return { strutPoints:strutPoints, point:points[0] };
    }    


    //Returns { beforePoint: a GeoSpline, afterPoint: a GeoSpline } //though either may be null
    //https://pomax.github.io/bezierinfo/#splitting
    cutAtPoint( p ) { 
        const nodeData = this.nodeData;

        //The simplest spline with its two control points. 
        if ( nodeData.length === 2 )
        {
            if ( ! nodeData[1].point )
                console.log("no point?");

            if ( nodeData[0].point.equals(p) ) 
                return { beforePoint: null,
                         afterPoint : this };
            else if ( nodeData[1].point.equals(p) ) 
                return { beforePoint: this,
                         afterPoint : null };
            else {
                const t = this.findTForPoint(p);
                if ( t === undefined )
                    return undefined;

                return this.cutAtT( t );
            }
        }

        const nodesBeforeCut = [],
              nodesAfterCut = [];

        let cutMade = false;
        for( let i=0; i<nodeData.length; i++ )
        {
            const n1 = nodeData[i];
            const n2 = i+1 < nodeData.length ? nodeData[i+1] : null;

            if ( cutMade ) 
            {
                nodesAfterCut.push( n1 );
            }
            else if ( n1.point.equals(p) )  
            {
                cutMade = true;
                nodesBeforeCut.push( n1 );
                nodesAfterCut.push( n1 );
            }
            else if ( n2?.point.equals(p) )
            {
                cutMade = true;
                nodesBeforeCut.push( n1 );
                nodesBeforeCut.push( n2 );
            }
            else if ( n2 != null )
            {
                const segment = this.pathSegment( i+1 ); //so from i to i+1

                const bounds = new Bounds();
                segment.adjustBounds( bounds );

                const tWithinSegment = bounds.containsPoint(p,0.0002) ? segment.findTForPoint(p) : undefined;

                if ( tWithinSegment === 0 ) //effectively ( n1.point.equals(p) ), it must have been a rounding issue that prevented an exact match.
                {
                    cutMade = true;
                    nodesBeforeCut.push( n1 );
                    nodesAfterCut.push( n1 );    
                }
                else if ( tWithinSegment === 1) //effectively ( n2.point.equals(p) ), it must have been a rounding issue that prevented an exact match.
                {
                    cutMade = true;
                    nodesBeforeCut.push( n1 );
                    nodesBeforeCut.push( n2 );
                }
                else 
                {
                    const pointLiesInThisSegment = tWithinSegment !== undefined;

                    if ( ! pointLiesInThisSegment )
                    {
                        if ( ! cutMade )
                            nodesBeforeCut.push(n1);

                        if ( cutMade )
                            nodesAfterCut.push(n1);
                    }
                    else //point lies in this segment
                    {
                        const splits = segment.cutAtT( tWithinSegment );

                        splits.beforePoint.nodeData[0].inControlPoint = n1.inControlPoint;
                        splits.beforePoint.nodeData[0].inAngle = n1.inAngle;
                        splits.beforePoint.nodeData[0].inLength = n1.inLength;
                        nodesBeforeCut.push( splits.beforePoint.nodeData[0] );
                        nodesBeforeCut.push( splits.beforePoint.nodeData[1] );

                        splits.afterPoint.nodeData[1].outControlPoint = n2.outControlPoint;
                        splits.afterPoint.nodeData[1].outAngle = n2.outAngle;
                        splits.afterPoint.nodeData[1].outLength = n2.outLength;
                        nodesAfterCut.push( splits.afterPoint.nodeData[0] );
                        nodesAfterCut.push( splits.afterPoint.nodeData[1] );
                        i++; //because we've done n2 effectively
                        cutMade = true;
                    }
                }
            }
            else if ( n2 == null )
            {
                if ( cutMade )
                    nodesAfterCut.push( n1 )
                else
                    nodesBeforeCut.push( n1 );
            }
        }

        return { beforePoint: nodesBeforeCut.length < 2 ? null : new GeoSpline(nodesBeforeCut),
                 afterPoint : nodesAfterCut.length < 2 ? null : new GeoSpline(nodesAfterCut) };
    }


    cutAtT( t )
    {    
        if ( t === 0 ) 
            return { beforePoint: null,
                     afterPoint : this };
        else if ( t === 1 ) 
            return { beforePoint: this,
                     afterPoint : null };

        const struts = this.getStrutPoints( t );

        const c1n1 = this.createNodeData( undefined, struts[0], struts[4] );
        const c1n2 = this.createNodeData( struts[7], struts[9], undefined );
        const c2n1 = this.createNodeData( undefined, struts[9], struts[8] );
        const c2n2 = this.createNodeData( struts[6], struts[3], undefined );
                    
        return { beforePoint: new GeoSpline( [c1n1,c1n2] ),
                 afterPoint : new GeoSpline( [c2n1,c2n2] ) };            
    }    


    createNodeData( inControlPoint, point, outControlPoint ) 
    {
        const c = { inControlPoint:  inControlPoint,
                    point:           point,
                    outControlPoint: outControlPoint };

        if ( inControlPoint )
        {
            const inControlPointLine = new GeoLine( point, inControlPoint );
            c.inAngle = inControlPointLine.angleDeg();
            c.inLength = inControlPointLine.getLength();
        }
        if ( outControlPoint )
        {
            const outControlPointLine = new GeoLine( point, outControlPoint );    
            c.outAngle = outControlPointLine.angleDeg();
            c.outLength = outControlPointLine.getLength();
        }

        return c;
    }    


    //if offset {mx, my} are specified then add these
    adjustBounds( bounds, offset ) {

        //It won't be a perfectly tight bounding box, but 
        //it should be ample to encompass the spline loosely. 
        
        for ( const node of this.nodeData )
        {
            bounds.adjust( node.point, offset );

            if ( node.inControlPoint )
                bounds.adjust( node.inControlPoint, offset );

            if ( node.outControlPoint )
                bounds.adjust( node.outControlPoint, offset );
        }
    }


    //The direction we are travelling at the end of this spline
    exitAngleDeg()
    {
        return this.angleLeavingNode( this.nodeData.length-1 );
    }


    entryAngleDeg()
    {
        return this.angleEnteringNode( 0 );
    }


    angleEnteringNode( i )
    {
        const n = this.nodeData[ i ];
        let inControlPoint = n.inControlPoint;
        let outControlPoint = n.outControlPoint;
        let directionLine;

        if ( inControlPoint && inControlPoint.equals( n.point ) )
            inControlPoint = undefined;

        if ( outControlPoint && outControlPoint.equals( n.point ) )
            outControlPoint = undefined;

        if (( ! inControlPoint ) && ( i > 0 ))
            inControlPoint = this.nodeData[ i-1 ].outControlPoint; 
        else if (( ! outControlPoint )&&( i < this.nodeData.length-1 ))
            outControlPoint = this.nodeData[ i+1 ].inControlPoint;  

        if ( inControlPoint)
            directionLine = new GeoLine( inControlPoint, n.point );
        else if ( outControlPoint )
            directionLine = new GeoLine( n.point, outControlPoint );

        return directionLine.angleDeg();
    }


    angleLeavingNode( i )
    {
        const n = this.nodeData[ i ];
        let inControlPoint = n.inControlPoint;
        let outControlPoint = n.outControlPoint;
        let directionLine;

        //What if length2 == 0, the node's inControlPoint == point
        if (( i == 0 ) && ( outControlPoint ))
        {
            if ( outControlPoint.equals( n.point ) )
                outControlPoint = undefined;
            else    
                directionLine = new GeoLine( n.point, n.outControlPoint );
        }
        else if (( i == this.nodeData.length-1 ) && ( inControlPoint ))
        {
            if ( inControlPoint.equals( n.point ) )
                inControlPoint = undefined;
            else
                directionLine = new GeoLine( n.inControlPoint, n.point );
        }

        if ( ! directionLine ) 
        {
            if (( ! outControlPoint )&&( i < this.nodeData.length-1 ))
                outControlPoint = this.nodeData[ i+1 ].inControlPoint;  
            else if (( ! inControlPoint ) && ( i > 0 ))
                inControlPoint = this.nodeData[ i-1 ].outControlPoint; 

            if ( outControlPoint )
                directionLine = new GeoLine( n.point, outControlPoint );
            else if ( inControlPoint )
                directionLine = new GeoLine( inControlPoint, n.point );
        }

        return directionLine.angleDeg();
    }


    toString()
    {
        let s = "GeoSpline[ ";
        for ( const node of this.nodeData )
        {
            if ( node.inControlPoint )
                s += " in:" + node.inControlPoint.toString();

            if ( node.inAngle )
                s += " inAng:" + node.inAngle;

            if ( node.inLength )
                s += " inLen:" + node.inLength;

            s += " p:" + node.point.toString();

            if ( node.outControlPoint )
                s += " out:" + node.outControlPoint.toString();

            if ( node.outAngle )
                s += " outAng:" + node.outAngle;

            if ( node.outLength )
                s += " outLen:" + node.outLength;
        }
        s += "]";
        return s;
    }


    parallelCurve( sa, depth )
    {
        const debug = false;

        if ( sa === 0 )
        {
            return { baseCurve: this, offsetCurve: this }; 
        }

        let newNodeData = [];
        const len = this.nodeData.length;
        let prevNode;
        let prevNewNode;
        for ( let i=0; i<len; i++ )
        {
            const node = this.nodeData[i];

            const newNode = {};
            newNodeData[i] = newNode;
            
            let tangentAfterDeg = this.angleLeavingNode(i) + 90; //TODO we could allow for pointy nodes by using angleArrivingNode for the inControlPoint
            if ( tangentAfterDeg > 360 )
                tangentAfterDeg -= 360;

            const tangentBeforeDeg = tangentAfterDeg; //TODO determine this separately?

            newNode.point = node.point.pointAtDistanceAndAngleDeg( sa, tangentAfterDeg );
            if ( node.inControlPoint )
                newNode.inControlPoint = node.inControlPoint.pointAtDistanceAndAngleDeg( sa, tangentBeforeDeg );
            if ( node.outControlPoint )
                newNode.outControlPoint = node.outControlPoint.pointAtDistanceAndAngleDeg( sa, tangentAfterDeg );

            if ( prevNode )
            {
                //We can do slightly better still, for each step/simplespline how much bigger is the new curve (distance between start/end nodes), 
                //and scale the length of the control points accordingly. 
                const distance = (new GeoLine( prevNode.point, node.point )).getLength();
                const offsetDistance = (new GeoLine( prevNewNode.point, newNode.point )).getLength();
                if ( ( distance > 0 ) && ( offsetDistance > 0) && ( distance != offsetDistance ) )
                {
                    const extension = offsetDistance / distance; //nb this could be <0 or >0.
                    if ( Math.abs(extension) > 0.001 )
                    {
                        //console.log( (extension>1 ? "Extending" : "Reducing" ) + " the control point lengths to " + (Math.round( extension * 1000)/10) + "%" );
                        const outControlPointLine = new GeoLine( prevNewNode.point, prevNewNode.outControlPoint );
                        prevNewNode.outAngle = outControlPointLine.angleDeg();
                        prevNewNode.outLength = outControlPointLine.getLength() * extension;
                        prevNewNode.outControlPoint = prevNewNode.point.pointAtDistanceAndAngleDeg( prevNewNode.outLength, prevNewNode.outAngle );
                        const inControlPointLine = new GeoLine( newNode.point, newNode.inControlPoint );
                        newNode.inAngle = inControlPointLine.angleDeg();
                        newNode.inLength = inControlPointLine.getLength() * extension;                        
                        newNode.inControlPoint = newNode.point.pointAtDistanceAndAngleDeg( newNode.inLength, newNode.inAngle );
                    }
                }
            }

            prevNode = node;
            prevNewNode = newNode;
        }
        const offsetCurve = new GeoSpline( newNodeData );

        newNodeData = [];
        let c1, c2, c3;
        for ( let i=1; i<len; i++ )
        {
            const prevNode = this.nodeData[i-1];
            const node = this.nodeData[i];
            const thisSegmentAsGeoSpline = new GeoSpline( [ prevNode, node ] );
            const offsetSegmentAsGeoSpline = new GeoSpline( [ offsetCurve.nodeData[i-1], offsetCurve.nodeData[i]] );
            const errorAtHalfway = Math.abs( thisSegmentAsGeoSpline.getOffsetBetweenCurves( offsetSegmentAsGeoSpline, 0.5, sa ) - Math.abs(sa) );
            //console.log( "Worst:" + worstError + " Halfway:" + errorAtHalfway );

            //depending upon worstError decide if we're splitting this segment, if we're we can just copy it to the one we're creating
            //if we split any, then recurse. 
            if ( debug )
                console.log( "Node " + i + " offset variance at t=0.5 " + Math.round( errorAtHalfway/sa*1000 )/10 + "%" );

            if ( ( isNaN( errorAtHalfway ) ) || ( (errorAtHalfway/sa) > 0.005 ) ) //0.01 would be plenty accurate enough for our purposes. 
            {
                const struts = thisSegmentAsGeoSpline.getStrutPoints( 0.5 );

                if ( c3 )
                {
                    c1 = null;
                    c3.outControlPoint = struts[4];
                    //nb c3.point should equal struts[0]
                }
                else
                    c1 = this.createNodeData( undefined, struts[0], struts[4] );

                c2 = this.createNodeData( struts[7], struts[9], struts[8] );
                c3 = this.createNodeData( struts[6], struts[3], undefined );
                            
                if ( c1 )
                    newNodeData.push( c1 );

                c3.outControlPoint = node.outControlPoint;

                newNodeData.push( c2 );
                newNodeData.push( c3 );
            }
            else
            {
                if ( i == 1 )
                    newNodeData.push( this.cloneNode( prevNode ) );

                c3 = this.cloneNode( node ); //we must not change a node that exists on the base curve
                newNodeData.push( c3 );
            }
        }

        if ( newNodeData.length > this.nodeData.length )
        {
            if ( debug )
            for ( const i in newNodeData )
            {
                const node = newNodeData[i];

                if (( ! node.inControlPoint ) && ( i>0 ))
                    console.log("Error, node should have inControlPoint");

                if (( ! node.outControlPoint ) && ( i<(newNodeData.length-1) ))
                    console.log("Error, node should have outControlPoint");

            }
    
            const thisWithMoreControlPoints = new GeoSpline( newNodeData );

            if ( debug )
                console.log("Recursing, now has " + thisWithMoreControlPoints.nodeData.length + " nodes...");

            depth = depth === undefined ? 1 : depth + 1;
            if (( depth < 8 ) && ( thisWithMoreControlPoints.nodeData.length < 10000))
                return thisWithMoreControlPoints.parallelCurve( sa, depth );
        }

        //Also see:
        //https://raphlinus.github.io/curves/2022/09/09/parallel-beziers.html
        //http://brunoimbrizi.com/unbox/2015/03/offset-curve/

        return { baseCurve: this, offsetCurve: offsetCurve }; 
    }   


    //For two curves that are supposed to be paralled, 
    //what offset has actually been achieved at t?    
    getOffsetBetweenCurves( otherCurve, t, targetOffset )
    {
        const pointOnThisCurve = this.getPointForT( t );

        //NOTE: we cannot simply do  otherCurve.getPointForT( t ) as the two points won't necessarily be tangential.

        //So, calculate a tangent from this curve to intersect the other. 
        const anotherPointATinyBitFurtherOn = this.getPointForT( t + 0.0001 );
        const angleAtThisPoint = (new GeoLine(pointOnThisCurve,anotherPointATinyBitFurtherOn )).angleDeg();
        let tangentAngle = angleAtThisPoint + 90;
        if ( tangentAngle >= 360 ) 
            tangentAngle -= 360;
        const tangentLineAtThisPoint = new GeoLine(pointOnThisCurve, pointOnThisCurve.pointAtDistanceAndAngleDeg( 10 * targetOffset, tangentAngle ) );

        const otherCurveSI = otherCurve.asShapeInfo();
        const tangentLineSI = tangentLineAtThisPoint.asShapeInfo();        

        const intersections = Intersection.intersect(otherCurveSI, tangentLineSI);
        if ( intersections.points.length === 0 )
            return undefined;

        const pointOnOtherCurve = new GeoPoint( intersections.points[0].x, intersections.points[0].y );

        const line = new GeoLine( pointOnThisCurve, pointOnOtherCurve );
        return line.getLength();
    }


    /**
     * Create an extended spline with the addition of a point or another curve.  Nb. there may be an acute
     * angle resulting. 
     */
    extend( addition )
    {
        const extendedNodeData = this.nodeData.slice();

        if ( addition instanceof GeoPoint )
        {
            const p = extendedNodeData.pop();

            extendedNodeData.push( {inControlPoint:   p.inControlPoint,
                                    point:            p.point,
                                    outControlPoint:  p.outControlPoint ? p.outControlPoint : p.point } );

            extendedNodeData.push( {inControlPoint:   addition,
                                    point:            addition,
                                    outControlPoint:  addition } );
        }
        else if ( addition instanceof GeoSpline ) 
        {
            for( const n of addition.nodeData )
            {
                extendedNodeData.push( {inControlPoint:   n.inControlPoint ? n.inControlPoint : n.point,
                                        point:            n.point,
                                        outControlPoint:  n.outControlPoint ? n.outControlPoint : n.point } );
            } 
        }
        else 
            throw new Error( "Unexpected type of addition. " );
            
        return new GeoSpline( extendedNodeData );
    }


    cloneNode( n )
    {
        return { inControlPoint:  n.inControlPoint,
                 inAngle       :  n.inAngle,
                 inLength      :  n.inLength,
                 point         :  n.point,
                 outControlPoint: n.outControlPoint,
                 outAngle      :  n.outAngle,
                 outLength     :  n.outLength };
    }
}
//# sourceMappingURL=patterneditor.js.map
