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

        if (( this.data.color === "black" ) && ( typeof iskDarkMode !== "undefined" ) && iskDarkMode )
            return "white";

        if (( this.data.color === "white" ) && ( typeof iskDarkMode !== "undefined" )&& ( ! iskDarkMode ) )
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

        if ( options && options.targetPiece )
        {
            if ( options.downloadOption ) //see elsewhere where we use the same control.
                return false; //Should targetPiece mean we don't display any drawing objects? 

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
        var d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.patternPiece.getObject(d.center);
        if (typeof this.angle1 === "undefined")
            this.angle1 = this.patternPiece.newFormula(d.angle1);
        if (typeof this.angle2 === "undefined")
            this.angle2 = this.patternPiece.newFormula(d.angle2);
        if (typeof this.radius1 === "undefined")
            this.radius1 = this.patternPiece.newFormula(d.radius1);
        if (typeof this.radius2 === "undefined")
            this.radius2 = this.patternPiece.newFormula(d.radius2);
        if (typeof this.rotationAngle === "undefined")
            this.rotationAngle = this.patternPiece.newFormula(d.rotationAngle);

        this.arc = new GeoEllipticalArc( this.center.p, 
                                         this.radius1.value(),
                                         this.radius2.value(), 
                                         this.angle1.value(), 
                                         this.angle2.value(),
                                         this.rotationAngle.value() );
        /*
        if ( this.rotationAngle.value() != 0 )                                         
        this.debugArc = new GeoEllipticalArc( this.center.p, 
                                            this.radius1.value(),
                                            this.radius2.value(), 
                                            this.angle1.value(), 
                                            this.angle2.value(),
                                            0 );*/
   
        this.p = this.arc.pointAlongPathFraction( 0.5 );

        this.adjustBounds( bounds );
    }

    
    adjustBounds( bounds )
    {
        bounds.adjust( this.p );
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


    draw( g, isOutline ) {
        this.drawArc( g, isOutline );        
        //this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
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
        var d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.patternPiece.getObject(d.center);
        if (typeof this.angle1 === "undefined")
            this.angle1 = this.patternPiece.newFormula(d.angle1);
        if (typeof this.angle2 === "undefined")
            this.angle2 = this.patternPiece.newFormula(d.angle2);
        if (typeof this.radius === "undefined")
            this.radius = this.patternPiece.newFormula(d.radius);

        this.arc = new GeoArc( this.center.p, this.radius.value(), this.angle1.value(), this.angle2.value() );

        this.p = this.arc.pointAlongPathFraction( 0.5 );

        this.adjustBounds( bounds );
    }

    
    adjustBounds( bounds )
    {
        bounds.adjust( this.p ); //not necessarily
        this.arc.adjustBounds( bounds );
    }


    pointAlongPath( length ) {
        return this.arc.pointAlongPath( length );
    }
    

    asShapeInfo() {
        return this.arc.asShapeInfo();
    }


    draw( g, isOutline ) {

        this.drawArc( g, isOutline );
        this.drawLabel(g, isOutline);
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
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

class CutSpline extends DrawingObject { //TODO for consistency should be PointCutSpline ???

    //curve
    //length

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.curve === "undefined")
            this.curve = this.patternPiece.getObject(d.spline);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);

        //Note tha this.curve might be something like a SplineSimple, but it might also be an OperationResult
        this.p = this.curve.pointAlongPath( this.length.value() );
        this.adjustBounds( bounds );
    }

    
    adjustBounds( bounds )
    {        
        bounds.adjust(this.p);
    }


    draw( g, isOutline ) {
        //this.drawLine( g );
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
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
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);
            
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);

        this.line = new GeoLine(this.firstPoint.p, this.secondPoint.p);

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g, isOutline ) {
        
        this.drawLine( g, isOutline );
        
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
        var d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.patternPiece.getObject(d.center);

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        //Done by OperationResult
    }


    draw( g, isOutline ) {
        //g is the svg group
        //this.drawLine( g ); //TODO put an arrow head on this!
        //this.drawDot( g );
        //this.drawLabel( g );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + 'Flip ' + this.axis 
                + " around " + this.refOf( this.center ) 
                         //" angle:" + this.data.angle.value() +
                + " applying suffix '" + this.data.suffix + "'";
    }


    applyOperationToPoint( p ) {
        return this.flipPoint( p, this.center.p );
    }


    flipPoint( p, center ) {
        var result = new GeoPoint( p.x, p.y );

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
        var d = this.data;

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.patternPiece.getObject(d.p1Line1);

        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.patternPiece.getObject(d.p2Line1);

        this.line = new GeoLine( this.p1Line1.p, this.p2Line1.p );

        this.adjustBounds( bounds );
    }

    adjustBounds( bounds )
    {
        //Done by OperationResult
    }


    draw( g, isOutline ) {
        //g is the svg group
        //this.drawLine( g ); //TODO put an arrow head on this!
        //this.drawDot( g );
        //this.drawLabel( g );

        this.drawLine( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
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

        var p0 = p.rotate( this.line.p1, -this.line.angleDeg() );

        var p0f = new GeoPoint( p0.x, this.line.p1.y - ( p0.y - this.line.p1.y ) );

        var result = p0f.rotate( this.line.p1, this.line.angleDeg() );

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
        var d = this.data;

        //if (typeof this.basePoint === "undefined")
        //    this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);
            
        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);
            
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


    draw( g, isOutline ) {
        //g is the svg group
        //this.drawLine( g ); //TODO put an arrow head on this!
        //this.drawDot( g );
        //this.drawLabel( g );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                    + 'Move ' + this.data.length.htmlLength( asFormula ) 
                    //" from " + this.basePoint.data.name +
                    + " at angle " + this.data.angle.htmlAngle( asFormula ) 
                    + " applying suffix '" + this.data.suffix + "'";
    }


    applyOperationToPoint( p ) {
        //Convert degrees to radians
        var result = p.pointAtDistanceAndAngleDeg( this.length.value(), this.angle.value() );
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
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.fromOperation === "undefined")
            this.fromOperation = this.patternPiece.getObject(d.fromOperation);

        //if this.basePoint is a point... (if a curve, this is the midpoint)
        if ( this.basePoint.p )
            this.p = this.fromOperation.applyOperationToPoint( this.basePoint.p );

        var operation = this.fromOperation;
        var applyOperationToPointFunc = function( p ) {
            return operation.applyOperationToPoint( p );
        };

        if ( this.basePoint.curve instanceof GeoSpline )
        {
            //so we get this captured and can just pass the function around
            this.curve = this.basePoint.curve.applyOperation( applyOperationToPointFunc );
        }

        if ( this.basePoint.line instanceof GeoLine ) //untested?
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

    
    pointAlongPath( length ) {

        if ( this.arc )
            return this.arc.pointAlongPath( length );

        if ( this.curve )
            return this.curve.pointAlongPath( length );
            
        throw "pointAlongPath not implemented for this operation result. ";
    }


    getColor() {
        return this.basePoint.getColor();
    }

    
    getLineStyle() {
        return this.basePoint.getLineStyle();
    }


    draw( g, isOutline ) {
        //g is the svg group

        //We might have operated on a point, spline (or presumably line)

        if (( this.p ) && ( ! this.curve ) && ( ! this.arc ))
            this.drawDot( g, isOutline );

        if ( this.curve )
            this.drawCurve( g, isOutline ); 

        if ( this.arc )
            this.drawArc( g, isOutline );             

        if ( this.line )
            this.drawLine( g, isOutline ); 
            
        if ( this.p )
            this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
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
        var d = this.data;

        if (typeof this.center === "undefined")
            this.center = this.patternPiece.getObject(d.center);
            
        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);            
            
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        //Done by OperationResult
    }


    draw( g, isOutline ) {
        //g is the svg group
        //this.drawLine( g ); //TODO put an arrow head on this!
        //this.drawDot( g );
        //this.drawLabel( g );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
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
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.patternPiece.getObject(d.basePoint);
        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.p1Line1);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.p2Line1);

        var line = new GeoLine(this.firstPoint.p, this.secondPoint.p);
        
        var baseLine = new GeoLine( this.basePoint.p, this.basePoint.p.pointAtDistanceAndAngleDeg( 1, line.angleDeg() + 90 ) );

        this.p = line.intersect(baseLine);
        this.line = new GeoLine( this.basePoint.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, isOutline ) {
        //g is the svg group
        this.drawLine( g, isOutline );
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
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
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);
        if (typeof this.thirdPoint === "undefined")
            this.thirdPoint = this.patternPiece.getObject(d.thirdPoint);
        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);
            
        var line1 = new GeoLine( this.secondPoint.p, this.firstPoint.p );    
        var line2 = new GeoLine( this.secondPoint.p, this.thirdPoint.p );    

        //TODO test what happens when this crosses the equator! i.e. one point is just below the equator and one just above (and in either direction)
        var bisectingAngle = ( line1.angleDeg() + line2.angleDeg() ) /2;

        //Convert degrees to radians
        this.p = this.secondPoint.p.pointAtDistanceAndAngleDeg( this.length.value(), bisectingAngle );
        this.line = new GeoLine(this.secondPoint.p, this.p);

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g, isOutline ) {
        //g is the svg group
        this.drawLine( g, isOutline );
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
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
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);

        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);

        this.baseLine = new GeoLine(this.firstPoint.p, this.secondPoint.p);
        this.p = this.firstPoint.p.pointAtDistanceAndAngleRad(this.length.value(this.baseLine.length), this.baseLine.angle);
        this.line = new GeoLine(this.firstPoint.p, this.p);
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g, isOutline ) {
        this.drawLine( g, isOutline );
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
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
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);
        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);
        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);
            
        var baseLine = new GeoLine( this.firstPoint.p, this.secondPoint.p );    
        var totalAngle = this.angle.value() + 90 + baseLine.angleDeg();
        //Convert degrees to radians
        this.p = this.firstPoint.p.pointAtDistanceAndAngleDeg( this.length.value(), totalAngle );
        this.line = new GeoLine(this.firstPoint.p, this.p);
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g , isOutline ) {
        //g is the svg group
        this.drawLine( g, isOutline );
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        var h = '<span class="ps-name">' + this.data.name + '</span>: ' 
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
        var d = this.data;

        if (typeof this.arc === "undefined")
            this.arc = this.patternPiece.getObject(d.arc);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);

        this.p = this.arc.pointAlongPath( this.length.value() );
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }

    
    draw( g, isOutline ) {
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
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
        var d = this.data;

        if (typeof this.splinePath === "undefined")
            this.splinePath = this.patternPiece.getObject(d.splinePath);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);

        this.p = this.splinePath.pointAlongPath( this.length.value() );
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, isOutline ) {
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + this.data.length.htmlLength( asFormula ) 
                + " along path " + this.refOf( this.splinePath );
    }


    setDependencies( dependencies ) {
        dependencies.add( this, this.splinePath );
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
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);
            
        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);

        this.p = this.basePoint.p.pointAtDistanceAndAngleDeg( this.length.value(), this.angle.value() );
        this.line = new GeoLine(this.basePoint.p, this.p);
        
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjustForLine(this.line);
    }


    draw( g, isOutline ) {
        this.drawLine( g, isOutline );
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
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
        var d = this.data;

        if (typeof this.tangent === "undefined")
            this.tangent = this.patternPiece.getObject(d.tangent);

        if (typeof this.arc === "undefined")
            this.arc = this.patternPiece.getObject(d.arc); 

        this.crossPoint = d.crossPoint;

        var tangentIntersections = this.arc.arc.getPointsOfTangent( this.tangent.p );
        
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


    draw(g, isOutline ) {
        this.drawLine(g, isOutline);
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
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
        var d = this.data;

        if (typeof this.tangent === "undefined")
            this.tangent = this.patternPiece.getObject(d.tangent);

        if (typeof this.arc === "undefined")
            this.center = this.patternPiece.getObject(d.center); 

        if (typeof this.radius === "undefined")
            this.radius = this.patternPiece.newFormula(d.radius);

        this.crossPoint = d.crossPoint;

        var circle = new GeoArc( this.center.p, this.radius.value(), 0, 360 );

        var tangentIntersections = circle.getPointsOfTangent( this.tangent.p );
        
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


    draw(g, isOutline) {
        this.drawLine(g, isOutline);
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
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
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);

        this.p = new GeoPoint( this.firstPoint.p.x, this.secondPoint.p.y );
        //this.line = new GeoLine(this.firstPoint.p, this.secondPoint.p);

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, isOutline ) {
        //TODO check that there is no option to draw a line as part of this tool. 
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>:' +
               ' point at X from ' + this.refOf( this.firstPoint ) +  " and Y from " + this.refOf( this.secondPoint );
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
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.arc === "undefined")
            this.arc = this.patternPiece.getObject(d.curve); //An anomaly, would be better if this were arc.

        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);

        var angleDeg = this.angle.value();
        if ( angleDeg >= 360 )
            angleDeg -= 360;
        else if ( angleDeg < 0 )
            angleDeg += 360;

        var curveOrArc = ( this.arc.arc ) ? this.arc.arc : this.arc.curve ;

        //Rather than use an arbitrarily long line (which was causing issues)
        //calculate the max length of line. The line cannot be longer than
        //the bounding box encompassing the basePoint and the curve. 
        var tempBounds = new Bounds();
        tempBounds.adjust( this.basePoint.p );
        this.arc.adjustBounds( tempBounds );
        var maxLineLength = tempBounds.diagonaglLength() * 1.25;
        
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( maxLineLength, angleDeg );

        var longLine = new GeoLine( this.basePoint.p, otherPoint );

        this.p = longLine.intersectArc( curveOrArc );

        this.line = new GeoLine( this.basePoint.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, isOutline) {
        //g is the svg group
        this.drawLine(g, isOutline);
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
    }


    html( asFormula ) {
        //TODO use a better name for this.curve, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: '
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
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);
            
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);

        if (typeof this.center === "undefined")
            this.center = this.patternPiece.getObject(d.center);

        if (typeof this.radius === "undefined")
            this.radius = this.patternPiece.newFormula(d.radius);

        var line = new GeoLine( this.firstPoint.p, this.secondPoint.p );
        var arc  = new GeoArc( this.center.p, this.radius.value(), 0, 360 );

        this.p = line.intersectArc( arc );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, isOutline ) {

        //TODO draw the line between basePoint and p
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
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
        var d = this.data;

        if (typeof this.firstArc === "undefined")
            this.firstArc = this.patternPiece.getObject(d.firstArc);
            
        if (typeof this.secondArc === "undefined")
            this.secondArc = this.patternPiece.getObject(d.secondArc);

        var arc1SI = this.firstArc.asShapeInfo();
        var arc2SI = this.secondArc.asShapeInfo();

        var intersections = Intersection.intersect(arc1SI, arc2SI);
        
        //intersections.points.forEach(console.log);    

        if ( intersections.points.length === 0 )
        {
            throw "No intersections found. ";
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
            var p1 = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
            var p2 = new GeoPoint( intersections.points[1].x, intersections.points[1].y );
            var angle1 = (new GeoLine( this.firstArc.center.p, p1)).angle;
            var angle2 = (new GeoLine( this.firstArc.center.p, p2)).angle;

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


    draw(g, isOutline) {
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
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
        var d = this.data;

        if (typeof this.center1 === "undefined")
            this.center1 = this.patternPiece.getObject(d.center1);
            
        if (typeof this.center2 === "undefined")
            this.center2 = this.patternPiece.getObject(d.center2);

        if (typeof this.radius1 === "undefined")
            this.radius1 = this.patternPiece.newFormula(d.radius1);

        if (typeof this.radius2 === "undefined")
            this.radius2 = this.patternPiece.newFormula(d.radius2);

        //Also this.data.crossPoint    
        var circle1 = new GeoArc( this.center1.p, this.radius1.value(), 0, 360 );
        var circle2 = new GeoArc( this.center2.p, this.radius2.value(), 0, 360 );

        var arc1SI = circle1.asShapeInfo();
        var arc2SI = circle2.asShapeInfo();

        var intersections = Intersection.intersect(arc1SI, arc2SI);
        
        //intersections.points.forEach(console.log);    
        
        if ( intersections.points.length === 0 )
        {
            throw "No intersections found. ";
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
            var p1 = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
            var p2 = new GeoPoint( intersections.points[1].x, intersections.points[1].y );
            var angle1 = (new GeoLine( circle1.center, p1)).angleDeg();
            var angle2 = (new GeoLine( circle1.center, p2)).angleDeg();
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
            
           /*
            //this is just a guess.. TODO what happens if the two y's are the same??
            var p1 = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
            var p2 = new GeoPoint( intersections.points[1].x, intersections.points[1].y );
            if ( this.data.crossPoint === "One" )
            {
                if ( p1.y < p2.y )
                    this.p = p2;
                else
                    this.p = p1;
            }
            else
            {
                if ( p1.y < p2.y )
                    this.p = p1;
                else
                    this.p = p2;
            }
            */
        }

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, isOutline) {
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
    }


    html( asFormula ) {
        //TODO use a better name for this.arc, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: '
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
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.curve === "undefined")
            this.curve = this.patternPiece.getObject(d.curve);

        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);

        var angleDeg = this.angle.value();
        if ( angleDeg >= 360 )
            angleDeg -= 360;
        else if ( angleDeg < 0 )
            angleDeg += 360;


        //Rather than use an arbitrarily long line (which was causing issues)
        //calculate the max length of line. The line cannot be longer than
        //the bounding box encompassing the basePoint and the curve. 
        var tempBounds = new Bounds();
        tempBounds.adjust( this.basePoint.p );
        this.curve.adjustBounds( tempBounds );
        var maxLineLength = tempBounds.diagonaglLength() * 1.25;
        
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( maxLineLength, angleDeg );

        var line = new GeoLine( this.basePoint.p, otherPoint );

        var lineSI = line.asShapeInfo();
        var curveSI = this.curve.asShapeInfo();

        var intersections = Intersection.intersect(lineSI, curveSI);        

        if ( intersections.points.length === 0 )
        {
            throw "No intersections found. ";
        }
        else
        {
            //intersections.points.forEach(console.log);    
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        this.line = new GeoLine( this.basePoint.p, this.p );

        this.adjustBounds( bounds );
    }
    
        
    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }

    
    draw(g, isOutline) {
        //g is the svg group
        this.drawLine(g, isOutline); 
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
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
        var d = this.data;

        if (typeof this.curve1 === "undefined")
            this.curve1 = this.patternPiece.getObject(d.curve1);
            
        if (typeof this.curve2 === "undefined")
            this.curve2 = this.patternPiece.getObject(d.curve2);

        var curve1SI = this.curve1.asShapeInfo();
        var curve2SI = this.curve2.asShapeInfo();

        var intersections = Intersection.intersect(curve1SI, curve2SI);
        
        //intersections.points.forEach(console.log);    
        if ( intersections.points.length === 0 )
        {
            this.p = new GeoPoint(0,0);
            this.error = "No intersections found.";
            console.log( "No intersections found. PointIntersectCurves: " + d.name );
        }        
        else if ( intersections.points.length === 1 )
        {
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        else if ( intersections.points.length > 1 )    
        {
            //Vertical correction has first dibs. verticalCrossPoint=="One" means highest point; horizontalCrossPoint=="One" means leftmost point
            var minXPnt, maxXPnt, minYPnt, maxYPnt;
            for ( var i = 0; i<intersections.points.length; i++ )
            {
                var intersect = intersections.points[i];
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
                    this.p = minYPnt;
                else
                    this.p = maxYPnt;
            }
            else
            {
                if ( this.data.horizontalCrossPoint === "One" )
                    this.p = minXPnt;
                else
                    this.p = maxXPnt;
            }
        }

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, isOutline) {
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
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
        var d = this.data;

        if (typeof this.basePoint === "undefined")
            this.basePoint = this.patternPiece.getObject(d.basePoint);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.patternPiece.getObject(d.p1Line1);

        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.patternPiece.getObject(d.p2Line1);

        if (typeof this.angle === "undefined")
            this.angle = this.patternPiece.newFormula(d.angle);

        var line1 = new GeoLine(this.p1Line1.p, this.p2Line1.p);

        var otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( 1, this.angle.value() );

        var line2 = new GeoLine(this.basePoint.p, otherPoint );

        this.p = line1.intersect(line2);
        this.line = new GeoLine( this.basePoint.p, this.p );
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, isOutline) {
        this.drawLine( g, isOutline );
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
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

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw(g, isOutline) {
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
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
        var d = this.data;

        if (typeof this.firstPoint === "undefined")
            this.firstPoint = this.patternPiece.getObject(d.firstPoint);
        if (typeof this.secondPoint === "undefined")
            this.secondPoint = this.patternPiece.getObject(d.secondPoint);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.patternPiece.getObject(d.p1Line1);
        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.patternPiece.getObject(d.p2Line1);

            
        var axisLine = new GeoLine( this.p1Line1.p, this.p2Line1.p );    
        var otherLine = new GeoLine( this.firstPoint.p, this.secondPoint.p );

        //Now we work out another point along the axis line that forms the right angle triangle 
        //with the otherLine.
        //
        //The trick here is to observe that all these points, for any axisLine will form an arc
        //centered on the midpoint of otherLine with radiu of half length of otherLine
        var intersectionPoint = axisLine.intersect( otherLine );
        var midpoint = this.firstPoint.p.pointAtDistanceAndAngleRad( otherLine.length/2, otherLine.angle );
        var arc = new GeoArc( midpoint, otherLine.length/2, 0, 360 );    
        var extendedAxis = new GeoLine( intersectionPoint, intersectionPoint.pointAtDistanceAndAngleRad( otherLine.length*2, axisLine.angle ) );
        this.p = extendedAxis.intersectArc( arc );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, isOutline ) {
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
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
        var d = this.data;

        if (typeof this.shoulderPoint === "undefined")
            this.shoulderPoint = this.patternPiece.getObject(d.shoulderPoint);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.patternPiece.getObject(d.p1Line1);

        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.patternPiece.getObject(d.p2Line1);

        if (typeof this.length === "undefined")
            this.length = this.patternPiece.newFormula(d.length);

        //Find the point that is length away from the shoulderPoint along
        //the line p1Line1-p2line1.
            
        var axisLine = new GeoLine( this.p1Line1.p, this.p2Line1.p );    
        var arc = new GeoArc( this.shoulderPoint.p, this.length.value(), 0, 360  );      
        var offset = new GeoLine( this.shoulderPoint.p, this.p1Line1.p );
        var extendedAxisLength = this.length.value() + offset.length;
        var extendedAxis = new GeoLine( this.p1Line1.p, this.p1Line1.p.pointAtDistanceAndAngleRad( extendedAxisLength, axisLine.angle ) );

        try {
            this.p = extendedAxis.intersectArc( arc );
        } catch (e) {
            //Maybe the axisLine is going in the wrong direction, and therefore extending it's length didn't help.
            //Try reversing axisLine...
            var axisLine = new GeoLine( this.p2Line1.p, this.p1Line1.p );    
            var arc = new GeoArc( this.shoulderPoint.p, this.length.value(), 0, 360  );      
            var offset = new GeoLine( this.shoulderPoint.p, this.p2Line1.p );
            var extendedAxisLength = this.length.value() + offset.length;
            var extendedAxis = new GeoLine( this.p2Line1.p, this.p2Line1.p.pointAtDistanceAndAngleRad( extendedAxisLength, axisLine.angle ) );
            this.p = extendedAxis.intersectArc( arc );    
        }

        this.line = new GeoLine( this.shoulderPoint.p, this.p );

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, isOutline ) {
        this.drawLine( g, isOutline );
        this.drawDot( g, isOutline );
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
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
        var d = this.data;
        this.p = new GeoPoint(d.x, d.y);
        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.p);
    }


    draw( g, isOutline ) {
        this.drawDot(g, isOutline);
        this.drawLabel(g, isOutline);
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>:' 
            + " point at x:" + this.data.x + ", y:" + this.data.y + " from origin"; //TODO add units
    }


    setDependencies( dependencies ) {
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

class SplinePathInteractive extends DrawingObject {

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        var d = this.data;

        if ( typeof this.nodes === "undefined" )
        {
            this.nodes = [];
            for( var i=0; i< d.pathNode.length; i++ )
            {
                var pathNode = this.data.pathNode[i];

                pathNode.point   = this.patternPiece.getObject( pathNode.point );
                pathNode.angle1  = this.patternPiece.newFormula( pathNode.angle1 ); 
                pathNode.length1 = this.patternPiece.newFormula( pathNode.length1 ); 
                pathNode.angle2  = this.patternPiece.newFormula( pathNode.angle2 ); 
                pathNode.length2 = this.patternPiece.newFormula( pathNode.length2 );

                this.nodes.push( { inAngle:   pathNode.angle1.value(),
                                    inLength:  pathNode.length1.value(),
                                    point:     pathNode.point.p,
                                    outAngle:  pathNode.angle2.value(),
                                    outLength: pathNode.length2.value() } );
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


    draw( g, isOutline ) {

        this.drawCurve(g, isOutline);

        //Where should we draw the label? half way along the curve? 
        this.drawLabel(g, isOutline);
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        var html = '<span class="ps-name">' + this.data.name + '</span>: '
                    +'curved path:';

        var d = this.data;

        html += "<table><tbody>";
        for( var i=0; i< d.pathNode.length; i++ )
        {
            html += "<tr><td>";
            html += this.refOf( d.pathNode[i].point );
            html += "</td>";

            if ( i == 0 )
                html += "<td></td><td></td>";
            else
                html +=    "<td>" + d.pathNode[i].angle1.htmlAngle( asFormula ) 
                        + "</td><td>" + d.pathNode[i].length1.htmlLength( asFormula ) + "</td>";

            if ( i == (d.pathNode.length -1) )
                html += "<td></td><td></td>";
            else
                html +=    " <td>" + d.pathNode[i].angle2.htmlAngle( asFormula ) 
                        + "</td><td>" + d.pathNode[i].length2.htmlLength( asFormula ) + "</td>";

            html += "</tr>";         
        }
        html += "</tbody></table>";
        return html;
    }

    
    setDependencies( dependencies )
    {
        for( var i=0; i< this.data.pathNode.length; i++ )
        {
            var pathNode = this.data.pathNode[i];
            dependencies.add( this, pathNode.point );
            dependencies.add( this, pathNode.angle1 );
            dependencies.add( this, pathNode.angle2 );
            dependencies.add( this, pathNode.length1 );
            dependencies.add( this, pathNode.length2 );
        }        
    }    
}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

class SplinePathUsingPoints extends DrawingObject {

    constructor(data) {
        super(data);

        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        var d = this.data;

        if ( typeof this.nodes === "undefined" )
        {
            this.nodes = [];

            for( var i=0; i< d.pathNode.length; i++ )
            {
                this.data.pathNode[i].point = this.patternPiece.getObject( this.data.pathNode[i].point );
            }

            for( var i=0; i< d.pathNode.length; i+=3 )
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


    draw( g, isOutline ) {
        if ( this.lineVisible() )
            this.drawPath( g, this.curve.svgPath(), isOutline );

        //Where should we draw the label? half way along the curve? 
        this.drawLabel( g, isOutline );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        var html = '<span class="ps-name">' + this.data.name + '</span>: '
                + 'curved path: ';

        var d = this.data;

        html += "<table><tbody>";

        for( var i=0; i< d.pathNode.length; i+=3 )
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
        for( var i=0; i< this.data.pathNode.length; i++ )
        {
            dependencies.add( this, this.data.pathNode[i].point );
        }        
    }    
}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

class SplineSimple extends DrawingObject {

    //startPoint - the spline start
    //endPoint - the spline end
    //angle1
    //angle2 
    //length1
    //length2

    constructor(data) {
        super(data);

        //TODO output a useful spline ID
        if ( typeof this.data.name === "undefined" )
            this.data.name = this.data.derivedName;        
    }


    calculate(bounds) {
        var d = this.data;

        if (typeof this.startPoint === "undefined")
            this.startPoint = this.patternPiece.getObject(d.point1);

        if (typeof this.endPoint === "undefined")
            this.endPoint = this.patternPiece.getObject(d.point4);

        if (typeof this.angle1 === "undefined")
            this.angle1 = this.patternPiece.newFormula(d.angle1);

        if (typeof this.angle2 === "undefined")
            this.angle2 = this.patternPiece.newFormula(d.angle2);

        if (typeof this.length1 === "undefined")
            this.length1 = this.patternPiece.newFormula(d.length1);

        if (typeof this.length2 === "undefined")
            this.length2 = this.patternPiece.newFormula(d.length2);

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


    draw( g, isOutline ) {
        
        if ( this.lineVisible() )
            this.drawPath( g, this.curve.svgPath(), isOutline );

        this.drawLabel( g, isOutline );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
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
        var d = this.data;

        if (typeof this.startPoint === "undefined")
            this.startPoint = this.patternPiece.getObject(d.point1);

        if (typeof this.startControlPoint === "undefined")
            this.startControlPoint = this.patternPiece.getObject(d.point2);

        if (typeof this.endControlPoint === "undefined")
            this.endControlPoint = this.patternPiece.getObject(d.point3);

        if (typeof this.endPoint === "undefined")
            this.endPoint = this.patternPiece.getObject(d.point4);

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


    draw( g, isOutline ) {

        if ( this.lineVisible() )
            this.drawPath( g, this.curve.svgPath(), isOutline );

        //Where should we draw the label? half way along the curve?
        //this.drawDot(g, isOutline);
        this.drawLabel( g, isOutline );
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
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
        var d = this.data;

        if (typeof this.point1 === "undefined")
            this.point1 = this.patternPiece.getObject(d.point1);
        if (typeof this.point2 === "undefined")
            this.point2 = this.patternPiece.getObject(d.point2);
        if (typeof this.point3 === "undefined")
            this.point3 = this.patternPiece.getObject(d.point3);

        if (typeof this.p1Line1 === "undefined")
            this.p1Line1 = this.patternPiece.getObject(d.p1Line1);
        if (typeof this.p2Line1 === "undefined")
            this.p2Line1 = this.patternPiece.getObject(d.p2Line1);

        //var lineD2A1 = new GeoLine( this.point2.p, this.p1Line1.p );
        //var lineD2A2 = new GeoLine( this.point2.p, this.p2Line1.p );

        var lineD2D1 = new GeoLine( this.point2.p, this.point1.p ); 
        var lineD2D3 = new GeoLine( this.point2.p, this.point3.p );    

        var angleD2D1 = lineD2D1.angleDeg();
        var angleD2D3 = lineD2D3.angleDeg();

        var totalDartAngle = angleD2D1 - angleD2D3;

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

        var halfDartAngle = totalDartAngle /2;

        var pointA1rotated = this.p1Line1.p.rotate( this.point2.p, -halfDartAngle );
        var pointD1rotated = this.point1.p.rotate( this.point2.p, -halfDartAngle );
        var pointA2rotated = this.p2Line1.p.rotate( this.point2.p, halfDartAngle );
        var pointD2rotated = this.point3.p.rotate( this.point2.p, halfDartAngle );

        var lineA1RA2R = new GeoLine( pointA1rotated, pointA2rotated );
        this.line = lineA1RA2R; //TEMP
        var pointClosure = lineA1RA2R.intersect( new GeoLine( this.point2.p, pointD1rotated ) ); //could equally use pointD2rotated
        this.p = pointClosure; //TEMP

        this.td1 = pointClosure.rotate( this.point2.p, halfDartAngle );
        this.td3 = pointClosure.rotate( this.point2.p, -halfDartAngle );

        //Only works where D2 is perpendicular to the midpoint of D1D3
        //var angleA1D2D1 = lineD2A1.angleRad() - lineD2D1.angleRad();
        //var lengthD2TD1 = Math.cos( angleA1D2D1 ) * lineD2A1.length;
        //this.td1 = this.point2.p.pointAtDistanceAndAngleRad( lengthD2TD1, lineD2D1.angleRad() );    
        //var angleA1D2D3 = lineD2D3.angleRad() - lineD2A2.angleRad();
        //var lengthD2TD3 = Math.cos( angleA1D2D3 ) * lineD2A2.length;
        //this.td3 = this.point2.p.pointAtDistanceAndAngleRad( lengthD2TD3, lineD2D3.angleRad() );

        //Nb. this.data.trueDartResult1 and trueDartResult2 give the names of the dart points generated.

        this.adjustBounds( bounds );
    }


    adjustBounds( bounds )
    {
        bounds.adjust(this.td1);
        bounds.adjust(this.td3);
    }


    draw( g, isOutline ) {
        this.drawLine( g, isOutline ); //TEMP - though actually handy
        this.drawDot( g, isOutline); //TEMP
        this.drawLabel( g, isOutline ); //TEMP
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: ' 
                + " True darts baseline " + this.refOf( this.p1Line1 )
                + "-" + this.refOf( this.p2Line1 )
                + " original dart " + this.refOf( this.point1 )
                + "-" + this.refOf( this.point2 )
                + "-" + this.refOf( this.point3 );
    }


    setDependencies( dependencies )
    {
        //TODO these could get captured automaticallly if, in calculate, we did getObjectAndSetDependency( blah, this )
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
        var d = this.data;

        if (typeof this.fromOperation === "undefined")
            this.fromOperation = this.patternPiece.getObject(d.fromOperation);

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


    draw( g, isOutline ) {

        if ( this.p )
            this.drawDot( g, isOutline );

        //if ( this.line )
        //    this.drawLine( g, isOutline ); 
            
        if ( this.p )
            this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'Dart point from ' + this.refOf( this.fromOperation );
    }


    setDependencies( dependencies ) {
        //dependencies.add( this, this.basePoint );

        //TODO add a dependency on D1/D3 depeending on
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
        this.patternNumberAndName = ( this.patternData.patternNumber ? this.patternData.patternNumber : "" ) + this.patternData.name;
        this.bounds = new Bounds();
        this.visibleBounds = new Bounds();

        if ( typeof this.patternData.measurement !== "undefined" )
        {
            for (var a = 0; a < this.patternData.measurement.length; a++) {
                var m = this.patternData.measurement[a];
                var measurementUnits = this.units;

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
            for (var a = 0; a < this.patternData.variable.length; a++) {
                var v = this.patternData.variable[a];
                this.variable[ v.name ] = v;
                v.isVariable = true;
            }

            //Now the variable are all registered, calculate their values.
            for (var a = 0; a < this.patternData.variable.length; a++) { 
                var inc = this.patternData.variable[a];   
                //TODO test this variable that is a simple value...            
                if (typeof inc.constant !== "undefined") 
                {
                    inc.value = function () {
                        return this.constant;
                    };
                    inc.html = function() {
                        return this.name + ": " + this.constant + ( this.isOverridden ? " (custom)" : "" ) 
                    };
                }
                else
                {
                    inc.expression = new Expression( inc.expression, this, null );
                    inc.value = function () {
                        return this.expression.value();
                    };
                    inc.html = function(asFormula) {
                        return this.name + ": " + this.expression.html( asFormula ) + " = " + Number.parseFloat( this.value() ).toPrecision(4) ;
                    };
                }
            }
        }        

        this.patternPieces = [];
        for( var i=0; i<this.patternData.patternPiece.length; i++ )
        {
            this.patternPieces.push( new PatternDrawing( this.patternData.patternPiece[i], this ) );
        }   

        this.analyseDependencies();
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
            for( var i in this.variable )
            {
                var inc = this.variable[i];
                if ( inc.expression ) 
                    inc.expression.addDependencies( inc, this.dependencies );
                    //this.dependencies.add( inc, inc.expression );
            }
        }    
    
        for( var j=0; j< this.patternPieces.length; j++ )
        {
            var piece = this.patternPieces[j];
            for (var a = 0; a < piece.drawingObjects.length; a++) 
            {
                var dObj = piece.drawingObjects[a];
                dObj.setDependencies( this.dependencies );
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
        var m = this.measurement[name];

        if ( !m )
            throw "Measurment not found:" + name;

        return m;
    }

    getObject( name )
    {
        for( var j=0; j< this.patternPieces.length; j++ )
        {
            var piece = this.patternPieces[j];
            var obj = piece.getObject( name, true /*restrict search to this piece*/ );
            if ( obj )
                return obj;
        }
        return null;
    }


}
//(c) Copyright 2023 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Group {

    constructor (data, patternPiece) {
        this.data = data;
        this.patternPiece = patternPiece;
        this.name = data.name;
        this.visible = data.visible;
        this.update = data.update;
        this.contextMenu = data.contextMenu;
        this.members = [];

        if ( this.data.member )
            this.data.member.forEach( function(m){
                var dObj = this.patternPiece.getObject( m, true );
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

    constructor (data, patternPiece) {
        this.data = data;
        this.patternPiece = patternPiece;
        this.name = data.name;
        this.detailNodes = data.detailNode;
        this.internalPaths = data.internalPath;
        //this.update = data.update;
        //this.contextMenu = data.contextMenu;
        this.nodesByName = {};

        if (( ! this.detailNodes ) || ( this.detailNodes.length === 0))
        {
            console.log("Piece " + this.name + " has no nodes." );
            return;
        }

        this.detailNodes.forEach( 
            function(n) { 
                var dObj =  this.patternPiece.getObject( n.obj, true );//this.drawing[ n.obj ]; 
                if ( dObj ) 
                {
                    this.nodesByName[ n.obj ] = n;
                    n.dObj = dObj;
                    if ( ! n.reverse )
                        n.reverse = false;
                }
                else
                {
                    console.log("Couldn't match piece node to drawing object: ", n.obj );
                }

                //TODO also populate dObj.usedByPieces
                //dObj.setUsedByPiece( this );
            }, this ); 

        var resolve = function( objName, b ) {
            return patternPiece.getObject( objName, b );
        };

        if ( this.internalPaths )
            this.internalPaths.forEach( 
                function(ip) { 

                    if ( ! ip.node )
                        return; 

                    ip.nodes = [];
                    ip.node.forEach(
                        function(n) {
                            var dObj = resolve( n, true );
                            if ( dObj ) 
                                this.nodes.push( dObj );
                            else
                                console.log("Couldn't match internal path node to drawing object: ", n );
                        }, ip );
                }, this );             
                
        this.defaultSeamAllowance = this.patternPiece.newFormula( data.seamAllowanceWidth );
        if ( typeof this.defaultSeamAllowance === "object" )
            this.defaultSeamAllowance = this.defaultSeamAllowance.value();

        this.calculate();

        if ( this.name === this.patternPiece.pattern.data.options.targetPiece )
        {
            this.patternPiece.pattern.data.options.targetPiece = this;
            //this.highlight = true;
        }
    }


    calculate()
    {
        console.log("*********");
        console.log("Prepare piece: " + this.name );
        var nObj;
        var previousP; //not adjusted for seam allowance
        var previousDirectionDeg; //same for SA and not SA        

        console.log("Pass 1 - direction and skipped nodes" );
        //Initial preparation, cut up any curves at notches, reverse curves if necessary, work out
        //which points don't lead to any progress around the curve. 
        for (var a = 0; a < this.detailNodes.length+1; a++)   //+1 because we circle right around to the start
        {  
            var n = this.detailNodes[ ( a == this.detailNodes.length ) ? 0 : a ]; //circle back to the first object at the end. 
            var pn = this.detailNodes[ a-1 < 0 ? a-1+this.detailNodes.length : a-1 ]; 
            var nn = this.detailNodes[ a+1 >= this.detailNodes.length ? a+1-this.detailNodes.length : a+1 ];
            var dObj = n.dObj;
            var nObj = nn.dObj;

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
         
            //if ( a == this.detailNodes.length )
            //    console.log("Closing path");

            if ( a === 0 ) //Note if first node is curve, then it could be done at the start. 
            {
                if ( dObj.curve instanceof GeoSpline )
                    previousP = dObj.curve.pointAlongPathFraction(100); //this wouldn't be correct if the curve needed splitting, i.e. if this is a node on a curve
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

                    var nObjCurveOrArc = nObj.curve instanceof GeoSpline ? nObj.curve
                                                                         : ( nObj.arc instanceof GeoArc || nObj.arc instanceof GeoEllipticalArc ) ? nObj.arc : undefined; //instanceof GeoArc

                    var nextP = nObjCurveOrArc ? nObjCurveOrArc.pointAlongPathFraction( nn.reverse?100:0 ) 
                                               : nObj.p;

                    var dObjCurve = dObj.curve instanceof GeoSpline ? dObj.curve
                                                                    : ( dObj.arc instanceof GeoArc || dObj.arc instanceof GeoEllipticalArc ) ? dObj.arc.asGeoSpline() : undefined; 

                    //What if previousP and/or nextP isn't on the spline? TODO allow for one of them to be, and one not to be
                    var curveSegment;
                    try {
                        curveSegment = dObjCurve.splineBetweenPoints( previousP, nextP );
                        //We found both points, and so we can work out the forward/reverse automatically

                        //This would work generically for arcs and curves as curveSegment.pointAlongPathFraction(0); //and get these to be remembered
                        var correctDirection = curveSegment.nodeData[0].point.equals( previousP );

                        if ( ! correctDirection )
                        {
                            //maybe it doesn't match completely? 
                            //This would work generically for arcs and curves as curveSegment.pointAlongPathFraction(
                            var lineToStart = new GeoLine( previousP, curveSegment.nodeData[0].point );
                            var lineToEnd = new GeoLine( previousP, curveSegment.nodeData[ curveSegment.nodeData.length-1 ].point );
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

                        var curveSegment;
                        
                        if ( n.reverse )
                            curveSegment = (new GeoSpline( [...dObjCurve.nodeData] )).reverse();
                        else 
                            curveSegment = dObjCurve;

                        //NOW INTERSECT WITH start and end separately. 
                        try {
                            var cut = curveSegment.cutAtPoint( previousP );
                            if ( cut && cut.afterPoint )
                            {
                                curveSegment = cut.afterPoint;
                            }
                            else 
                            {
                                //insert an explicit point for the implicit one, otherwise we'll be confused about direction
                                console.log("Adding explit node for an implict start of curve");
                                var curveStartPoint = curveSegment.nodeData[0].point;
                                var line = new GeoLine( previousP, curveStartPoint );
                                var anglePreviousPThisP = line.angleDeg();
                                var newNode = { obj: n.obj + "_implicit_start",
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
                            var cut = curveSegment.cutAtPoint( nextP );
                            if ( cut && cut.beforePoint )
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

                    var thisP = dObj.p;

                    var line = new GeoLine( previousP, thisP );
                    //Is this the same point
                    var samePoint = false;                    
                    if ( thisP.equals( previousP ) )
                        samePoint = true;
                    else
                    {
                        //we could measure the distance and say its the same point if it is very very close
                        console.log("Distance from previousP to thisP " + line.getLength() );
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
                        var anglePreviousPThisP = (new GeoLine( previousP, thisP )).angleDeg();
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
                else if ( dObj.line instanceof GeoLine )
                {
                    //TODO! this needs testing, is this even allowed? 
                    console.log("Line in piece, not allowed! " + n.obj );
                    n.line = dObj.line;
                    n.point = dObj.line.p2;
                    n.directionBeforeDeg = n.line.angleDeg();
                    n.directionAfterDeg = n.directionBeforeDeg
                    n.skipPoint = false; 
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

        console.log("**********************");
        console.log("Pass 2 - add seam allowance");
        var currentSeamAllowance = this.defaultSeamAllowance;
        for (var a = 0; a < this.detailNodes.length; a++) {

            var n = this.detailNodes[ a ];

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
    
            var debugSA = "";
    
            if ( n.curveSegment )
            {    

                var parallelCurves = n.curveSegment.parallelCurve( currentSeamAllowance );

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
            pn = n;

            if ( typeof n.sa1 === "undefined" )
                n.sa1 = currentSeamAllowance;

            if ( typeof n.sa2 !== "undefined" )
                currentSeamAllowance = n.sa2;
        }
        console.log("**********************");
        console.log("**********************");
        console.log("Pass 3 - intersects");

        var pn = this.detailNodes[ this.detailNodes.length-1 ];
        if ( pn.skipPoint )
            pn = this.detailNodes[ this.detailNodes.length-2 ]; 

        for (var a = 0; a < this.detailNodes.length; a++) {

            var n = this.detailNodes[ a ];
            var nn = this.detailNodes[ a+1 >= this.detailNodes.length ? a+1-this.detailNodes.length : a+1 ];

            if ( n.skipPoint )
                continue;

            //Now extend or trim lines and curves so that they intersect at the required points. 
            //See docs/intersectionsWithChangingSeamAllowance.svg

            var sa1 = pn.sa1;
            var sa2 = n.sa1;

            var angleChange = n.directionBeforeDeg - pn.directionAfterDeg;
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
                var matingAngle = 0; //if sa2==sa1 then matingAngle == 0
                
                if (sa1 > sa2)
                    matingAngle = Math.acos( sa2/sa1 ) * 360 / 2 / Math.PI;

                if (sa2 > sa1)
                    matingAngle = Math.acos( sa1/sa2 ) * 360 / 2 / Math.PI;

                //Nb. if the smaller sa is zero, then the matingAngle is 90. 

                var matingAngle2 = - matingAngle; //for where angleChange < 0, i.e. right hand bend

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

                var trailingPath = pn.lineSA ? pn.lineSA : pn.curveSegmentSA;
                var leadingPath = n.lineSA ? n.lineSA : n.curveSegmentSA;

                if ( angleChange >= matingAngle )
                {
                    console.log( "Angle change > " + matingAngle + " therefore just do intersects" );
                    //then we just intersect the lines/curves, neither needs extending, both need clipping
                    var intersect = this.intersect( trailingPath,  leadingPath );
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
                            var reducedSAPoint = pn.pointEndSA.pointAtDistanceAndAngleDeg( (sa1-sa2), pn.directionAfterDeg-90 );
                            var saChangeLine = new GeoLine( pn.pointEndSA, reducedSAPoint );
                            var intersect = this.intersect( saChangeLine, leadingPath );
                            leadingPath = this.clipStart( leadingPath, intersect );
                            pn.reducedSAPoint = intersect;
                            n.pointStartSA = intersect;
                        }
                        else //right-hand
                        {
                            //add the bend, with a calculated length and then just join to the leading piece. 
                            //a = acos( sa2/sa1 )
                            var sa1Overlap = sa2 / Math.cos( angleChange / 360 * 2 * Math.PI );
                            var reducedSAPoint = pn.pointEndSA.pointAtDistanceAndAngleDeg( sa1-sa1Overlap, pn.directionAfterDeg-90 );
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
                            var increasingSAPoint = n.pointStartSA.pointAtDistanceAndAngleDeg( (sa2-sa1), n.directionBeforeDeg-90 );
                            var saChangeLine = new GeoLine( n.pointStartSA, increasingSAPoint );
                            var intersect = this.intersect( saChangeLine, trailingPath );
                            trailingPath = this.clipEnd( trailingPath, intersect );
                            pn.pointEndSA = intersect;
                            n.increasingSAPoint = intersect;
                            //n.pointStartSA = intersect;
                        }
                        else //right hand
                        {
                            //add a calculated length bend to the leading piece and just join the path to it. 
                            var sa2overlap = sa1 / Math.cos( angleChange / 360 * 2 * Math.PI );
                            var increasingSAPoint = n.pointStartSA.pointAtDistanceAndAngleDeg( sa2-sa2overlap, n.directionBeforeDeg-90 );
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
                    var trailExtensionLine = new GeoLine( pn.pointEndSA, pn.pointEndSA.pointAtDistanceAndAngleDeg( 10, pn.directionAfterDeg ) );
                    var leadingExtensionLine = new GeoLine( n.pointStartSA.pointAtDistanceAndAngleDeg( -10, n.directionBeforeDeg ), n.pointStartSA );
                    var intersect = trailExtensionLine.intersect( leadingExtensionLine );

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
        var trailingPathSI = trailingPath.asShapeInfo();
        var leadingPathSI = leadingPath.asShapeInfo();        
        var intersect;
        try {
            var intersections = Intersection.intersect(trailingPathSI, leadingPathSI);
            intersect = new GeoPoint( intersections.points[0].x, intersections.points[0].y );

            if ( intersections.length > 1 )
                console.log( "Intersections found (A). " + intersections.length );

        } catch ( e ) {
            console.log( "No intersections found (A). " + pn.obj + " and " + n.obj );

            try { 
                var intersections = Intersection.intersect( leadingPathSI, leadingPathSI );
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
            var split = leadingPath.cutAtPoint( intersect );
            return split.afterPoint ? split.afterPoint : split.beforePoint;
        }
        else
        {
            return new GeoLine( intersect, leadingPath.p2 );
        }
    }


    drawSeamLine( g ) 
    {
        console.log("Time to draw seam line: ", this.name );

        var p = g.append("path")
                 .attr("id","seam line - " + this.name )
                 .attr("d", this.svgPath( false ) )
                 .attr("fill", "none")
                 .attr("stroke", "#929292") //stroke="#929292" stroke-width="1.421" stroke-dasharray="28.426,2.843"
                 .attr("stroke-dasharray", "2,0.2" )
                 .attr("stroke-width", ( this.getStrokeWidth()/2) ); //TODO this has to be set according to scale
    }


    drawSeamAllowance( g ) 
    {
        console.log("Time to draw seam allowance: ", this.name );

        var p = g.append("path")
                 .attr("id","seam allowance - " + this.name )
                 .attr("d", this.svgPath( true ) )
                 .attr("fill", "none")
                 .attr("stroke", "black")
                 .attr("stroke-width", this.getStrokeWidth() ); //TODO this has to be set according to scale
    } 


    drawNotches( g )
    {
        if ( ! this.detailNodes )
            return;

        var notches = g.append("g").attr("id","notches");
        console.log("*********");
        console.log("notches: " + this.name );

        var pn = this.detailNodes[ this.detailNodes.length -1 ];

        var strokeWidth = this.getStrokeWidth();

        for (var a = 0; a < this.detailNodes.length; a++) 
        {
            var n = this.detailNodes[ a ];

            if ( typeof n.notch === "undefined" )
                continue;
         
            //TODO if no SA, then create a point at an internal tangent
            if ( n.pointEndSA )
            {
                var path = "M" + this.roundForSVG( n.point.x ) + "," + this.roundForSVG( n.point.y ) + " L" + this.roundForSVG( n.pointEndSA.x ) + "," + this.roundForSVG( n.pointEndSA.y );

                //TODO should we connect these D3 data-wise to the notches
                var p = notches.append("path")
                    .attr("d", path )
                    .attr("fill", "none")
                    .attr("stroke", "black")
                    .attr("stroke-width", strokeWidth); //TODO this has to be set according to scale
            }
            else
                console.log("******** Node " + n.obj + " has no pointEndSA");
        };
    }    


    drawInternalPaths( g )
    {
        var internalPathsGroup = g.append("g").attr("id","internal paths");        
        var strokeWidth = this.getStrokeWidth()/2;
        if ( this.internalPaths )
            this.internalPaths.forEach( 
                function(ip) { 
                    if ( ip.nodes )
                        this.drawInternalPath( internalPathsGroup, ip, strokeWidth );
                }, this );   
    }


    drawInternalPath( internalPathsGroup, internalPath, strokeWidth )
    {
        var path = undefined;
        for  (var a in internalPath.nodes )
        {
            var n = internalPath.nodes[ a ];

            if (( n.arc instanceof GeoArc ) || ( n.arc instanceof GeoEllipticalArc ))
                path = n.arc.asGeoSpline().svgPath( path );
            else if ( n.curve instanceof GeoSpline )
                path = n.curve.svgPath( path );
            else
                path = this.lineTo( path, n.p );
        }

        var p = internalPathsGroup.append("path")
            .attr("d", path )
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("class", internalPath.lineStyle )
            .attr("stroke-width", strokeWidth); //TODO this has to be set according to scale
    }


    getStrokeWidth( isOutline, isSelected )
    {
        if ( this.patternPiece.pattern.data.options.lifeSize ) 
        {
            if ( this.patternPiece.pattern.units = "cm" )
                return 0.07; //0.7mm
            else if ( this.patternPiece.pattern.units = "mm" )
                return 0.7; //0.7mm
            else //inches
                return 0.03; //approx 0.7mm
        }
            
        return Math.round( 1000 * ( isOutline ? 7.0 : ( isSelected ? 3.0 : 1.0 ) ) / scale / fontsSizedForScale ) /1000;
    }


    svgPath( withSeamAllowance )
    {
        if ( ! this.detailNodes )
            return;

        console.log("*********");
        console.log("svgPath: " + this.name + " seamAllowance:" + withSeamAllowance );

        var path = undefined;
        var pn = this.detailNodes[ this.detailNodes.length -1 ];

        for (var a = 0; a < this.detailNodes.length+1; a++) {  //+1 because we circle right around to the start

            var n = this.detailNodes[ ( a == this.detailNodes.length ) ? 0 : a ]; //circle back to the first object at the end. 
            //var pn = this.detailNodes[ a-1 < 0 ? a-1+this.detailNodes.length : a-1 ]; 
            //var nn = this.detailNodes[ a+1 >= this.detailNodes.length ? a+1-this.detailNodes.length : a+1 ];
         
            if ( a == this.detailNodes.length )
                console.log("Closing path");

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
                var curveSegmentToDraw = withSeamAllowance ? n.curveSegmentSA : n.curveSegment;

                path = curveSegmentToDraw.svgPath( path ) + " ";
            }
            else
            {
                var thisP = withSeamAllowance ? n.pointEndSA : n.point;

                if ( withSeamAllowance && n.pointStartSA )
                {
                    path = this.lineTo( path, n.pointStartSA );
                }

                path = this.lineTo( path, thisP );
            }

            pn = n;
        };

        //TODO actually close the SVG path? 

        console.log( "Path: " + path );

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
        if ( ! this.detailNodes )
            return;

        var mx = includeOffset && this.data.mx ? this.data.mx : 0.0;
        var my = includeOffset && this.data.my ? this.data.my : 0.0;

        for (var a = 0; a < this.detailNodes.length; a++) {

            var n = this.detailNodes[a];

            if ( n.pointEndSA )
                bounds.adjustToIncludeXY( n.pointEndSA.x + mx, n.pointEndSA.y + my );

            if ( n.pointStartSA )
                bounds.adjustToIncludeXY( n.pointStartSA.x + mx, n.pointStartSA.y + my );
        }
    }


    roundForSVG( n )
    {
        return Math.round( n * 1000 ) / 1000;
    }

}
//(c) Copyright 2019 Jason Dore
//https://github.com/MrDoo71/PatternEditor



class PatternDrawing {

    constructor (data, pattern) {
        this.data = data;
        this.drawing = {};
        this.pattern = pattern;

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
        this.pieces = []; //aka details

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
        for (var a = 0; a < this.drawingObjects.length; a++) {
            var dObj = this.drawingObjects[a];
            dObj = this.newDrawingObj(dObj);
            if (dObj === null)
                continue;
            //    throw( "Unknown objectType:" + dObj.objectType );
            this.drawingObjects[a] = dObj; //these are now the objects with methods


            this.drawing[dObj.data.name] = dObj;
            dObj.patternPiece = this;    
            this.calculateObj(dObj);
        }

        //Take each group in the JSON and convert to an object. 
        //After this the isVisible() method on the drawingObject will work. 
        if ( this.data.group )
            for (var a = 0; a < this.data.group.length; a++) {
                this.groups[a] = new Group( this.data.group[a], this );
            }
        
        if ( this.data.piece )
            for (var a = 0; a < this.data.piece.length; a++) {
                this.pieces[a] = new Piece( this.data.piece[a], this );
            }

        var options = this.pattern.data.options; 
        if ( options && ( typeof options.targetPiece === "object" ) )
        {
            options.targetPiece.adjustBounds( this.visibleBounds );
        }
        else if ( options && ( options.targetPiece === "all" ) ) //TODO also an array with specific multiple pieces specified
        {
            for (var a = 0; a < this.data.piece.length; a++) {
                this.pieces[a].adjustBounds( this.visibleBounds, true );
            }
        }
        else
        {
            //This ensures the seam allowance is included in the bounds
            if ( this.data.piece )
                for (var a = 0; a < this.data.piece.length; a++) {
                    this.pieces[a].adjustBounds( this.visibleBounds  );
                }

            //Calculate the visible bounds            
            this.drawingObjects.forEach( function(dObj){
                if (   ( dObj.isVisible( options ) )
                    && ( dObj.data.lineStyle !== "none" ) )         
                    try {
                        dObj.adjustBounds( this.visibleBounds );
                    } catch ( e ) {
                        console.log("Error adjusting bounds for " + dObj.name + " ", e );
                    }
            }, this) ;
        }

    }

    
    getObject(name, thisPieceOnly) {
        if (typeof name === "object")
            return name;

        var objOnThisPiece = this.drawing[name];
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
        if (dObj.objectType === "pointSingle")
            return new PointSingle(dObj);
        else if (dObj.objectType === "pointEndLine")
            return new PointEndLine(dObj);
        else if (dObj.objectType === "pointAlongLine")
            return new PointAlongLine(dObj);
        else if (dObj.objectType === "pointAlongPerpendicular")
            return new PointAlongPerpendicular(dObj);
        else if (dObj.objectType === "pointAlongBisector")
            return new PointAlongBisector(dObj);            
        else if (dObj.objectType === "pointFromXandYOfTwoOtherPoints")
            return new PointFromXandYOfTwoOtherPoints(dObj);
        else if (dObj.objectType === "pointIntersectLineAndAxis")
            return new PointIntersectLineAndAxis(dObj);
        else if (dObj.objectType === "line")
            return new Line(dObj);
        else if (dObj.objectType === "pointLineIntersect")
            return new PointLineIntersect(dObj);
        else if (dObj.objectType === "pointIntersectArcAndAxis")
            return new PointIntersectArcAndAxis(dObj);
        else if (dObj.objectType === "pointIntersectArcAndLine")
            return new PointIntersectArcAndLine(dObj);
        else if (dObj.objectType === "perpendicularPointAlongLine")
            return new PerpendicularPointAlongLine(dObj);
        else if (dObj.objectType === "pointOfTriangle")
            return new PointOfTriangle(dObj);            
        else if (dObj.objectType === "pointShoulder")
            return new PointShoulder(dObj);            
        else if (dObj.objectType === "arcSimple")
            return new ArcSimple(dObj);
        else if (dObj.objectType === "arcElliptical")
            return new ArcElliptical(dObj);
        else if (dObj.objectType === "splineSimple")
            return new SplineSimple(dObj);
        else if (dObj.objectType === "splineUsingPoints")
            return new SplineUsingControlPoints(dObj);
        else if (dObj.objectType === "splinePathInteractive")
            return new SplinePathInteractive(dObj);
        else if (dObj.objectType === "splinePathUsingPoints")
            return new SplinePathUsingPoints(dObj);
        else if (dObj.objectType === "cutSpline")   //SHOULD THIS BE pointCutSpline for consistency?
            return new CutSpline(dObj);
        else if (dObj.objectType === "pointCutSplinePath")
            return new PointCutSplinePath(dObj);      
        else if (dObj.objectType === "pointCutArc")
            return new PointCutArc(dObj);                              
        else if (dObj.objectType === "pointIntersectCurves")
            return new PointIntersectCurves(dObj);      
        else if (dObj.objectType === "pointIntersectCurveAndAxis")
            return new PointIntersectCurveAndAxis(dObj);      
        else if (dObj.objectType === "pointIntersectArcs")
            return new PointIntersectArcs(dObj);      
        else if (dObj.objectType === "pointIntersectCircles")
            return new PointIntersectCircles(dObj);                  
        else if (dObj.objectType === "operationMove")
            return new OperationMove(dObj);                  
        else if (dObj.objectType === "operationRotate")
            return new OperationRotate(dObj);                  
        else if (dObj.objectType === "operationFlipByAxis")
            return new OperationFlipByAxis(dObj);                  
        else if (dObj.objectType === "operationFlipByLine")
            return new OperationFlipByLine(dObj);                  
        else if (dObj.objectType === "operationResult")
            return new OperationResult(dObj);                  
        else if (dObj.objectType === "pointFromArcAndTangent")
            return new PointFromArcAndTangent(dObj);                  
        else if (dObj.objectType === "pointFromCircleAndTangent")
            return new PointFromCircleAndTangent(dObj);                  
        else if (dObj.objectType === "trueDart")
            return new TrueDart(dObj);                              
        else if (dObj.objectType === "trueDartResult")
            return new TrueDartResult(dObj);                              
        else 
        {
            var fail = new PointSingle( {x:0, y:0, contextMenu:dObj.contextMenu } );
            fail.error =  "Unsupported drawing object type:" + dObj.objectType;
            return fail;
        }
        //throw( "Unsupported drawing object type:" + dObj.objectType );

        return null;
    }

    newFormula(formula) {

        var patternUnits = this.pattern.units;
        var f = formula;
        if (typeof formula.constant !== "undefined") {
            f.value = function () {
                return this.constant;
            };
            f.html = function() {
                return this.constant;
            };
            f.htmlLength = function() {
                var precision = patternUnits === "mm" ? 10.0 : 100.0;
                var s = Math.round( precision * this.constant ) / precision;
                return '<span class="const">' + s + " " + patternUnits + '</span>';
            };
            f.htmlAngle = function() {
                var s = Math.round( 10.0 * this.constant ) / 10.0;
                return '<span class="const">' + s + "&#176;" + '</span>';
            };
        }
        else if (typeof formula.expression === "object") {
            f.expression = new Expression( f.expression, this.pattern, this );
            f.value = function (currentLength) {
                return f.expression.value(currentLength);
            };
            f.html = function( asFormula, currentLength ) {
                return f.expression.html( asFormula, currentLength );
            };
            f.htmlLength = function( asFormula, currentLength ) {
                var s = f.expression.html( asFormula, currentLength );
                if ( ! asFormula )
                {
                    var precision = patternUnits === "mm" ? 10.0 : 100.0;
                    s = Math.round( precision * s ) / precision;
                    s += " " + patternUnits;
                }
                return s;
            };
            f.htmlAngle = function( asFormula, currentLength ) {
                var s = f.expression.html( asFormula, currentLength );
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
        var dObj = this.add( data );
        return dObj;
    }

    add(data) {
console.log("Add() is this used anywhere?");

        if (this.defaults) {
            for (var d in this.defaults) {
                if (typeof data[d] === "undefined")
                    data[d] = this.defaults[d];
            }
        }
        var dObj = this.newDrawingObj(data);
        this.drawingObjects.push(dObj);
        this.drawing[dObj.data.name] = dObj;
        dObj.patternPiece = this;
        this.calculateObj(dObj);
        return dObj;
    }

    setDefaults(defaults) {
        this.defaults = defaults;
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

var selectedObject;
var linksGroup;
var fontsSizedForScale = 1;
var fontResizeTimer;
var updateServerTimer;
var timeOfLastTweak;
var doDrawingAndTable;

function drawPattern( dataAndConfig, ptarget, graphOptions ) 
{
    //Remove the svg if called by graph_kill
    if ( dataAndConfig === null )
    {
        var parent = document.getElementById(ptarget).parentNode;
        var child = document.getElementById(ptarget);
        parent.removeChild(child);
        return ;
    } 

    //This is a graph initialisation

    var pattern = new Pattern( dataAndConfig, graphOptions );            
    
    // show menu on right-click.
    var contextMenu = typeof goGraph === "function" ? function(d) {
        if ( d.contextMenu )
        {
            d3.event.preventDefault() ;
            var v = newkvpSet(false) ;
            v.add("x", d.x) ;   
            v.add("y", d.y) ;    
            goGraph( graphOptions.interactionPrefix + ':' + d.contextMenu ,
                    d3.event, 
                    v ) ;
        }
    } : function(d){};     
    
    var targetdiv = d3.select( "#" + ptarget )
                       .append( "div" )
                       .attr( "class", "pattern-editor" );

    if ( ! dataAndConfig.options )
        dataAndConfig.options = {};

    var options = dataAndConfig.options;

    if ( options.allowPanAndZoom === undefined )
        options.allowPanAndZoom = true;

    if ( options.showFormulas === undefined )
        options.showFormulas = true;

    if ( options.drawingTableSplit === undefined )
        options.drawingTableSplit = 0.66;

    if ( options.lastMixedSplit === undefined )
        options.lastMixedSplit = options.drawingTableSplit > 0.0 && options.drawingTableSplit < 1.0 ? options.drawingTableSplit : 0.66;

    if ( ! options.viewOption )
        options.viewOption = [  { "mode":"drawing", "icon": "icon-picture",       "drawingTableSplit": 1.0 },
                                { "mode":"mixed",   "icon": "icon-columns",       "drawingTableSplit": 0.5 },
                                { "mode":"table",   "icon": "icon-align-justify", "drawingTableSplit": 0 } ];

    options.interactionPrefix = graphOptions.interactionPrefix;

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

        var availableWidth = Math.round( window.innerWidth - 30 -32 );//targetdiv.style('width').slice(0, -2) -30 ); //30 for resize bar & 32 for scroll bars as not all systems hide scroll bars
        var availableHeight= Math.round( window.innerHeight - targetdiv.node().getBoundingClientRect().top -60/*controlpanel buttons height*/);
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
        console.log("setDrawingTableSplit split:" + drawingTableSplit + " availableWidth:" + availableWidth + " fullWindow:" + this.fullWindow + " drawingWidth:" + this.layoutConfig.drawingWidth );
        
        if ( this.sizeButtons )
        {
            var drawingTableSplitMode = this.drawingTableSplitMode;
            this.sizeButtons.selectAll("button")
                        .data( this.viewOption )
                        //.enter()
                        //.append("button")
                        .attr( "class",  function(d) { 
                            return d.mode == drawingTableSplitMode ? "btn btn-primary" : "btn btn-default" } );
        }

        if ( this.drawingTableSplit != drawingTableSplit )
        {
            this.drawingTableSplit = drawingTableSplit; //so we can call this without a parameter when toggling full size. 
            if ( this.updateServer ) 
                this.updateServer(); 
        }
    };    

    options.updateServer = graphOptions.interactionPrefix && options.update ? function( k, x, y ) {
        if ( k )
        {
//TODO shouldn't this be this. rather than options.  ???

            if (    (options.translateX == x)
                 && (options.translateY == y)
                 && (options.scale == k) )
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
        var kvpSet = newkvpSet(true) ;
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

    var focusDrawingObject = function( d, scrollTable )
    {
        if (    ( d3.event) 
             && ( d3.event.originalTarget )
             && ( d3.event.originalTarget.className === "ps-ref" )
             && ( selectedObject == d )
             )
        {
            selectedObject = d.patternPiece.getObject( d3.event.originalTarget.innerHTML );
            scrollTable = true;
        }
        else if (    ( d3.event) 
                  && ( d3.event.srcElement )
                  && ( d3.event.srcElement.className === "ps-ref" )
                  && ( selectedObject == d )
             )
        {
            selectedObject = d.patternPiece.getObject( d3.event.srcElement.innerHTML );
            scrollTable = true;
        }
        else
        {
            selectedObject = d;
        }

        for( var j=0; j< pattern.patternPieces.length; j++ )
            for( var i=0; i< pattern.patternPieces[j].drawingObjects.length; i++ )
            {
                var a = pattern.patternPieces[j].drawingObjects[i];
                var g = a.drawingSvg;
                if ( g )
                {
                    var strokeWidth = a.getStrokeWidth( false, (selectedObject==a) );

                    g.selectAll( "line" )
                     .attr("stroke-width", strokeWidth );

                    g.selectAll( "path" )
                     .attr("stroke-width", strokeWidth );

                    g.selectAll( "ellipse" )
                     .attr("stroke-width", strokeWidth );
                }
                //else //this can happen e.g. because a group is hidden
                //    console.log("No drawing object for " + a.data.name );
            }        

        var graphdiv = targetdiv;
        //Remove any existing highlighting in the table. 
        $(graphdiv.node()).find( ".j-active" ).removeClass("j-active").removeClass("j-active-2s");
        $(graphdiv.node()).find( ".source" ).removeClass("source");
        $(graphdiv.node()).find( ".target" ).removeClass("target");
        //$(graphdiv.node()).find( ".j-outline.j-outline-active" ).removeClass("j-outline-active");
        //$(this).addClass("j-active"); //highlight the object in the drawing

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
                var selectedObjectToAdjustAfter2Secs = selectedObject; //The user may have clicked on something else within 2 seconds
                //the blush will only last 2 seconds anyway, but if we don't do this then a second click whilst it is the active one doesn't repeat the blush
                setTimeout( function(){ selectedObjectToAdjustAfter2Secs.outlineSvg.node().classList.add("j-active-2s");}, 2000 );
            }
        }

        //Set the css class of all links to "link" "source link" or "target link" as appropriate.
        if ( linksGroup )
            linksGroup.selectAll("path.link") //rename .link to .dependency
            .attr("class", function( d ) {                         
                if ( d.source == selectedObject ) 
                {
                    d.target.tableSvg.node().classList.add("source");

                    if ( d.target.outlineSvg ) //if it errored this will be undefined
                        d.target.outlineSvg.node().classList.add("source");

                    //d.target.tableSvg.each( function() { $(this).addClass("source"); } );
                    return "source link";
                }
                if ( d.target == selectedObject ) 
                {
                    d.source.tableSvg.node().classList.add("target");

                    if ( d.source.outlineSvg ) //if it errored this will be undefined
                        d.source.outlineSvg.node().classList.add("target");

                    //d.source.tableSvg.each( function() { $(this).addClass("target"); } );
                    return "target link";
                }
                return "link"; 
            } )
            .each( function( d ) { 
                if (( d.source == selectedObject ) || ( d.target == selectedObject ))
                    d3.select(this).raise();
             } );

        //Scroll the table to ensure that d.tableSvg is in view.    
        if (( scrollTable ) && ( selectedObject ))
        {
            if ( selectedObject.tableSvg )
            {
                var table = d3.select("div.pattern-table");
                table.transition()
                     .duration(500)
                     .tween("uniquetweenname", scrollTopTween( selectedObject.tableSvg.node().__data__.tableSvgY - ( table.node().getBoundingClientRect().height /2) ));
            }
            else
                console.log( "Cannot scroll table, no tableSvg - " + selectedObject.data.name );
        }
    };

    var controls = doControls( targetdiv, options, pattern );

    var drawingAndTableDiv = targetdiv.append("div").attr("class", "pattern-main")

    doDrawingAndTable = function( retainFocus ) {
                                    if ( options.layoutConfig.drawingWidth )
                                        doDrawing( drawingAndTableDiv, pattern, options, contextMenu, controls, focusDrawingObject );
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
    
    var errorFound = false;
    var firstDrawingObject;
    for( var j=0; j< pattern.patternPieces.length; j++ )
    {
        for( var i=0; i< pattern.patternPieces[j].drawingObjects.length; i++ )
        {
            var a = pattern.patternPieces[j].drawingObjects[i];

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
            var a = pattern.getObject( options.focus );

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
    var layoutConfig = editorOptions.layoutConfig;
    var drag = d3.drag()
    .on("start", function(r) {
        console.log("dragStart");
        var rg = d3.select(this);        
        r.initialX = d3.event.x;
        r.resizeBarBaseStyle = rg.attr("style");
    })
    .on("drag", function(r) {
        console.log("drag");
        var rg = d3.select(this);       
        rg.attr("style", r.resizeBarBaseStyle + " left:" + ( d3.event.x - r.initialX ) + "px;" ); 
    })
    .on("end", function(r){
        console.log("dragEnd: " + d3.event.x + " (" + ( d3.event.x - r.initialX ) + ")" );
        console.log( "layoutConfig:" + layoutConfig ); 
        var rg = d3.select(this);       
        rg.attr("style", r.resizeBarBaseStyle ); 
        var newDrawingWidth = layoutConfig.drawingWidth + ( d3.event.x - r.initialX );
        var newTableWidth  = layoutConfig.tableWidth - ( d3.event.x - r.initialX );
        editorOptions.setDrawingTableSplit( newDrawingWidth / ( newDrawingWidth + newTableWidth) );
        doDrawingAndTable();
    });

    var layoutConfig = editorOptions.layoutConfig;
    var height = layoutConfig.drawingHeight;

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

    var controls = graphdiv.append("div").attr("class", "pattern-editor-controls")

    if (    ( editorOptions.viewOption )
         && ( typeof editorOptions.viewOption === "object" ) //allow viewOption="drawing" to prevent display if these buttons
         && ( editorOptions.viewOption.length > 1 ) )
    {
        editorOptions.sizeButtons = controls.append("div").attr("class", "btn-group view-options");
        editorOptions.sizeButtons.selectAll("button")
                    .data( editorOptions.viewOption )
                    .enter()
                    .append("button")
                    .attr( "class",  function(d) { return d.mode == editorOptions.drawingTableSplitMode ? "btn btn-primary" : "btn btn-default" } )
                    .html(function(d) { return '<i class="' + d.icon + '"></i>'; })
                    .on("click", function(d) {
                        d3.event.preventDefault();
                        editorOptions.setDrawingTableSplit( d.mode );
                        doDrawingAndTable();
                        //$(this).parent().find("button").removeClass("btn-primary").addClass("btn-default");
                        //$(this).addClass("btn-primary");
                    } );
                    //TODO set the selected button to button-primary
    }

    if ( editorOptions.includeFullPageOption )
    {
        var toggleFullScreen = function() {
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

        var fullPageButton = controls.append("button")
                                     .attr("class", "btn btn-default toggle-full-page")
                                     .html( '<i class="icon-fullscreen" />' )
                                     .attr("title","Toggle full screen")
                                     .on("click", toggleFullScreen );
    }

    //Zoom to fit. 
    if ( editorOptions.allowPanAndZoom )
    {
        var zoomToFitButton = controls.append("button")
                                     .attr("class", "btn btn-default zoom-to-fit")
                                     .html( '<i class="icon-move" />' )
                                     .attr("title","Zoom to fit");
                                     //.on("click", zoomToFit );
    }    

    if ( editorOptions.downloadOption )
    {
        var downloadFunction = function() {
            var serializer = new XMLSerializer();
            var xmlString = serializer.serializeToString(d3.select('svg').node());
            var imgData = 'data:image/svg+xml;base64,\n' + btoa(xmlString);

            d3.select(this)
                          .attr( "href-lang", "image/svg+xml" )
                          .attr( "href", imgData )
                          .attr( "download", pattern.patternNumberAndName +  ( editorOptions.targetPiece.name ? " - " + editorOptions.targetPiece.name : "" ) + ".svg" );
        };

        var downloadLink = controls.append("a")
                                     .attr("class", "btn btn-default download")
                                     .html( '<i class="icon-download"></i> Download' )
                                     .attr("title","Download")
                                     .on("click", downloadFunction );
    }    

    {
        var toggleShowFormulas = function() {
            d3.event.preventDefault();
            editorOptions.showFormulas = ! editorOptions.showFormulas;
            $(this).children("i").attr("class",editorOptions.showFormulas ? "icon-check" : "icon-check-empty" );
            doDrawingAndTable( true /*retain focus*/ );
        };

        var optionMenuToggle = function() {
            d3.event.preventDefault();
            var $optionMenu = $( "#optionMenu");
            if ( $optionMenu.is(":visible")) $optionMenu.hide(); else $optionMenu.show();
        }

        var optionMenu = controls.append("div").attr("class","pattern-popup")
                                 .append("div").attr("id","optionMenu" ); //.css("display","visible")
        optionMenu.append("button").html( '<i class="icon-remove"></i>' ).on("click", optionMenuToggle );

        pattern.patternPieces.forEach( function(pp) {
            if ( ! pp.groups.length )
                return;
            var groupOptionsForPiece = optionMenu.append("section");
            groupOptionsForPiece.append("h2").text( pp.name );
            pp.groups.forEach( function(g) {
                var groupOption = groupOptionsForPiece.append("div").attr("class","group-option");
                var toggleGroup = function() {
                    g.visible = ! g.visible;  

                    if(( typeof goGraph === "function" ) && ( g.update ))
                    {
                        var kvpSet = newkvpSet(true) ;
                        kvpSet.add('visible', g.visible ) ;
                        goGraph(editorOptions.interactionPrefix + ':' + g.update, fakeEvent(), kvpSet) ;    
                    }

                    return g.visible;
                };
                groupOption.append( "i" ).attr("class",  g.visible ? 'icon-eye-open' :'icon-eye-close' )
                           .on( "click", function() { 
                                            d3.event.preventDefault();
                                            var visible = toggleGroup();
                                            d3.select(this).attr("class",visible ? "icon-eye-open" : "icon-eye-close" );
                                            doDrawingAndTable( true /*retain focus*/ );
                                } );
                groupOption.append( 'span' )
                           .text(g.name );
                if (( g.contextMenu ) && ( typeof goGraph === "function" ))
                groupOption.append( "i" ).attr("class",  "icon-ellipsis-horizontal k-icon-button" )           
                           .on( "click", function() { 
                            d3.event.preventDefault();
                            var v = newkvpSet(false) ;
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

        var wallpaperMenuToggle = function() {
            d3.event.preventDefault();
            var $wallpaperMenu = $( "#wallpapersMenu");
            if ( $wallpaperMenu.is(":visible")) $wallpaperMenu.hide(); else $wallpaperMenu.show();
        }

        var wallpaperMenu = controls.append("div").attr("class","pattern-popup")
                                    .append("div").attr("id","wallpapersMenu" ); 
        wallpaperMenu.append("button").html( '<i class="icon-remove"></i>' ).on("click", wallpaperMenuToggle );
            
        var wallpaperListSection = wallpaperMenu.append("section");
        wallpaperListSection.append("h2").text( "Wallpapers" );
        wallpaperListSection = wallpaperListSection.append("ul");
        wallpaperListSection.selectAll("li")
            .data( pattern.wallpapers )
            .enter()
            .append("li")
            .attr( "class", function(w) { return w.hide ? 'wallpaper-hidden' : null; } )
            .each( function(wallpaper,i){                
                var wallpaperDiv = d3.select(this);

                
                wallpaperDiv.append( "span" ).html( function(w) { return w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      w.hide = ! w.hide; 
                                                                      d3.select(this).html( w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' );
                                                                      d3.select(this.parentNode).attr( "class", w.hide ? 'wallpaper-hidden' : null );
                                                                      w.updateServer();
                                                                      var wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                      doWallpapers( wallpaperGroups, pattern );                                                              
                                                                     } );
                wallpaperDiv.append( "span" ).html( function(w) { return w.editable ? '<i class="icon-unlock"/>' : w.allowEdit ? '<i class="icon-lock"/>' : '<i class="icon-lock disabled"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      if ( w.allowEdit )
                                                                      {
                                                                        w.editable = ! w.editable; 
                                                                        d3.select(this).html( w.editable ? '<i class="icon-unlock"/>' : '<i class="icon-lock"/>' );
                                                                        var wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                        doWallpapers( wallpaperGroups, pattern );                                                              
                                                                      }
                                                                     } );
                wallpaperDiv.append( "span" ).text( wallpaper.filename ? wallpaper.filename : wallpaper.imageurl );
                                                                     //icon-lock icon-unlock icon-move icon-eye-open icon-eye-close
            });            

        controls.append("button").attr("class","btn btn-default toggle-options").html( '<i class="icon-camera-retro"></i>' ).attr("title","Wallpapers").on("click", wallpaperMenuToggle );
    } //wallpapers button    


//     if ( pattern.wallpapers )
//     {
//         initialiseWallpapers( pattern, editorOptions.interactionPrefix );
// //HERE
//         var wallpaperControlsGroupsDiv = controls.append("div").attr("class","wallpapers");
//         wallpaperControlsGroupsDiv.append("div").attr("class","fadeout")
//         var wallpaperControlsGroupsTable = wallpaperControlsGroupsDiv.append("table");
//         wallpaperControlsGroupsTable.selectAll("tr")
//             .data( pattern.wallpapers )
//             .enter()
//             .append("tr")
//             .attr( "class", function(w) { return w.hide ? 'wallpaper-hidden' : null; } )
//             .each( function(wallpaper,i){                
//                 var wallpaperDiv = d3.select(this);
//                 wallpaperDiv.append( "td" ).html( function(w) { return w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' } )
//                                            .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
//                                                                       w.hide = ! w.hide; 
//                                                                       d3.select(this).html( w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' );
//                                                                       d3.select(this.parentNode).attr( "class", w.hide ? 'wallpaper-hidden' : null );
//                                                                       w.updateServer();
//                                                                       var wallpaperGroups = graphdiv.select( "g.wallpapers");
//                                                                       doWallpapers( wallpaperGroups, pattern );                                                              
//                                                                      } );
//                 wallpaperDiv.append( "td" ).html( function(w) { return w.editable ? '<i class="icon-unlock"/>' : w.allowEdit ? '<i class="icon-lock"/>' : '<i class="icon-lock disabled"/>' } )
//                                            .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
//                                                                       if ( w.allowEdit )
//                                                                       {
//                                                                         w.editable = ! w.editable; 
//                                                                         d3.select(this).html( w.editable ? '<i class="icon-unlock"/>' : '<i class="icon-lock"/>' );
//                                                                         var wallpaperGroups = graphdiv.select( "g.wallpapers");
//                                                                         doWallpapers( wallpaperGroups, pattern );                                                              
//                                                                       }
//                                                                      } );
//                 wallpaperDiv.append( "td" ).text( wallpaper.filename ? wallpaper.filename : wallpaper.imageurl );
//                                                                      //icon-lock icon-unlock icon-move icon-eye-open icon-eye-close
//             });
//     }
    return controls;
}


function initialiseWallpapers( pattern, interactionPrefix )
{    
    var updateServer = ( typeof goGraph === "function" ) ? function(e) {
        var kvpSet = newkvpSet(true) ;
        kvpSet.add('offsetX', this.offsetX ) ;
        kvpSet.add('offsetY', this.offsetY ) ;
        kvpSet.add('scaleX', this.scaleX * defaultScale ) ;
        kvpSet.add('scaleY', this.scaleY * defaultScale ) ;
        kvpSet.add('opacity', this.opacity ) ;
        kvpSet.add('visible', ! this.hide ) ;
        goGraph(interactionPrefix + ':' + this.update, fakeEvent(), kvpSet) ;    
    } : function(e){};

    var wallpapers = pattern.wallpapers; 
    for( var i=0; i<wallpapers.length; i++ )
    {
        var w = wallpapers[i];

        if ( ! w.initialised )
        {
            //A 720px image is naturally 10in (at 72dpi)
            //If our pattern as 10in across then our image should be 10 units.
            //If our pattern was 10cm across then our image should be 25.4 units and we would expect to need to specify a scale of 1/2.54
            var defaultScale = 72;
            if ( pattern.units === "cm" )
            {
                defaultScale = 72 / 2.54;
            }
            else if ( pattern.units === "mm" )
            {
                defaultScale = 72 / 25.4;
            }
            w.scaleX = w.scaleX / defaultScale /*dpi*/; //And adjust by pattern.units
            w.scaleY = w.scaleY / defaultScale /*dpi*/;
            w.hide = ( w.visible !== undefined ) && (! w.visible );
            w.allowEdit = ( w.allowEdit === undefined ) || ( w.allowEdit );
            
            //w.dimensionsKnown = dimensionsKnown;
            $("<img/>") // Make in memory copy of image to avoid css issues
                .attr("src", w.imageurl )
                .attr("data-wallpaper", i)
                .on( "load", function() {
                    //seems like we can't rely on closure to pass w in, it always   points to the final wallpaper
                    w = wallpapers[ this.dataset.wallpaper ];
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
        var i = d3.interpolateNumber(this.scrollTop, scrollTop);
        //console.log( "function1: ", this.scrollTop, " - ", scrollTop );
        return function(t) { 
            this.scrollTop = i(t); 
            //console.log( "function2: ", this.scrollTop );
        };
    }
}
  

//Do the drawing... (we've added draw() to each drawing object.
function doDrawing( graphdiv, pattern, editorOptions, contextMenu, controls, focusDrawingObject )
{
    var layoutConfig = editorOptions.layoutConfig;
    var margin = editorOptions.lifeSize ? ( margin = pattern.units == "mm" ? 5 : pattern.units == "cm" ? 0.5 : 0.1 ) : 0;
    if ( margin )
    {
        pattern.visibleBounds.minX = Math.round( ( pattern.visibleBounds.minX - margin ) * 1000 ) / 1000;
        pattern.visibleBounds.minY = Math.round( ( pattern.visibleBounds.minY - margin ) * 1000 ) / 1000;
        pattern.visibleBounds.maxX = Math.round( ( pattern.visibleBounds.maxX + margin ) * 1000 ) / 1000;
        pattern.visibleBounds.maxY = Math.round( ( pattern.visibleBounds.maxY + margin ) * 1000 ) / 1000;
    }
    var width =  layoutConfig.drawingWidth;
    var height = layoutConfig.drawingHeight;
    var patternWidth = pattern.visibleBounds.maxX - pattern.visibleBounds.minX;
    var patternHeight = pattern.visibleBounds.maxY - pattern.visibleBounds.minY;

    graphdiv.select("svg.pattern-drawing").remove();

    var svg;
    
    if ( editorOptions.lifeSize )
    {
        //The margin needs to at least be 0.5 * strokewidth so tha that strokes arnt clipped. 
        var margin = pattern.units == "mm" ? 5 : pattern.units == "cm" ? 0.5 : 0.1;
        svg = graphdiv.append("svg")
                      .attr("class", "pattern-drawing" )
                      .attr("width", patternWidth + pattern.units )
                      .attr("height", patternHeight + pattern.units )
                      .attr("viewBox", pattern.visibleBounds.minX + " " + pattern.visibleBounds.minY + " " + patternWidth + " " + patternHeight );
    }
    else
    {
        svg = graphdiv.append("svg")
                       .attr("class", "pattern-drawing" )
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));
    }

    var transformGroup1 = svg.append("g"); //This gets used by d3.zoom

    //console.log( "Pattern bounds minX:" + pattern.bounds.minX + " maxX:" + pattern.bounds.maxX );
    //console.log( "Pattern bounds minY:" + pattern.bounds.minY + " maxY:" + pattern.bounds.maxY );

    //transformGroup2 scales from calculated positions in pattern-space (e.g. 10 representing 10cm) to
    //pixels available. So 10cm in a 500px drawing has a scale of 50. 
    var transformGroup2;

    if ( editorOptions.lifeSize )
    {
        scale = 1;
        transformGroup2 = transformGroup1; //we don't need another group
    }
    else
    {
        var scaleX = width / patternWidth;                   
        var scaleY = height / patternHeight;           
        
        if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
            scale = scaleX > scaleY ? scaleY : scaleX;
        else if ( isFinite( scaleX ) )
            scale = scaleX;
        else
            scale = 1;

        transformGroup2 = transformGroup2 = transformGroup1.append("g").attr("transform", "scale(" + scale + "," + scale + ")");
    }

    //console.log( "scale:" + scale + " patternWidth:" + patternWidth + " width:" + width );

    //centralise horizontally                            
    var boundsWidth = pattern.visibleBounds.maxX - pattern.visibleBounds.minX;
    var availableWidth = width / scale;
    var offSetX = ( availableWidth - boundsWidth ) /2;

    //transformGroup3 shifts the position of the pattern, so that it is centered in the available space. 
    var transformGroup3 = transformGroup2.append("g")                               
                                         .attr("class","pattern");                           

    if ( editorOptions.downloadOption )  
        transformGroup3.attr("id", pattern.patternNumberAndName )
        
    if ( ! editorOptions.lifeSize )
        transformGroup3.attr("transform", "translate(" + ( ( -1.0 * ( pattern.visibleBounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.visibleBounds.minY ) ) + ")");    

    if ( pattern.wallpapers )
    {
        var wallpaperGroups = transformGroup2.append("g")
                                             .attr("class","wallpapers")
                                             .attr("transform", "translate(" + ( ( -1.0 * ( pattern.visibleBounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.visibleBounds.minY ) ) + ")")   
                                             .lower();
        doWallpapers( wallpaperGroups, pattern );
    }
     
    //Clicking on an object in the drawing should highlight it in the table.
    var onclick = function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,true);
    };

    for( var j=0; j< pattern.patternPieces.length; j++ )
    {
        var patternPiece = pattern.patternPieces[j];

        var skipDrawing = editorOptions.downloadOption;

        if ( ! skipDrawing )
        {
            var outlineGroup = transformGroup3.append("g").attr("class","j-outline");
            var drawingGroup = transformGroup3.append("g").attr("class","j-drawing");

            var a = drawingGroup.selectAll("g");    
            a = a.data( patternPiece.drawingObjects );
            a.enter()
            .append("g")
            .on("contextmenu", contextMenu)
            .on("click", onclick)
            .each( function(d,i) {
                var g = d3.select( this );                        
                if (   ( typeof d.draw === "function" ) 
                    && ( ! d.error )
                    && ( d.isVisible( editorOptions ) ) )
                try {
                    d.draw( g );
                    d.drawingSvg = g;                 
                } catch ( e ) {
                    d.error = "Drawing failed. " + e;
                }
            });

            var a = outlineGroup.selectAll("g");    
            a = a.data( patternPiece.drawingObjects );
            a.enter()
            .append("g")
            .on("contextmenu", contextMenu)
            .on("click", onclick)
            .each( function(d,i) {
                var g = d3.select( this );
                if (   ( typeof d.draw === "function" ) 
                    && ( ! d.error )
                    && ( d.isVisible( editorOptions ) ) )
                {
                    d.draw( g, true );
                    d.outlineSvg = g;
                }
            });
        }

        var pieceGroup   = transformGroup3.append("g").attr("class","j-pieces");

        var pg = pieceGroup.selectAll("g");    
        pg = pg.data( patternPiece.pieces );
        pg.enter()
         .append("g")        
         //.on("contextmenu", contextMenu)
         //.on("click", onclick)
         .each( function(p,i) {
            var g = d3.select( this );
            g.attr("id", p.name );

            //if doing an export of multiple pieces then take the piece.mx/my into account
            if ( editorOptions.targetPiece === "all" ) //OR AN ARRAY WITH >1 length
            {
                g.attr("transform", "translate(" + ( 1.0 * p.data.mx ) + "," +  (1.0 * p.data.my ) + ")");    
            }

            if (   ( typeof p.drawSeamLine === "function" ) )
            {
                p.drawSeamLine( g );
                p.drawSeamAllowance( g );
                p.drawNotches( g );
                p.drawInternalPaths( g );
                p.svg = g;
            }
        });
    };

    var updateServerAfterDelay = function()
    {
        //Lets only update the server if we've stopped panning and zooming for > 1s.
        timeOfLastTweak = (new Date()).getTime();
        if ( ! updateServerTimer )
        {
            var updateServerTimerExpired = function () {

                updateServerTimer = null;          
                //console.log("Zoom update server timer activated. TimeOfLastTweak:" + timeOfLastTweak + " Now:" + (new Date()).getTime());

                if ( (new Date()).getTime() >= ( timeOfLastTweak + 500 ) )
                {
                    var zt = d3.zoomTransform( transformGroup1.node() );
                    if ( editorOptions.updateServer )
                        editorOptions.updateServer( zt.k, zt.x, zt.y );
                }
                else
                    updateServerTimer = setTimeout(updateServerTimerExpired, 500);
            }

            updateServerTimer = setTimeout(updateServerTimerExpired, 500);
        }           
    };

    var zoomed = function() {
        transformGroup1.attr("transform", d3.event.transform);

        var currentScale = d3.zoomTransform( transformGroup1.node() ).k; //do we want to scale 1-10 to 1-5 for fonts and linewidths and dots?
        if (   ( currentScale > (1.1*fontsSizedForScale) )
            || ( currentScale < (0.9*fontsSizedForScale) )
            || ( currentScale == 1 ) || ( currentScale == 8 ) )
        {
            if ( ! fontResizeTimer )
            {
                fontResizeTimer = setTimeout(function () {      
                    fontResizeTimer = null;          
                    fontsSizedForScale = d3.zoomTransform( transformGroup1.node() ).k;
                    //console.log( "Resize for " + fontsSizedForScale);

                    for( var j=0; j< pattern.patternPieces.length; j++ )
                    {
                        var patternPiece = pattern.patternPieces[j];
                
                        for( var i=0; i< patternPiece.drawingObjects.length; i++ )
                        {
                            var a = patternPiece.drawingObjects[i];
                            var g = a.drawingSvg;                            
                            if ( g )
                            {
                                var labelPosition = a.labelPosition();

                                if ( labelPosition )
                                {
                                    g.selectAll( "text" )
                                    .attr("font-size", labelPosition.fontSize + "px")
                                    .attr("x", labelPosition.labelX )
                                    .attr("y", labelPosition.labelY );

                                    g.selectAll( "line.labelLine" )
                                    .attr("x2", labelPosition.labelLineX )
                                    .attr("y2", labelPosition.labelLineY );
                                }
                       
                                g.selectAll( "circle" )
                                .attr("r", Math.round(400 / scale / fontsSizedForScale)/100 );

                                {
                                    var strokeWidth = a.getStrokeWidth( false, (selectedObject==a) );

                                    g.selectAll( "line" )
                                        .attr( "stroke-width", strokeWidth );

                                    g.selectAll( "path" )
                                        .attr( "stroke-width", strokeWidth );            

                                    g.selectAll( "ellipse" )
                                        .attr( "stroke-width", strokeWidth );            
                                }
                            }

                            g = a.outlineSvg;
                            if ( g )
                            {
                                var strokeWidth = a.getStrokeWidth( true );

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

        var transform = d3.zoomIdentity.translate(editorOptions.translateX, editorOptions.translateY).scale(editorOptions.scale);
        var zoom = d3.zoom()
                    .extent([[0, 0], [width, height]])
                    .scaleExtent([0.5, 32])
                    .on("zoom", zoomed);
        svg.call( zoom)
           .call(zoom.transform, transform);

        fontsSizedForScale = editorOptions.scale;

        if ( controls) 
        controls.select( ".zoom-to-fit" ).on( "click", function() 
        {
            d3.event.preventDefault();

            //Reset transformGroup1 to 0,0 and scale 1
            svg.call(zoom)
               .call(zoom.transform, d3.zoomIdentity);
            
            if ( editorOptions.updateServer )
            {
                var zt = d3.zoomTransform( transformGroup1.node() );
                editorOptions.updateServer( zt.k, zt.x, zt.y );
            }
        } );        
    }
}


function doWallpapers( wallpaperGroups, pattern )
{
    var visibleWallpapers = [];
    for( var i=0; i<pattern.wallpapers.length; i++ )
    {
        var w = pattern.wallpapers[i];

        if ( ! w.hide )
            visibleWallpapers.push( w );
    }

    var drag = d3.drag()
        .on("start", function(wallpaper) {
            //var wallpaperG = d3.select(this);
            //if ( ! wallpaper.editable )
            //    return;
            wallpaper.offsetXdragStart = wallpaper.offsetX - d3.event.x;
            wallpaper.offsetYdragStart = wallpaper.offsetY - d3.event.y;
        })
        .on("drag", function(wallpaper) {
            //if ( ! wallpaper.editable )
            //    return;
            var wallpaperG = d3.select(this);        
            wallpaper.offsetX = wallpaper.offsetXdragStart + d3.event.x;
            wallpaper.offsetY = wallpaper.offsetYdragStart + d3.event.y;
            wallpaperG.attr("transform", "translate(" + wallpaper.offsetX + "," + wallpaper.offsetY + ") " + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + " )" );
        })
        .on("end", function(wallpaper){
            wallpaper.updateServer( d3.event );
        });

    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers, function(d){return d.filename} )
                    //.filter(function(w){return !w.hide;})
                    .enter()
                    .append("g")
                    .attr( "class", function(w){ return w.editable ? "wallpaper editable" : "wallpaper" } )
                    .attr("transform", function(wallpaper) { return  "translate(" + ( wallpaper.offsetX ) + "," + ( wallpaper.offsetY ) + ")"
                                                                    + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + ")" } )
                    .append( "image" )
                    //.on( "load", function(w) {
                    //    console.log("d3 image loaded");
                    //})
                    .attr( "href", function(w) { return w.imageurl } )
                    .attr( "opacity", function(w) { return w.opacity } )
                    .each( function(w){
                        //Set this up so that we can later use dimensionsKnown()
                        console.log("** added d3 image and setting w.image width:" + w.width + " height:" + w.height );
                        w.image = this; 
                        //if we know the dimensions already, set them! (Safari needs this on showing a hidden wallpaper)
                        d3.select(this).attr( "width",w.width);
                        d3.select(this).attr( "height",w.height);
                    } );

    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers, function(d){return d.filename} )
                    .exit().remove();

    var resize = d3.drag()
                    .on("start", function(wallpaper) {
                        wallpaper.offsetXdragStart = d3.event.x - wallpaper.width;
                        wallpaper.offsetYdragStart = d3.event.y - wallpaper.height;
                        //console.log("start offsetXdragStart:" + wallpaper.offsetXdragStart );
                    })
                    .on("end", function(wallpaper) {
                        var wallpaperG = d3.select(this.parentNode);
                        var circle = d3.select(this);
                        var rect = wallpaperG.select("rect");
                        var ratio = circle.attr("cx") / wallpaper.width;     
                        var scaleXbefore = wallpaper.scaleX;                   
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
                        var wallpaperG = d3.select(this.parentNode);
                        var circle = d3.select(this);
                        var rect = wallpaperG.select("rect");
                        var newX = d3.event.x - wallpaper.offsetXdragStart;
                        var newY = d3.event.y - wallpaper.offsetYdragStart;
                        //console.log("drag d3.event.x:" + d3.event.x + "  newX:" + newX );
                        if ( true ) //fixed aspect
                        {
                            var ratioX = newX / wallpaper.width;
                            var ratioY = newY / wallpaper.height;
                            var ratio = (ratioX+ratioY)/2.0;
                            newX = ratio * wallpaper.width;
                            newY = ratio * wallpaper.height;
                        }
                        circle.attr("cx", newX )
                                .attr("cy", newY );
                        rect.attr("width", newX )
                            .attr("height", newY );
                    });

    //Add a resizing boundary to each editable wallpaper.                 
    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers,function(d){return d.filename} )
                    //.filter(function(w){return !w.hide;})
                    .each( function(w,i) {
                        var g = d3.select(this);
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
    //resize(wallpaperGroups.selectAll("g > circle"));            
}


function doTable( graphdiv, pattern, editorOptions, contextMenu, focusDrawingObject )
{
    var patternPiece1 = pattern.patternPieces[0];
    var layoutConfig = editorOptions.layoutConfig;
    var margin = layoutConfig.tableMargin;//25; 
    var width =  layoutConfig.tableWidth;//400;
    var height = layoutConfig.tableHeight;//600;
    var minItemHeight = 30; //should not be required
    var itemMargin = 8;
    var itemWidth = width *3/4;
    var ypos = 0;
    var seq = 1; //TODO get these in the XML as data?
    var asFormula = editorOptions.showFormulas; 

    var onclick = function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,false);
    }

    graphdiv.select("div.pattern-table").remove();

    var combinedObjects = [];

    //TODO ? a mode where we don't include measurements and variables in the table.
    if ( pattern.measurement )
    {
        for( var m in pattern.measurement )
            combinedObjects.push( pattern.measurement[m] );
    }

    if ( pattern.variable )
    {
        for( var i in pattern.variable )
            combinedObjects.push( pattern.variable[i] );
    }

    for( var j=0; j< pattern.patternPieces.length; j++ )
    {
        combinedObjects = combinedObjects.concat( pattern.patternPieces[j].drawingObjects);
    }

    var svg = graphdiv.append("div")
                      .attr("class", "pattern-table")
                      .style( "height", height +"px" )    
                      .append("svg")
                      .attr("width", width + ( 2 * margin ) )
                      .attr("height", minItemHeight * combinedObjects.length );    

    var a = svg.selectAll("g");
    a = a.data( combinedObjects );
    a.enter()        
    .append("g")
    .each( function(d,i) {

        var divHeight = function(that) {

            //this - the dom svg element
            //that - the data object

            var h = $(this).find( "div.outer" ).height();
            
            if ( h < minItemHeight )
                return minItemHeight;

            return h;
        };

        var g = d3.select( this );

        var classes = "j-item";

        if ( d.isMeasurement )
            classes += " j-measurement";
        else if ( d.isVariable )
            classes += " j-variable";
        else if ( ! d.isVisible( editorOptions ) ) //is a drawing object
            classes += " group-hidden"; //hidden because of groups

        d.tableSvg = g;
        d.tableSvgX = itemWidth;
        d.tableSvgY = ypos + ( 0.5 * minItemHeight );

        var fo = g.append( "foreignObject" )
        .attr( "x", 0 )
        .attr( "y", function (d) { 
             return ypos;
         } )
         .attr( "width", itemWidth  );

        var html;
        try {
            html = d.html( asFormula );
            if (d.error)
                html += '<div class="error">' + d.error + '</div>';
        } catch ( e ) {
            html = '<div class="error">Failed to generate description.</div>';

            if ( ! d.error )
                d.error = "Failed to generate description.";
        }

        if ( d.error )
            classes += " error";

        g.attr( "class", classes ) ;    

         var div = fo.append( "xhtml:div" )
           .attr("class","outer")
           .append( "xhtml:div" )
           .attr("class","desc")
           .html( html );

        fo.attr( "height", 1 ); //required by firefox otherwise bounding rects returns nonsense
        fo.attr( "height", divHeight );

        g.attr( "height", divHeight )
        .attr( "y", function (d) { 
                                    //Get the height of the foreignObject.
                                    var h = this.childNodes[0].getBoundingClientRect().height;
                                    ypos += h + itemMargin; 
                                    //console.log("y: " + ypos );
                                    return ypos } )

        g.on("contextmenu", contextMenu)
         .on("click", onclick );
    });                   
        
    svg.attr("height", ypos );    

    linksGroup = svg.append("g")
                    .attr("class", "links");

    //Links area is width/4 by ypos.            
    var linkScale = (width/4) / Math.log( Math.abs( ypos /30 ) );   

    drawLinks( pattern, linkScale );
}


function drawLinks( pattern, linkScale ) {
    var linkData = pattern.dependencies.dependencies;
    
    linksGroup.selectAll("path.link") //rename .link to .dependency
                    .data(linkData)
                    .enter().append("path")
                    .attr("class", "link" )
                    .attr("d", function( link ) {
                        var x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
                            x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;
                    
                        var dx = x0 - x1,
                            dy = y0 - y1,
                            l = Math.log( Math.abs(dy /30 ) ) * linkScale;
                    
                        var path = d3.path();
                        path.moveTo( x0, y0 );
                        path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
                        return path;                      
                    } );
}


/*
 * Curve that connects items in the table.
 */
function curve(link) {
    var x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
        x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;

    var dx = x0 - x1,
        dy = y0 - y1,
        l = Math.log( Math.abs(dy /30 ) ) * 50;

    var path = d3.path();
    path.moveTo( x0, y0 );
    path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
    return path;                      
}

//TODO move to kinodbglue
function newkvpSet(noRefresh)
{
    var kvp = { } ;
    kvp.kvps = new Array() ;

    kvp.add = function (k, v)
    {
        this.kvps.push ( {k: k, v: v} ) ;
    } ;

    kvp.toString = function (p)
    {
        var r = '' ;

        for (var i = 0 ; i < this.kvps.length ; i++)
        {
            r += '&' + p + this.kvps[i].k + '=' + this.kvps[i].v ;
        }

        return r ;
    } ;

    if (noRefresh)
        kvp.add("_noRefresh", -1) ;

    return kvp ;
}

//TODO move to kinodbglue
function fakeEvent(location, x, y)
{
    var pXY = {x: 0, y: 0} ;
    
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


export{ PatternDrawing, doDrawing, doTable, drawPattern  };
//(c) Copyright 2019 Jason Dore
//
//Inspired by the excellent Seamly2D/Valentina pattern drawing software.
//This library is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the Seamly2D/Valentina pattern making systen in order to support the community
//pattern sharing website https://my-pattern.cloud/ . 
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

class Expression {

    constructor(data, pattern, patternPiece) {
        this.dataDebug = data;
        //this.operation = data.operation;// ? data.operation : data.operationType ;
        this.pattern = pattern;
        this.patternPiece = patternPiece;

        //divide, multiply etc. and functions too
        if (typeof data.parameter !== "undefined") 
        {
            this.params = data.parameter;
            for (var a = 0; a < this.params.length; a++) {
                var p = this.params[a];
                this.params[a] = new Expression(p, pattern, patternPiece);
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
            else if ( data.variableType === "angleOfLine" )
            {
                this.drawingObject1 = patternPiece.getObject( data.drawingObject1 );
                this.drawingObject2 = patternPiece.getObject( data.drawingObject2 );
                this.function = data.variableType;
                this.value = this.functionValue;
            }
            else if ( data.variableType === "lengthOfLine" )
            {
                this.drawingObject1 = patternPiece.getObject( data.drawingObject1 );
                this.drawingObject2 = patternPiece.getObject( data.drawingObject2 );
                this.function = data.variableType;
                this.value = this.functionValue;
            }
            else if (    ( data.variableType === "lengthOfSplinePath" )
                      || ( data.variableType === "lengthOfSpline" )
                      || ( data.variableType === "angle1OfSpline" )
                      || ( data.variableType === "angle2OfSpline" ) )
            {
                if ( data.drawingObject1 && data.drawingObject2 )
                {
                    //This shouldn't find an object, otherwise we'd have passed it as a single drawingObject.
                    this.drawingObject = patternPiece.getObject( "Spl_" + data.drawingObject1 + "_" + data.drawingObject2 );

                    //at least one of these will be an intersect on a curve, or position along a curve, otherwise they are end points of the curve. 
                    if ( ! this.drawingObject )
                    {
                        this.drawingObject1 = patternPiece.getObject( data.drawingObject1 );
                        this.drawingObject2 = patternPiece.getObject( data.drawingObject2 );
                        //one of these will be a Spline, the other will be an intersection point on it, or distance along it. 

                        //We're not the whole spline, just a segment of it. 

                        var drawingObjectDefiningSpline = (    ( this.drawingObject1.data.objectType === "pointIntersectArcAndAxis" )               
                                                            || ( this.drawingObject1.data.objectType === "pointCutSplinePath" ) 
                                                            || ( this.drawingObject1.data.objectType === "cutSpline" ) ) 
                                                          ? this.drawingObject1
                                                          : this.drawingObject2;

                        if ( drawingObjectDefiningSpline.arc )                             
                            this.splineDrawingObject = drawingObjectDefiningSpline.arc;
                        else if ( drawingObjectDefiningSpline.splinePath )                             
                            this.splineDrawingObject = drawingObjectDefiningSpline.splinePath;
                        else if ( drawingObjectDefiningSpline.curve )                             
                            this.splineDrawingObject = drawingObjectDefiningSpline.curve;
                        else
                            throw "Path not found.";

                        //console.log("Function " + data.variableType + " this.drawingObject1.data.objectType:" + this.drawingObject1.data.objectType + " this.drawingObject2.data.objectType:" + this.drawingObject2.data.objectType + " splineDrawingObject:" + this.splineDrawingObject );

                        //The other drawing object will either be the start or end of this curve, OR another intersect on the same curve. 
                    }
                }
                else
                    //this is the spline drawing object itself, the curve comes directly from it. 
                    this.drawingObject = patternPiece.getObject( data.drawingObject1 );

                if (( data.segment ) && ( parseInt(data.segment) !== 0 ))
                    this.segment = parseInt(data.segment);

                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( data.variableType === "lengthOfArc" )
            {
                this.drawingObject = patternPiece.getObject( data.drawingObject1 );
                this.arcSelection = data.arcSelection;
                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( data.variableType === "radiusOfArc" )
            {
                this.drawingObject = patternPiece.getObject( data.drawingObject1 );

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
                throw "Unsupported variableType:" + data.variableType;
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
        var measurementUnits = this.variable.units;
        var patternUnits = this.pattern.units;
        if ( measurementUnits === patternUnits )
            return this.variable.value();

        var mm = 1;
        if ( measurementUnits === "cm" )
            mm = 10;
        else if ( measurementUnits === "inch" )
            mm = 25.4;

        var pp = mm;

        if ( patternUnits === "cm" )
            pp = mm / 10;
        else if ( patternUnits === "inch" )
            pp = mm / 25.4;

        return pp * this.variable.value();
    }    


    functionValue(currentLength) {
        if ( this.function === "angleOfLine" )
        {
            var point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
            var point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
            var line = new GeoLine( point1, point2 );
            var deg = line.angleDeg();
            if ( deg < 0 )
                deg += 360; 
            return deg;
        }
        else if ( this.function === "lengthOfLine" )
        {
            var point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
            var point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
            var line = new GeoLine( point1, point2 );
            //console.log( "lengthOfLine " + this.drawingObject1.data.name + this.drawingObject2.data.name + " = " + line.getLength() );
            return line.getLength();
        }
        else if (    ( this.function === "lengthOfSplinePath" )
                  || ( this.function === "lengthOfSpline" ) )
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
                 return this.drawingObject.curve.pathLength( this.segment );

            return this.drawingObject.curve.pathLength();
        }
        else if (    ( this.function === "angle1OfSpline" )
                  || ( this.function === "angle2OfSpline" ) )
        {
            var spline;
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

            if ( this.function === "angle1OfSpline" )
                return spline.nodeData[0].outAngle;
            else //angle2OfSpline
                return spline.nodeData[ spline.nodeData.length-1 ].inAngle;
        }
        else if ( this.function === "lengthOfArc" )
        {
            if ( this.arcSelection === "wholeArc")
                return this.drawingObject.arc.pathLength();
            else
            {
                //this.drawingObject is a cut object
                var arcDrawingObject = this.drawingObject.curve ? this.drawingObject.curve : this.drawingObject.arc;

                //where in the arc is this.drawingObject.curve?
                var radiusToIntersectLine = new GeoLine( arcDrawingObject.center.p, this.drawingObject.p );
                var angleToIntersectRad = radiusToIntersectLine.angle;
                if ( this.arcSelection === "beforeArcCut")
                {
                    if ( arcDrawingObject.arc instanceof GeoEllipticalArc )
                    {
                        //else elliptical arc: from the arc's start angle to this cut angle. 
                        const cutArc = arcDrawingObject.arc.clone();
                        cutArc.angle2 = radiusToIntersectLine.angleDeg() - cutArc.rotationAngle;
                        if ( cutArc.angle2 < 0 )
                            cutArc.angle2 += 360;
                        return cutArc.pathLength();
                    }
                    else //if arc
                    {
                        var arcStartAngleRad = arcDrawingObject.angle1.value() / 360 * 2 * Math.PI;
                        var segmentRad = angleToIntersectRad-arcStartAngleRad;                    
                        var length = radiusToIntersectLine.length * segmentRad; //because circumference of a arc is radius * angle (if angle is expressed in radians, where a full circle would be Math.PI*2 )

                        //console.log( "beforeArcCut " + this.drawingObject.data.name + " = " + length );
                        return length;
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
                        return cutArc.pathLength();
                    }
                    else //if arc
                    {
                        var arcEndAngleRad = arcDrawingObject.angle2.value() / 360 * 2 * Math.PI;
                        var segmentRad = arcEndAngleRad - angleToIntersectRad;
                        var length = radiusToIntersectLine.length * segmentRad;
                        return length;
                    }
                }
            }
        }    
        else if ( this.function === "radiusOfArc" )
        {
            if ( this.radiusSelection === 1 )
                return this.drawingObject.radius1.value();
            else if ( this.radiusSelection === 2 )
                return this.drawingObject.radius2.value();
            else
                return this.drawingObject.radius.value();
        }
        else if  ( this.function === "sqrt" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.sqrt( p1 ); 
        }
        else if  ( this.function === "-" )
        {
            var p1 = this.params[0].value(currentLength);
            return -p1; 
        }
        else if ( this.function === "min" )
        {
            var p1 = this.params[0].value(currentLength);
            var p2 = this.params[1].value(currentLength);
            return Math.min( p1, p2 );
        }
        else if ( this.function === "max" )
        {
            var p1 = this.params[0].value(currentLength);
            var p2 = this.params[1].value(currentLength);
            return Math.max( p1, p2 );
        }
        else if ( this.function === "sin" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.sin( p1 * Math.PI / 180 );
        }
        else if ( this.function === "cos" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.cos( p1 * Math.PI / 180 );
        }
        else if ( this.function === "tan" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.tan( p1 * Math.PI / 180 );
        }
        else if ( this.function === "asin" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.asin( p1 ) * 180 / Math.PI;
        }
        else if ( this.function === "acos" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.acos( p1 ) * 180 / Math.PI;
        }
        else if ( this.function === "atan" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.atan( p1 ) * 180 / Math.PI;
        }        
        else throw ("Unknown function: " + this.function );
    }
    

    constantValue() {
        return this.constant;
    }


    operationValue(currentLength) {

        if (typeof this.params[0].value !== "function")
            throw "expression p1 not valid";

        if ( this.operation !== "()" )    
        {
            if (typeof this.params[1].value !== "function")
                throw "expression p2 not valid";
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
            var p1 = this.params[0].value(currentLength);
            var p2 = this.params[1].value(currentLength);
            return Math.pow( p1, p2 );
        }    
        else if (this.operation === "?")
        {
            var conditionTestResult = this.params[0].value(currentLength);
            if ( conditionTestResult )
                return this.params[1].value(currentLength);
            else
                return this.params[2].value(currentLength);
        }


        throw ("Unknown operation: " + this.operation);
    }


    keywordValue(currentLength) {
        if (this.variable === "CurrentLength")
            return currentLength;
        throw ("Unknown keyword: " + this.variable);
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
            if ( this.function === "lengthOfLine" )
                return this.nameWithPopupValue( "lengthOfLine(" + this.drawingObject1.ref() + ", " + this.drawingObject2.ref() + ")" );

            if ( this.function === "angleOfLine" )
                return this.nameWithPopupValue( "angleOfLine(" + this.drawingObject1.ref() + ", " + this.drawingObject2.ref() + ")" );

            if (   ( this.function === "lengthOfSpline" )
                || ( this.function === "lengthOfSplinePath" ) )
            {
                if ( ! this.drawingObject )
                    return this.nameWithPopupValue( this.function + "( curve:" + this.splineDrawingObject.ref() + ", from:" + this.drawingObject1.ref() + ", to:" + this.drawingObject2.ref() + ")" );
                
                return this.nameWithPopupValue( this.function + "(" + this.drawingObject.ref() + (this.segment?", segment:" + this.segment:"") + ")" );
            };

            if (    ( this.function === "angle1OfSpline" )
                 || ( this.function === "angle2OfSpline" ))
            {
                if ( ! this.drawingObject )
                    return this.nameWithPopupValue( this.function + "( curve:" + this.splineDrawingObject.ref() + ", at:" +
                                            ((( this.splineDrawingObject.startPoint == this.drawingObject1 ) || ( this.splineDrawingObject.endPoint == this.drawingObject1 ))
                                            ? this.drawingObject2.ref() : this.drawingObject1.ref() ) + ")" );

                return this.nameWithPopupValue( this.function + "(" + this.drawingObject.ref() + ")" );
            };            

            if ( this.function === "lengthOfArc" )
            {
                if ( ! this.drawingObject )
                    return "lengthOfArc( ??? )";
                
                return this.nameWithPopupValue( "lengthOfArc(" + this.arcSelection + " " + this.drawingObject.ref() + ")" );
            };

            if ( this.function === "radiusOfArc" )
            {
                if ( ! this.drawingObject )
                    return "radiusOfArc( ??? )";
                
                return this.nameWithPopupValue( "radiusOfArc(" + this.drawingObject.ref() + ( this.radiusSelection ? ", radius-" + this.radiusSelection : "" ) + ")" );
            };            

            if ( this.function === "-" )
            {
                return ( "-(" + this.params[0].html( asFormula, currentLength ) + ")" ); 
            }       
            
            if (    ( this.function === "sqrt" )
                 || ( this.function === "sin" )
                 || ( this.function === "cos" )
                 || ( this.function === "tan" ) 
                 || ( this.function === "asin" )
                 || ( this.function === "acos" )
                 || ( this.function === "atan" ) )
            {
                return ( this.function + "(" + this.params[0].html( asFormula, currentLength ) + ")" ); 
            }

            return "UNKNOWN FUNCTION TYPE" + this.function;
        }

        if ( this.operation === "?" )
        {
            return this.params[0].html( asFormula, currentLength ) + " ? " +
                   this.params[1].html( asFormula, currentLength ) + " : " +
                   this.params[2].html( asFormula, currentLength );
        }
        else if ( this.operation ) 
        {
            var useOperatorNotation = false;
            var precedence = 0;

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

            var t = ( useOperatorNotation || this.operation === "()" ? "" : this.operation );
            
            var useParenthesis = ( ( this.operation === "()" ) || ( precedence < parentPrecedence ) || (!useOperatorNotation) );

            if ( useParenthesis )
                t += "(";

            var first = true;
            for ( var p in this.params )
            {
                if ( ! first )
                {
                    if ( useOperatorNotation )
                        t += useOperatorNotation;
                    else
                        t += ",";
                }
                t += this.params[p].html( asFormula, currentLength, precedence );
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
            for (var a = 0; a < this.params.length; a++) {
                var p = this.params[a];
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

    adjust(p) {

        if (!p)
            return; //e.g. an error

        this.adjustToIncludeXY( p.x, p.y );
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

    adjustForLine(line) {

        if (!line)
            return;

        this.adjust(line.p1);
        this.adjust(line.p2);
    }

    diagonaglLength() {

        var deltaX = ( this.maxX - this.minX );
        var deltaY = ( this.maxY - this.minY );
    
        return Math.sqrt( Math.pow(deltaX,2) + Math.pow(deltaY,2) );
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

//import { Intersection, Point2D, ShapeInfo } from 'kld-intersections/dist/index-esm.js';
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

    //https://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes F.6.4 Conversion from center to endpoint parameterization
    //Hashed together from https://stackoverflow.com/questions/30277646/svg-convert-arcs-to-cubic-bezier and https://github.com/BigBadaboom/androidsvg/blob/5db71ef0007b41644258c1f139f941017aef7de3/androidsvg/src/main/java/com/caverock/androidsvg/utils/SVGAndroidRenderer.java#L2889
    asGeoSpline() {

        var angleStartRad = this.angle1 / 360.0 * 2.0 * Math.PI;
        var angleEndRad = this.angle2 / 360.0 * 2.0 * Math.PI;
        var angleExtentRad = angleEndRad - angleStartRad;
        var numSegments =  Math.ceil( Math.abs(angleExtentRad) * 2.0 / Math.PI); 
        var angleIncrement = angleExtentRad / numSegments;

        var controlLength = 4.0 / 3.0 * Math.sin(angleIncrement / 2.0) / (1.0 + Math.cos(angleIncrement / 2.0));

        var nodeData = [];

        var node = {};
        nodeData.push( node );

        for (var i=0; i<numSegments; i++)
        {
            var angle = angleStartRad + i * angleIncrement;

            var dx = Math.cos(angle) * this.radius;
            var dy = Math.sin(angle) * this.radius;

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
        var radius  = this.radius;
        var h       = new GeoLine( this.center, pointOnTangent );
        var hLength = h.length;
        var angle   = Math.acos( radius/hLength ); //Would be an error if hLength < radius, as this means pointOnTangent is within the circle. 
        var totalAngleR;

        var tangentTouchPoints = [ this.center.pointAtDistanceAndAngleRad( radius, h.angle - angle ),
                                   this.center.pointAtDistanceAndAngleRad( radius, h.angle + angle ) ];        
        
        return tangentTouchPoints;
    }


    svgPath() {

        //TODO if this is a full circle we should really generate an svg circle rather than using a path

        var arcPath = d3.path();

        //arcPath.arc( this.center.x, this.center.y, 
        //             this.radius, 
        //             -this.angle1 * Math.PI / 180, -this.angle2 * Math.PI / 180, true );        

        var a2 = this.angle2;

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
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        if ( length > path.getTotalLength() )
            length = path.getTotalLength();
        var p = path.getPointAtLength( length );
        //console.log(p);      
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

        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var l = path.getTotalLength();
        var p = path.getPointAtLength( l * fraction );
        //console.log(p);      
        return new GeoPoint( p.x, p.y );
    }         
    
    
    pathLength() {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }             


    asShapeInfo() {  
        if (( this.angle1 == 0 ) && ( this.angle2 == 360 ))
            return ShapeInfo.circle( this.center.x, this.center.y, this.radius );

        //ShapeInfo angles seem to go clockwise from East, rather than our anti-clickwise angles
        var angle1 = 360-this.angle2;
        var angle2 = 360-this.angle1;

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
        var center2 = pointTransformer( this.center );

        //s = the point on the arc that we start drawing
        var s = this.center.pointAtDistanceAndAngleDeg( this.radius, this.angle1 );
        var s2 = pointTransformer( s );
        var s2line = new GeoLine( center2, s2 );
        var startAngle2 = s2line.angleDeg();

        //f = the point on the arc that we finish drawing
        var f = this.center.pointAtDistanceAndAngleDeg( this.radius, this.angle2 );
        var f2 = pointTransformer( f );
        var f2line = new GeoLine( center2, f2 );
        var finishAngle2 = f2line.angleDeg();

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

//import { Intersection, Point2D, ShapeInfo } from 'kld-intersections/dist/index-esm.js';

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
        const { abs, sin, cos } = Math;
        
        //https://en.wikipedia.org/wiki/Ellipse#Polar_form_relative_to_focus
        const radius=   ( rx * ry )
                      / Math.sqrt( Math.pow( rx * Math.sin( theta ),2 ) + Math.pow( ry * Math.cos( theta ), 2 ) ); 

        const M = radius * cos(theta),
              N = radius * sin(theta);  

        return { x: cx + cos(phi) * M - sin(phi) * N,
                 y: cy + sin(phi) * M + cos(phi) * N };
     }


    //TODO based on SVG book, but corrected
    centeredToSVG( cx, cy, rx, ry, thetaDeg/*arcStart*/, deltaDeg/*arcExtent*/, phiDeg/*x axis rotation*/ ) {
        var theta, endTheta, phiRad;
        var largeArc, sweep;
        theta = thetaDeg * Math.PI / 180;
        endTheta = ( thetaDeg + deltaDeg ) * Math.PI / 180;
        phiRad = phiDeg * Math.PI / 180;

        //console.log( "centeredToSVG thetaDeg: " + thetaDeg );
        //console.log( "centeredToSVG deltaDeg: " + deltaDeg );
        //console.log( "centeredToSVG endThetaDeg: " + ( thetaDeg + deltaDeg ) );
        //console.log( "centeredToSVG endTheta: " + endTheta );

        var start = this.getEllipsePointForAngle(cx, cy, rx, ry, phiRad, theta);
        var end = this.getEllipsePointForAngle(cx, cy, rx, ry, phiRad, endTheta);

        //console.log( "3. centeredToSVG x0,y0: " + x0 + "," + y0 );
        //console.log( "3. centeredToSVG x1,y1: " + x1 + "," + y1 );

        largeArc = ( deltaDeg > 180 ) || ( deltaDeg < -180 ) ? 1 : 0;
        sweep = ( deltaDeg > 0 ) ? 0 : 1;
         
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
        if (    ( this.angle1 === 0 ) 
             && ( this.angle2 === 360 ) )
            return true;

        return false;
    }


    svgPath() {
        // 90->180   -90 -> -180     -90,-90
        // 0->90   -0 +-90



        var d2 = this.centeredToSVG( this.center.x, this.center.y, this.radius1, this.radius2, 360-(this.angle1), -(this.angle2 - this.angle1), -this.rotationAngle );
        var path = "M" + d2.x + "," + d2.y;
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

        var svgPath = this.svgPath();
        //console.log( "EllipticalArc.asShapeInfo() this might not work for intersections... " + svgPath );
        return ShapeInfo.path( svgPath );
    }
    

    asGeoSpline() {

        //Un-rotate this if it is rotated
        if ( this.rotationAngle !== 0 )
        {
            var center = this.center;
            var rotationAngle = this.rotationAngle;
            var unrotator = function( p ) {
                return p.rotate( center, -rotationAngle );
            };
            var unrotatedArc = this.applyOperation( unrotator );

            var unrotatedSplines = unrotatedArc.asGeoSpline();

            var rerotator = function( p ) {
                return p.rotate( center, rotationAngle );
            };

            return unrotatedSplines.applyOperation( rerotator );
        }

        //We won't be a rotated elipse. 

        var angleStartRad = this.angle1 / 360.0 * 2.0 * Math.PI;
        var angleEndRad = this.angle2 / 360.0 * 2.0 * Math.PI;
        var angleExtentRad = angleEndRad - angleStartRad;
        var numSegments =  Math.ceil( Math.abs(angleExtentRad) * 2.0 / Math.PI); 
        var angleIncrement = angleExtentRad / numSegments;

        var controlLength = 4.0 / 3.0 * Math.sin(angleIncrement / 2.0) / (1.0 + Math.cos(angleIncrement / 2.0));

        var nodeData = [];

        var node = {};
        nodeData.push( node );

        for (var i=0; i<numSegments; i++)
        {
            var angle = angleStartRad + i * angleIncrement;

            var dxr1 = Math.cos(angle) * this.radius1;
            var dxr2 = Math.cos(angle) * this.radius2;
            var dyr1 = Math.sin(angle) * this.radius1;
            var dyr2 = Math.sin(angle) * this.radius2;

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
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var l = path.getTotalLength();
        var p = path.getPointAtLength( l * fraction );
        //console.log(p);      
        return new GeoPoint( p.x, p.y );
    }       


    pointAlongPath( length ) {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var p = path.getPointAtLength( length );
        //console.log(p);      
        return new GeoPoint( p.x, p.y );
    }       


    pathLength() {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }             


    applyOperation( pointTransformer ) { //apply a operationFlip or operationRotate to this GeoEllipticalArc

        var center2 = pointTransformer( this.center );

        //Converted start and finishing angles are calculated identically to a circle
        //It doesn't matter from this perspective whether we use radius1 or radius2

        //s = the point on the arc that we start drawing
        var s = this.center.pointAtDistanceAndAngleDeg( this.radius1, this.angle1 + this.rotationAngle );
        var s2 = pointTransformer( s );
        var s2line = new GeoLine( center2, s2 );
        var startAngle2 = s2line.angleDeg();

        //f = the point on the arc that we finish drawing
        var f = this.center.pointAtDistanceAndAngleDeg( this.radius1, this.angle2 + this.rotationAngle );
        var f2 = pointTransformer( f );
        var f2line = new GeoLine( center2, f2 );
        var finishAngle2 = f2line.angleDeg();

        //don't abritrarily convert 360 to 0. 
        if (( finishAngle2 === 0 ) && ( this.angle2 === 360 ))
            finishAngle2 = 360;

        if (( startAngle2 === 0 ) && ( this.angle1 === 360 ))
            startAngle2 = 360;

        //Is this a good enough test?
        var isFlip = ( this.angle1 < this.angle2 ) != ( startAngle2 < finishAngle2 );

        //This is an ellipse, so we also need to adjust the ellipse rotation. 
        var r = this.center.pointAtDistanceAndAngleDeg( this.radius1, this.rotationAngle );
        var r2 = pointTransformer( r );
        var r2line = new GeoLine( center2, r2 );
        var rotationAngle2 = r2line.angleDeg() + ( isFlip ? 180 : 0 );

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

//import { Intersection, Point2D, ShapeInfo } from 'kld-intersections/dist/index-esm.js';


//A line
class GeoLine {

    //p1;
    //p2;

    constructor( p1, p2 ) {

        if ( ! p1 )
            throw "GeoLine p1 not defined.";

        if ( ! p2 )
            throw "GeoLine p2 not defined.";

        this.p1 = p1;//new GeoPoint( x1, y1 );
        this.p2 = p2;//new GeoPoint( x2, y2 );
    
        this.deltaX = ( this.p2.x - this.p1.x ); //nb. +ve to the east from p1 to p2
        this.deltaY = ( this.p2.y - this.p1.y ); //nb +ve to the south from p1 to p2
    
        this.length = Math.sqrt( Math.pow(this.deltaX,2) + Math.pow(this.deltaY,2) );

        //angle is anti-clockwise starting east in radians
        this.angle = Math.atan2( -this.deltaY, this.deltaX );

        if ( this.angle < 0 )
            this.angle = this.angle + (2 * Math.PI);          
    
        //alert( "Line angle:" + this.angle + " (" + ( this.angle / (2*Math.PI) * 360) + "deg anti clockwise from east" );
    
        this.slope  = ( this.deltaY / this.deltaX );
        this.offset = this.p1.y - ( this.p1.x * this.slope ); //the y values where x = 0; the intersection of the line with the y-axis
        //this line is generically: y = offset + ( x * slope )
    }

    //Return a GeoPoint for the intersection of this line with line2. 
    intersect( line2 ) {    
        //intersection
        //  // offset - line2.offset / ( line2.slope - slope ) = x

        var swap = Math.abs( this.deltaX ) > Math.abs( line2.deltaX );
        var line1s = swap ? this : line2; //this.p1.x < this.p2.x ? this : new GeoLine( this.p2, this.p1 );
        var line2s = swap ? line2 : this; //line2.p1.x < line2.p2.x ? line2 : new GeoLine( line2.p2, line2.p1 );

        var x, y;

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
        if (    ( arc.angle1 < 0 ) 
             && ( arc.angle2 > 0 ) 
             && ( arc instanceof GeoArc ) ) //not an elliptical
        {
            try { 
                var arc1 = new GeoArc( arc.center, arc.radius, 0, arc.angle2 );
                return this.intersectArc( arc1 );
            } catch ( e ) {
                var arc2 = new GeoArc( arc.center, arc.radius, arc.angle1 + 360, 360 );
                return this.intersectArc( arc2 );
            }
        }
        if (    ( arc.angle1 < 360 ) 
             && ( arc.angle2 > 360 ) 
             && ( arc instanceof GeoArc ) ) //not an elliptical
        {
            try { 
                var arc1 = new GeoArc( arc.center, arc.radius, 0, arc.angle2 -360 );
                return this.intersectArc( arc1 );
            } catch ( e ) {
                var arc2 = new GeoArc( arc.center, arc.radius, arc.angle1, 360 );
                return this.intersectArc( arc2 );
            }
        }

        var arcSI,lineSI;

        //nb there is a special case for GeoEllipticalArc where this.p1 == arc.center in 
        //which case a simple formula gives the intersect.

        if (( arc instanceof GeoEllipticalArc ) && ( arc.rotationAngle !== 0 ))
        {            
            //console.log("elliptical arc ");
            
            //create an equivalent arc that is not rotated.
            //create a new line, rotate the startpoint by -rotationAngle, the new lines angle should also be less by -rotationAngle
            //finally rotate the intersect point back
            var nrArc = new GeoEllipticalArc( arc.center,
                                              arc.radius1,
                                              arc.radius2, 
                                              arc.angle1, 
                                              arc.angle2,
                                              0 );
            var p1rotated = this.p1.rotate( arc.center, -arc.rotationAngle );
            //var p2rotated = this.p2.rotate( arc.center, -arc.rotationAngle );
            var bounds = new Bounds();
            bounds.adjust( p1rotated );
            arc.adjustBounds( bounds );
            maxLineLength = bounds.diagonaglLength() * 1.25;
            var lineRotated = new GeoLine( p1rotated, p1rotated.pointAtDistanceAndAngleDeg( maxLineLength/*infinite*/, (this.angleDeg() - arc.rotationAngle) ) );     
            //var lineRotated = new GeoLine( p1rotated, p2rotated );
            lineSI = lineRotated.asShapeInfo();
            arcSI = nrArc.asShapeInfo();
            
            //var extendedLine = new GeoLine( lineRotated.p1.pointAtDistanceAndAngleRad( -1000/*infinite*/, lineRotated.angle ), lineRotated.p2 );
            //lineSI = extendedLine.asShapeInfo();    
        }
        else
        {
            var bounds = new Bounds();
            bounds.adjust( this.p1 );
            //bounds.adjust( this.p2 );
            arc.adjustBounds( bounds );
            var maxLineLength = bounds.diagonaglLength() * 1.25;
            
            //This should be sufficient, extend our line forward enough that it should intersect...
            //var extendedLine = new GeoLine( this.p1, this.p1.pointAtDistanceAndAngleRad( maxLineLength*10, this.angle ));

            //Ensure that the line is long enough to intersect. 
            //var extendedLine = new GeoLine(  this.p1.pointAtDistanceAndAngleRad( -maxLineLength, this.angle ), this.p1.pointAtDistanceAndAngleRad( maxLineLength, this.angle ));  
            var extendedLine = new GeoLine( this.p1, this.p1.pointAtDistanceAndAngleRad( maxLineLength, this.angle ));  

            arcSI = arc.asShapeInfo();
            lineSI = extendedLine.asShapeInfo();    
        }
    
        var intersections = Intersection.intersect(arcSI, lineSI);
        
        //console.log( "Intersections:" );
        //intersections.points.forEach(console.log);    

        if ( intersections.points.length === 0 )
        { 
            if ( ! alreadyTweaked )
            {
                //console.log( "Failed for angle ", this.angle );
                //console.log( "PI:", this.angle/Math.PI );
                var lineTweaked = new GeoLine( this.p1, this.p1.pointAtDistanceAndAngleRad( this.length, this.angle + (Math.PI/180 * 0.0000000001) )); //Adding a billionth of a degree fixes the broken intersection issue.
                return lineTweaked.intersectArc( arc, true );
            }
            throw "No intersection with arc. ";
        }

        var whichPoint = 0;
        if ( intersections.points.length > 1 )//-1;//0; //0 for G1 in headpattern. //intersections.points.length -1; //TODO do this properly
        {            
            if ( false )
            {
                //choose the point with the smallest angle. 
                var smallestAngle = 361;
                for (var i = 0; i < intersections.points.length; i++) 
                {
                    var pi = intersections.points[i];
                    var p1pi = new GeoLine( arc.center, pi );
                    console.log( i + " " + p1pi.angleDeg() );
                    if ( p1pi.angleDeg() < smallestAngle )
                    {
                        smallestAngle = p1pi.angleDeg();
                        whichPoint = i;
                    }
                }
            }
            else
            {
                //choose the first point we get to along the line. 
                var smallestDistance = undefined;
                for (var i = 0; i < intersections.points.length; i++) 
                {
                    var pi = intersections.points[i];
                    var p1pi = new GeoLine( this.p1, pi );
                    //console.log( i + " " + p1pi.length );
                    if (    ( smallestDistance === undefined ) 
                         || (    ( Math.abs( p1pi.angle - this.angle ) < 0.0001 ) //rather than 180 deg the other way (allowing for rounding errors)
                              && ( p1pi.length < smallestDistance ) ) )
                    {
                        smallestDistance = p1pi.length;
                        whichPoint = i;
                    }
                }            
            }
        }

        var intersect = new GeoPoint( intersections.points[whichPoint].x, intersections.points[whichPoint].y );

        if (( arc instanceof GeoEllipticalArc ) && ( arc.rotationAngle !== 0 ))
        {
            intersect = intersect.rotate( arc.center, +arc.rotationAngle );
        }

        return intersect;
    }


    //Return a GeoLine having applied the operationFlip or operationRotate to this GeoLine.
    applyOperation( pointTransformer ) {
        var p1Transformed = pointTransformer( this.p1 );
        var p2Transformed =  pointTransformer( this.p2 );
        return new GeoLine( p1Transformed, p2Transformed );
    }    


    asShapeInfo() {
        return ShapeInfo.line( this.p1.x, this.p1.y, this.p2.x, this.p2.y );
    }


    angleDeg() {
        /*
        var deltaX = (this.p2.x - this.p1.x);
        var deltaY = -1 * (this.p2.y - this.p1.y); //-1 because SVG has y going downwards

        //if ( deltaX === 0 )
        //    return deltaY > 0 ? 90 : 270;

        return Math.atan2( deltaY, deltaX ) * 180 / Math.PI;
        */
       return this.angle * 180 / Math.PI;
    }


    angleRad() {
        return this.angle;
    }


    getLength() {
        return this.length;
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

//import { Intersection, Point2D, ShapeInfo } from 'kld-intersections/dist/index-esm.js';

//A point
class GeoPoint {

    //x;
    //y;

    constructor( x, y ) {
        this.x = x;
        this.y = y;

        if ( isNaN( this.x ) )
            throw "GeoPoint x not a number.";
            
        if ( isNaN( this.y ) )
            throw "GeoPoint y not a number.";
    }

    line( point2 ) {    
        throw "this looks broken, two params, not four";
        return new GeoLine( this.x, this.y, point2.x, point2.y );
    }


    pointAtDistanceAndAngleRad( length, angle /*radians anti-clockwise from east*/ ) {        
        var x = this.x + length * Math.cos( -1 * angle ); //TODO this is a guess!
        var y = this.y + length * Math.sin( -1 * angle );   
        return new GeoPoint( x, y );
    }


    pointAtDistanceAndAngleDeg( length, angle /*deg anti-clockwise from east*/ ) {        
        return this.pointAtDistanceAndAngleRad( length, angle * Math.PI / 180 );
    }


    rotate( center, rotateAngleDeg ) {
        //Convert degrees to radians
        
        var centerToSourceLine = new GeoLine( center, this );
        var distance = centerToSourceLine.getLength();
        var angle = centerToSourceLine.angleDeg() + rotateAngleDeg;

        var result = center.pointAtDistanceAndAngleDeg( distance, angle );
        return result;
    }


    asPoint2D() {
        return new Point2D( this.x, this.y );
    }


    equals( p )
    {
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

//import { Intersection, Point2D, ShapeInfo } from 'kld-intersections/dist/index-esm.js';






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

        for( var i in this.nodeData )
        {
            var n = this.nodeData[i];

            if (( ! n.outControlPoint ) && ( typeof n.outAngle === "number" ) && ( typeof n.outLength === "number" ))
                n.outControlPoint = n.point.pointAtDistanceAndAngleDeg( n.outLength, n.outAngle );

            if (( ! n.inControlPoint ) && ( typeof n.inAngle === "number" ) && ( typeof n.inLength === "number" ))
                n.inControlPoint = n.point.pointAtDistanceAndAngleDeg( n.inLength, n.inAngle );
        }
    }


    applyOperation( pointTransformer ) { //apply a operationFlip or operationRotate to this GeoSpline
        var nodeData = [];
        for ( var i=0; i<this.nodeData.length; i++ )
        {
            var node = this.nodeData[i];

            //Need a control point, not a length and angle. 
            var inPoint = node.inControlPoint;
            var outPoint = node.outControlPoint;
            
            if ( ( ! inPoint ) && ( node.inLength !== undefined ) )            
                inPoint = node.point.pointAtDistanceAndAngleDeg( node.inLength, node.inAngle );

            if ( ( ! outPoint ) && ( node.outLength !== undefined ) )
                outPoint = node.point.pointAtDistanceAndAngleDeg( node.outLength, node.outAngle );
    
            var inPointTransformed = inPoint === undefined ? undefined : pointTransformer( inPoint );
            var outPointTransformed =  outPoint === undefined ? undefined : pointTransformer( outPoint );

            nodeData.push( {inControlPoint:   inPointTransformed,
                            point:            pointTransformer( node.point ),
                            outControlPoint:  outPointTransformed } ) ;
        }
        return new GeoSpline( nodeData );
    }


    svgPath( continuePath ) {
        var nodeData = this.nodeData;
        var path = continuePath ? continuePath : "";
        for ( var i=0; i<nodeData.length; i++ )
        {
            if ( i===0 )
            {
                path+= ( continuePath ? "L" : "M" ) + Math.round( nodeData[i].point.x *1000 )/1000 + "," + Math.round( this.nodeData[i].point.y *1000)/1000 ;
            }
            else
            {
                var controlPoint1 = ( typeof nodeData[i-1].outControlPoint !== "undefined" ) ? nodeData[i-1].outControlPoint
                                                                                             : nodeData[i-1].point.pointAtDistanceAndAngleDeg( nodeData[i-1].outLength, nodeData[i-1].outAngle );

                var controlPoint2 = ( typeof nodeData[i].inControlPoint !== "undefined" ) ? nodeData[i].inControlPoint
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
        var len = this.nodeData.length;
        var revNodeData = [len];
        for ( var i=0; i<len; i++ )
        {
            var node = this.nodeData[i];

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

        if ( fraction == 100 )
            return this.nodeData[ this.nodeData.length-1 ].point;

        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var l = path.getTotalLength();
        var p = path.getPointAtLength( l * fraction );

        //Note, we cannot, even if a single segment use this.getPointForT() because
        //length is not linear with t.
        //
        //If we want to do the calculation ourselves it will by treating the curve
        //as 50 or so little lines using this.getPointForT() and using the length of
        //those lines. 

        return new GeoPoint( p.x, p.y );
    }       


    pointAlongPath( length ) {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var xy = path.getPointAtLength( length );    
        var p = new GeoPoint( xy.x, xy.y );

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
            var t = this.findTForPoint( p );

            if ( t === undefined )
                console.log("ERROR: Result of pointAlongPath() is not on path?" );
        }
        else
        {
            var cut = this.cutAtPoint( p );
            if ( cut === undefined )
                console.log("ERROR: Result of pointAlongPath() is not on path?" );
        }

        return p;
    }


    pathLengthAtPoint( p ) {
        //do a binary search on the length of the curve to find out best % along curve that is our intersection point. 

        var firstNode = this.nodeData[0].point;
        if (    ( p.x === firstNode.x )
             && ( p.y === firstNode.y ) )
             return 0;

        var lastNode = this.nodeData[ this.nodeData.length -1 ].point;
        if (    ( p.x === lastNode.x )
             && ( p.y === lastNode.y ) )
             return this.pathLength();

        var cutSpline = this.cutAtPoint( p ).beforePoint;

        return cutSpline.pathLength();
    }

    findTForPoint(p) {
        //only where nodeData.length == 2
        //sometimes we're testing whether point p is on the arc. 

        if ( this.nodeData.length !== 2 )
            throw "findTForPoint() only supported for individual segments";

        //We could do this for each segnment and instantly dismiss any segment where p not in the box bounded by
        //the polygon nodeDate[0].point, nodeData[0].outControlPoint, nodeData[1].inControlPoint, nodeData[1].point. 

        //TODO special handing for where p is either nodeData[0 or 1].point return 0 or 1
        //if ( )

        //TODO we can shortcut and return undefined if p is outside the binding box


        var minT = 0.0,
            maxT = 1.0,
            iter = 0,
            threshold = this.pathLength() / 1000;

        while( iter < 20 ) { //after 20 iterations the interval will be tiny
            iter++;
            var closestT = null;
            var closestDistance = undefined;
            var interval = (maxT - minT)/4; //0.25 first time around.
            for( var t = minT; t<=maxT; t+= interval ) //five iterations the first time, 0, 0.25, 0.5, 0.75, 1.0
            {
                var pt = this.getPointForT( t );
                var d = Math.sqrt( Math.pow( pt.x - p.x, 2) + Math.pow( pt.y - p.y, 2) );
                if (( closestDistance === undefined ) || ( d < closestDistance ))
                {
                    closestT = t;
                    closestDistance = d;
                }

                if (( d === 0 ) || ( d < threshold )) 
                {
                    //console.log( "i:" + iter + " t:" + t + " d:" + d + " FOUND" );
                    if (( t > 1 ) || ( t < 0 ))
                        return undefined; //they are probably on another segment

                    return t;
                }

            }
            minT = closestT - interval; //So at the end of iteration 1 we'll be setting up a span next time that is 0.5 wide, which we'll cut into five slots 
            maxT = closestT + interval;
            //console.log( "i:" + iter + " minT:" + minT + " maxT:" + maxT + " closestT:" + closestT + " threshold:" + threshold + " closestDistance: " + closestDistance  );
        }
        //console.log("Point not on curve." );
        return undefined;
    }

    pathSegment( segment ) {
        if ( ! segment )
            return this;

        //Create a shorter path
        var startNode = this.nodeData[ segment -1 ];
        var endNode = this.nodeData[ segment ];
        var shorterPath = new GeoSpline( [ startNode, endNode ] );
        return shorterPath;
    }

    pathLength( segment ) {

        if ( segment ) {
            return this.pathSegment(segment).pathLength();
        }

        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }


    splineBetweenPoints( p1, p2 )
    {
        var c1 = this.cutAtPoint( p1 );
        var c2 = this.cutAtPoint( p2 );

        if ( c1 === undefined )
            throw "p1 is not on spline;"

        if ( c2 === undefined )
            throw "p2 is not on spline;"

        //For each segment, determine t for each of p1 and p2
        //the first one we find is the first point. 
        
        //TODO this can be optimised here. 

        //We can avoid the more expensive pathLength() if we can see that one of 
        //the points is in an earlier segment. 
        var s1 = c1.beforePoint == null ? 0 : c1.beforePoint.nodeData.length;
        var s2 = c2.beforePoint == null ? 0 : c2.beforePoint.nodeData.length;
        var swap = s1 > s2;

        if ( s1 == s2 )
        {
            //nb we have seen the pathLength() not produce a correct result.  Returns >3000 when this.pathLength = 60.  
            var d1 = c1.beforePoint == null ? 0 : c1.beforePoint.pathLength();
            var d2 = c2.beforePoint == null ? 0 : c2.beforePoint.pathLength();
            swap = d1 > d2;
        }

        if ( swap )
        {
            var t = p2;
            p2 = p1;
            p1 = t;
            c1 = c2;
        }

        var cut1 = c1;
        var splineAfterPoint = cut1.afterPoint;
        var c3 = splineAfterPoint.cutAtPoint( p2 );
        if ( ! c3 )
            console.log("c3 not found"); //this is odd because c1 and c2 were found
        var cut2 = c3 ? c3.beforePoint : splineAfterPoint;
        return cut2;
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

        var points = [ this.nodeData[0].point, this.nodeData[0].outControlPoint, this.nodeData[1].inControlPoint, this.nodeData[1].point ];
        var strutPoints = [];

        for( var i=0; i<points.length; i++ )
            strutPoints.push( points[i] );

        while( points.length > 1 )
        {
            var newPoints = [];
            for( var i=0; i<points.length-1; i++ )
            {
                if ( points[i+1] === undefined  )
                    console.log("how?");

                var newPoint = new GeoPoint( (1-t) * points[i].x + t * points[i+1].x,
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

        var nodesBeforeCut = [],
            nodesAfterCut = [];

        var cutMade = false;
        for( var i=0; i<nodeData.length; i++ )
        {
            var n1 = nodeData[i];
            var n2 = i+1 < nodeData.length ? nodeData[i+1] : null;

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
            else if ( n2.point.equals(p) )
            {
                cutMade = true;
                nodesBeforeCut.push( n1 );
                nodesBeforeCut.push( n2 );
            }
            else
            {
                var segment = this.pathSegment( i+1 );
                var tWithinSegment = segment.findTForPoint(p);           
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
                    var pointLiesInThisSegment = tWithinSegment !== undefined;

                    if ( ! pointLiesInThisSegment )
                    {
                        if ( ! cutMade )
                            nodesBeforeCut.push(n1);

                        if ( cutMade )
                            nodesAfterCut.push(n1);
                    }
                    else //pointLiesInThisSegment
                    {
                        var splits = segment.cutAtPoint( p );

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
            var inControlPointLine = new GeoLine( point, inControlPoint );
            c.inAngle = inControlPointLine.angleDeg();
            c.inLength = inControlPointLine.getLength();
        }
        if ( outControlPoint )
        {
            var outControlPointLine = new GeoLine( point, outControlPoint );    
            c.outAngle = outControlPointLine.angleDeg();
            c.outLength = outControlPointLine.getLength();
        }

        return c;
    }    


    adjustBounds( bounds ) {

        //It won't be a perfectly tight bounding box, but 
        //it should be ample to encompass the spline loosely. 
        
        for ( var i=0; i<this.nodeData.length; i++ )
        {
            var node = this.nodeData[i];

            bounds.adjust( node.point );

            if ( node.inControlPoint )
                bounds.adjust( node.inControlPoint );

            if ( node.outControlPoint )
                bounds.adjust( node.outControlPoint );
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
        var n = this.nodeData[ i ];
        var inControlPoint = n.inControlPoint;
        var outControlPoint = n.outControlPoint;
        var directionLine;

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
        var n = this.nodeData[ i ];
        var inControlPoint = n.inControlPoint;
        var outControlPoint = n.outControlPoint;
        var directionLine;

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
        var s = "GeoSpline[ ";
        for ( var i=0; i<this.nodeData.length; i++ )
        {
            var node = this.nodeData[i];

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


    parallelCurve( sa )
    {
        if ( sa === 0 )
        {
            return { baseCurve: this, offsetCurve: this }; 
        }

        var newNodeData = [];
        var len = this.nodeData.length;
        var prevNode;
        var prevNewNode;
        for ( var i=0; i<len; i++ )
        {
            var node = this.nodeData[i];

            var newNode = {};
            newNodeData[i] = newNode;
            var tangentAfterDeg = this.angleLeavingNode(i) + 90; //TODO we could allow for pointy nodes by using angleArrivingNode for the inControlPoint
            if ( tangentAfterDeg > 360 )
                tangentAfterDeg -= 360;

            var tangentBeforeDeg = tangentAfterDeg; //TODO determine this separately?

            newNode.point = node.point.pointAtDistanceAndAngleDeg( sa, tangentAfterDeg );
            if ( node.inControlPoint )
                newNode.inControlPoint = node.inControlPoint.pointAtDistanceAndAngleDeg( sa, tangentBeforeDeg );
            if ( node.outControlPoint )
                newNode.outControlPoint = node.outControlPoint.pointAtDistanceAndAngleDeg( sa, tangentAfterDeg );

            if ( prevNode )
            {
                //We can do slightly better still, for each step/simplespline how much bigger is the new curve (distance between start/end nodes), 
                //and scale the length of the control points accordingly. 
                var distance = (new GeoLine( prevNode.point, node.point )).getLength();
                var offsetDistance = (new GeoLine( prevNewNode.point, newNode.point )).getLength();
                if ( ( distance > 0 ) && ( offsetDistance > 0) && ( distance != offsetDistance ) )
                {
                    var extension = offsetDistance / distance; //nb this could be <0 or >0.
                    if ( Math.abs(extension) > 0.001 )
                    {
                        //console.log( (extension>1 ? "Extending" : "Reducing" ) + " the control point lengths to " + (Math.round( extension * 1000)/10) + "%" );
                        var outControlPointLine = new GeoLine( prevNewNode.point, prevNewNode.outControlPoint );
                        prevNewNode.outAngle = outControlPointLine.angleDeg();
                        prevNewNode.outLength = outControlPointLine.getLength() * extension;
                        prevNewNode.outControlPoint = prevNewNode.point.pointAtDistanceAndAngleDeg( prevNewNode.outLength, prevNewNode.outAngle );
                        var inControlPointLine = new GeoLine( newNode.point, newNode.inControlPoint );
                        newNode.inAngle = inControlPointLine.angleDeg();
                        newNode.inLength = inControlPointLine.getLength() * extension;                        
                        newNode.inControlPoint = newNode.point.pointAtDistanceAndAngleDeg( newNode.inLength, newNode.inAngle );
                    }
                }
            }

            prevNode = node;
            prevNewNode = newNode;
        }
        var offsetCurve = new GeoSpline( newNodeData );

        var newNodeData = [];
        var c1, c2, c3;
        for ( var i=1; i<len; i++ )
        {
            var prevNode = this.nodeData[i-1];
            var node = this.nodeData[i];
            var thisSegmentAsGeoSpline = new GeoSpline( [ prevNode, node ] );
            var offsetSegmentAsGeoSpline = new GeoSpline( [ offsetCurve.nodeData[i-1], offsetCurve.nodeData[i]] );
            var worstError = 0.0;
            var errorAtHalfway;

            //var testPositions = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9 ];
            // for ( var j in testPositions )
            // {
            //     var t = testPositions[j];
            //     var toffset = thisSegmentAsGeoSpline.getOffsetBetweenCurves( offsetSegmentAsGeoSpline, t, sa );
            //     var error = Math.abs( toffset - sa );
            //     //console.log( " Error at t:" + Math.round(t*100)/100 + " is " + Math.round( error/sa1*100 ) + "% actualError:" + error  );
            //     if ( error > worstError )
            //         worstError = error;
            // }
            errorAtHalfway = Math.abs( thisSegmentAsGeoSpline.getOffsetBetweenCurves( offsetSegmentAsGeoSpline, 0.5, sa ) - sa );
            //console.log( "Worst:" + worstError + " Halfway:" + errorAtHalfway );

            //depending upon worstError decide if we're splitting this segment, if we're we can just copy it to the one we're creating
            //if we split any, then recurse. 
            console.log( "Node " + i + " offset variance at t=0.5 " + Math.round( errorAtHalfway/sa*1000 )/10 + "%" );
            if ( ( isNaN( errorAtHalfway ) ) || ( (errorAtHalfway/sa) > 0.005 ) ) //0.01 would be plenty accurate enough for our purposes. 
            {
                //var splineWithAddedNodes = 
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
                    newNodeData.push( prevNode );

                newNodeData.push( node );
                c3 = node;
            }
        }

        if ( newNodeData.length > this.nodeData.length )
        {
            for ( var i=0; i<newNodeData.length; i++ )
            {
                var node = newNodeData[i];

                if (( ! node.inControlPoint ) && ( i>0 ))
                    console.log("Error, node should have inControlPoint");

                if (( ! node.outControlPoint ) && ( i<(newNodeData.length-1) ))
                    console.log("Error, node should have outControlPoint");

            }
    
            var thisWithMoreControlPoints = new GeoSpline( newNodeData );
            console.log("Recursing, now has " + thisWithMoreControlPoints.nodeData.length + " nodes...");
            return thisWithMoreControlPoints.parallelCurve( sa );
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
        var pointOnThisCurve = this.getPointForT( t );

        //NOTE: we cannot simply do  otherCurve.getPointForT( t ) as the two points won't necessarily be tangential.

        //So, calculate a tangent from this curve to intersect the other. 
        var anotherPointATinyBitFurtherOn = this.getPointForT( t + 0.0001 );
        var angleAtThisPoint = (new GeoLine(pointOnThisCurve,anotherPointATinyBitFurtherOn )).angleDeg();
        var tangentAngle = angleAtThisPoint + 90;
        if ( tangentAngle >= 360 ) 
            tangentAngle -= 360;
        var tangentLineAtThisPoint = new GeoLine(pointOnThisCurve, pointOnThisCurve.pointAtDistanceAndAngleDeg( 10 * targetOffset, tangentAngle ) );

        var otherCurveSI = otherCurve.asShapeInfo();
        var tangentLineSI = tangentLineAtThisPoint.asShapeInfo();        

        var intersections = Intersection.intersect(otherCurveSI, tangentLineSI);
        if ( intersections.points.length === 0 )
            return undefined;

        var pointOnOtherCurve = new GeoPoint( intersections.points[0].x, intersections.points[0].y );

        var line = new GeoLine( pointOnThisCurve, pointOnOtherCurve );
        return line.getLength();
    }
}
//# sourceMappingURL=patterneditor.js.map
