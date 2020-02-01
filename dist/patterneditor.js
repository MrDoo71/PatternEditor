//TODO rename to do imports...
//and set up a tail file to do the exports...

console.log("Loading patterneditor.js" );

import { Intersection, Point2D, ShapeInfo } from '../node_modules/kld-intersections/dist/index-esm.js';


class Expression {

    constructor(data, pattern, patternPiece) {
        this.dataDebug = data;
        this.operation = data.operationType;
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

        //integer constant
        if (typeof data.integerValue !== "undefined") 
        {
            this.constant = data.integerValue;
            this.value = this.constantValue; //eh?
        }
        else if (typeof data.decimalValue !== "undefined") 
        {
            this.constant = data.decimalValue;
            this.value = this.constantValue; //eh?
        }
        else if (data.operationType === "Variable") 
        {
            if (data.variableType === "Keyword")
            {
                this.variable = data.keyword;
                this.value = this.keywordValue;
            }
            else if (data.variableType === "Increment")
            {
                this.variable = pattern.getIncrement( data.incrementVar );
                this.value = this.incrementValue;
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
            else if ( data.variableType === "lengthOfSplinePath" )
            {
                this.drawingObject = patternPiece.getObject( "Spl_" + data.drawingObject1 + "_" + data.drawingObject2 );
                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( data.variableType === "lengthOfSpline" )
            {
                //TODO TEST! if this works, combine with the one above as this is an exact copy
                this.drawingObject = patternPiece.getObject( "Spl_" + data.drawingObject1 + "_" + data.drawingObject2 );
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
            else 
                throw "Unsupported variableType:" + data.variableType;
        }
        else if ( typeof data.functionName !== "undefined" )
        {
            this.function = data.functionName;
            this.value = this.functionValue;
            //having done the parameters earlier. 
        }
        else if ( this.operationType !== "undefined" )
        {
            //add, multiply etc.
            this.value = this.operationValue;
        }
        else throw "Unsupported expression." ;
    }

    incrementValue() {
        return this.variable.value();
    }    

    measurementValue() {
        return this.variable.value();
    }    

    functionValue(currentLength) {
        if ( this.function === "angleOfLine" )
        {
            var point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
            var point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
            var line = new GeoLine( point1, point2 );
            return line.angleDeg();
        }
        else if ( this.function === "lengthOfLine" )
        {
            var point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
            var point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
            var line = new GeoLine( point1, point2 );
            return line.getLength();
        }
        else if (    ( this.function === "lengthOfSplinePath" )
                  || ( this.function === "lengthOfSpline" ) )
        {
            return this.drawingObject.curve.pathLength();
        }        
        else if ( this.function === "lengthOfArc" )
        {
            if ( this.arcSelection === "wholeArc")
                return this.drawingObject.arc.pathLength();
            else
            {
                var arcDrawingObject = this.drawingObject.curve ? this.drawingObject.curve : this.drawingObject.arc;

                //where in the arc is this.drawingObject.curve?
                var radiusToIntersectLine = new GeoLine( arcDrawingObject.center.p, this.drawingObject.p );
                var angleToIntersectRad = radiusToIntersectLine.angle;
                if ( this.arcSelection === "beforeArcCut")
                {
                    var arcStartAngleRad = arcDrawingObject.angle1.value() / 360 * 2 * Math.PI;
                    var segmentRad = angleToIntersectRad-arcStartAngleRad;                    
                    var length = radiusToIntersectLine.length * segmentRad; //because circumference of a arc is radius * angle (if angle is expressed in radians, where a full circle would be Math.PI*2 )
                    return length;
                }
                else
                {
                    var arcEndAngleRad = arcDrawingObject.angle2.value() / 360 * 2 * Math.PI;
                    var segmentRad = arcEndAngleRad - angleToIntersectRad;
                    var length = radiusToIntersectLine.length * segmentRad;
                    return length;
                }
            }
        }        
        else if  ( this.function === "sqrt" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.sqrt( p1 ); 
        }
        else throw ("Unknown function: " + this.function );
    }
    
    constantValue() {
        return this.constant;
    }

    operationValue(currentLength) {

        if (typeof this.params[0].value !== "function")
            alert("param1 not known");

        if ( this.operation !== "parenthesis" )    
        {
            if (typeof this.params[1].value !== "function")
                alert("param2 not known");
        }

        if (this.operation === "add")
            return this.params[0].value(currentLength) + this.params[1].value(currentLength);

        else if (this.operation === "subtract")
            return this.params[0].value(currentLength) - this.params[1].value(currentLength);

        else if (this.operation === "multiply")
            return this.params[0].value(currentLength) * this.params[1].value(currentLength);

        else if (this.operation === "divide")
            return this.params[0].value(currentLength) / this.params[1].value(currentLength);
            
        else if (this.operation === "equalTo")
            return this.params[0].value(currentLength) == this.params[1].value(currentLength);

        else if (this.operation === "notEqualTo")
            return this.params[0].value(currentLength) != this.params[1].value(currentLength);

        else if (this.operation === "lessThan")
            return this.params[0].value(currentLength) < this.params[1].value(currentLength);

        else if (this.operation === "lessThanOrEqualTo")
            return this.params[0].value(currentLength) <= this.params[1].value(currentLength);
            
        else if (this.operation === "greaterThan")
            return this.params[0].value(currentLength) > this.params[1].value(currentLength);

        else if (this.operation === "greaterThanOrEqualTo")
            return this.params[0].value(currentLength) >= this.params[1].value(currentLength);

        else if (this.operation === "parenthesis")
            return this.params[0].value(currentLength);

        else if  ( this.operation === "power" )
        {
            var p1 = this.params[0].value(currentLength);
            var p2 = this.params[1].value(currentLength);
            return Math.pow( p1, p2 );
        }    
        else if (this.operation === "ternary")
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

    html() {

        if ( this.variable )
            return this.variable;

        if ( this.constant )
            return this.constant;

        if ( this.operation )
        {
            var t = this.operation + "(";
            var first = true;
            for ( var p in this.params )
            {
                if ( ! first )
                    t += ",";
                t += this.params[p].html();
                first = false;
            }
            t += ")";
            return t;
        }

        return "EXPRESSION";
    }


    //The dependencies of this expression need adding to the source drawingObject that uses this expression
    addDependencies( source, dependencies ) 
    {
        if ( typeof this.drawingObject1 !== "undefined" )
            dependencies.add( source, this.drawingObject1 );

        if ( typeof this.drawingObject2 !== "undefined" )
            dependencies.add( source, this.drawingObject2 );

        if ( typeof this.drawingObject !== "undefined" ) //e.g. lengthOfArc
            dependencies.add( source, this.drawingObject );

        //recurse into the expression parameters.
        if ( this.params )
        {       
            for (var a = 0; a < this.params.length; a++) {
                var p = this.params[a];
                p.addDependencies( source, dependencies );
            }
        }

        //TODO also add dependencies on measurements and increments and (optionally) show these in the list too. 
    }
}



//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 


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

    pointAtDistanceAndAngle( length, angle /*radians anti-clockwise from east*/ ) {        
        var x = this.x + length * Math.cos( -1 * angle ); //TODO this is a guess!
        var y = this.y + length * Math.sin( -1 * angle );   
        return new GeoPoint( x, y );
    }


    rotate( center, rotateAngleDeg )
    {
        //Convert degrees to radians
        
        var centerToSourceLine = new GeoLine( center, this );
        var distance = centerToSourceLine.getLength();
        var angle =  ( Math.PI * 2 * ( centerToSourceLine.angleDeg() + rotateAngleDeg ) / 360 );

        var result = center.pointAtDistanceAndAngle( distance, angle );
        return result;
    }


    asPoint2D()
    {
        return new Point2D( this.x, this.y );
    }
}


//A line
class GeoLine {

    //p1;
    //p2;

    constructor( p1, p2 ) {
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

    intersectArc( arc )
    {
        var arcSI,lineSI;

        //nb there is a special case for GeoEllipticalArc where this.p1 == arc.center in 
        //which case a simple formula gives the intersect.
        if (( arc instanceof GeoEllipticalArc ) && ( arc.rotationAngle !== 0 ))
        {            
            console.log("elliptical arc ");
            
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
            var lineRotated = new GeoLine( p1rotated, p1rotated.pointAtDistanceAndAngle( 1000, (this.angleDeg() - arc.rotationAngle) /180 * Math.PI  ) );

            arcSI = nrArc.asShapeInfo();
            lineSI = lineRotated.asShapeInfo();    
        }
        else
        {
            arcSI = arc.asShapeInfo();
            lineSI = this.asShapeInfo();    
        }

        //var path = ShapeInfo.path("M40,70 Q50,150 90,90 T135,130 L160,70 C180,180 280,55 280,140 S400,110 290,100");
    
        var intersections = Intersection.intersect(arcSI, lineSI);
        
        intersections.points.forEach(console.log);    

        if ( intersections.points.length === 0 )
            throw "no intersection with arc";

        var intersect = new GeoPoint( intersections.points[0].x, intersections.points[0].y );

        if (( arc instanceof GeoEllipticalArc ) && ( arc.rotationAngle !== 0 ))
        {
            intersect = intersect.rotate( arc.center, +arc.rotationAngle );
        }

        return intersect;
    }

    asShapeInfo()
    {
        return ShapeInfo.line( this.p1.x, this.p1.y, this.p2.x, this.p2.y );
    }


    angleDeg() {
        var deltaX = (this.p2.x - this.p1.x);
        var deltaY = -1 * (this.p2.y - this.p1.y); //-1 because SVG has y going downwards

        //if ( deltaX === 0 )
        //    return deltaY > 0 ? 90 : 270;

        return Math.atan2( deltaY, deltaX ) * 180 / Math.PI;
    }


    getLength() {
        return this.length;
    }
}


class GeoArc {

    //center
    //radius
    //amgle1
    //angle2

    constructor( center, radius, angle1, angle2 ) {
        this.center = center;
        this.radius = radius;
        this.angle1 = angle1;
        this.angle2 = angle2;
        //radius2
        //rotationAngle

        //Correct 180-0 to 180-360
        if ( this.angle2 < this.angle1 )
            this.angle2+=360;
    }


    svgPath()
    {
        var arcPath = d3.path();
        arcPath.arc( this.center.x, this.center.y, 
                     this.radius, 
                     -this.angle1 * Math.PI / 180, -this.angle2 * Math.PI / 180, true );        
        console.log( "Could have used d3:", arcPath.toString() );
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
        console.log(p);      
        return new GeoPoint( p.x, p.y );
    }        

    
    pointAlongPathFraction( fraction ) {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var l = path.getTotalLength();
        var p = path.getPointAtLength( l * fraction );
        console.log(p);      
        return new GeoPoint( p.x, p.y );
    }         
    
    
    pathLength() {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }             


    asShapeInfo()
    {        
        var angle1, angle2;
        if ( this.angle1 > this.angle2 )
        {
            angle1 = this.angle1;
            angle2 = this.angle2;
        }
        else
        {
            angle1 = this.angle2;
            angle2 = this.angle1;
        }
        //create(ShapeInfo.ARC, args, ["center", "radiusX", "radiusY", "startRadians", "endRadians"]);
        return ShapeInfo.arc( this.center.asPoint2D(), this.radius, this.radius, angle1 * Math.PI/180, angle2 * Math.PI/180 );
    }    
}


class GeoSpline {

    //nodeData - an array of
    //{ 
    //  inAngle  : 
    //  inLength : 
    //  point    : 
    //  outAngle : 
    //  outLength:  
    //} 

    constructor( nodeData ) {
        this.nodeData = nodeData;
    }

    svgPath()
    {
        var nodeData = this.nodeData;
        var path;
        for ( var i=0; i<nodeData.length; i++ )
        {
            if ( i===0 )
            {
                path = "M" + nodeData[i].point.x + "," + this.nodeData[i].point.y ;
            }
            else
            {
                var controlPoint1 = ( typeof nodeData[i-1].outControlPoint !== "undefined" ) ? nodeData[i-1].outControlPoint
                                                                                             : nodeData[i-1].point.pointAtDistanceAndAngle( nodeData[i-1].outLength, nodeData[i-1].outAngle / 360 * 2 * Math.PI );

                var controlPoint2 = ( typeof nodeData[i].inControlPoint !== "undefined" ) ? nodeData[i].inControlPoint
                                                                                          : nodeData[i].point.pointAtDistanceAndAngle( nodeData[i].inLength, nodeData[i].inAngle / 360 * 2 * Math.PI );
                path += "C" + controlPoint1.x + " " + controlPoint1.y +
                        " " + controlPoint2.x + " " + controlPoint2.y +
                        " " + nodeData[i].point.x + " " + nodeData[i].point.y;
            }
        }

        console.log( "GeoSpline: " + path );

        return path;
    }

    asShapeInfo()
    {        
        return ShapeInfo.path( this.svgPath() );
    }
    
    pointAlongPathFraction( fraction ) {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var l = path.getTotalLength();
        var p = path.getPointAtLength( l * fraction );
        console.log(p);      
        return new GeoPoint( p.x, p.y );
    }       

    pointAlongPath( length ) {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var p = path.getPointAtLength( length );
        console.log(p);      
        return new GeoPoint( p.x, p.y );
    }       


    pathLength() {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }             

}


class GeoEllipticalArc {

    constructor( center, radius1, radius2, angle1, angle2, rotationAngle ) 
    {
        this.center = center;
        this.radius1 = radius1;
        this.radius2 = radius2;
        this.angle1 = angle1;
        this.angle2 = angle2;
        this.rotationAngle = rotationAngle;
    }


    //https://observablehq.com/@toja/ellipse-and-elliptical-arc-conversion
    getEllipsePointForAngle(cx, cy, rx, ry, phi, theta) 
    {
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
    centeredToSVG( cx, cy, rx, ry, thetaDeg/*arcStart*/, deltaDeg/*arcExtent*/, phiDeg/*x axis rotation*/ )
    {
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


    svgPath()
    {
        // 90->180   -90 -> -180     -90,-90
        // 0->90   -0 +-90
        var d2 = this.centeredToSVG( this.center.x, this.center.y, this.radius1, this.radius2, 360-(this.angle1), -(this.angle2 - this.angle1), -this.rotationAngle );
        var path = "M" + d2.x + "," + d2.y;
        path += " A" + d2.rx + " " + d2.ry;
        path += " " + d2.xAxisAngle;
        path += " " + d2.largeArc + ",0";// + d2.sweep;
        path += " " + d2.x1 + "," + d2.y1 + " ";

        console.log( "GeoEllipticalArc: " + path );

        return path;
    }

    asShapeInfo()
    {     
        //TEMPORARY ON TRIAL - THIS WORKS, SO ROTATE TRANSLATE 
        //              cx, cy, rx, ry. start, end   
        if ( this.rotationAngle === 0 )
            return ShapeInfo.arc( this.center.x, this.center.y, this.radius1, this.radius2, this.angle1/180*Math.PI, this.angle2/180*Math.PI)

        var svgPath = this.svgPath();
        console.log( "EllipticalArc.asShapeInfo() this might not work for intersections... " + svgPath );
        return ShapeInfo.path( svgPath );
    }
    
    pointAlongPathFraction( fraction ) {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var l = path.getTotalLength();
        var p = path.getPointAtLength( l * fraction );
        console.log(p);      
        return new GeoPoint( p.x, p.y );
    }       

    pointAlongPath( length ) {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var p = path.getPointAtLength( length );
        console.log(p);      
        return new GeoPoint( p.x, p.y );
    }       


    pathLength() {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }             

}


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

//define(function (require) {
//    require('./DrawingObject');
//    require('../geometry');
//});

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

        this.p = this.arc.pointAlongPathFraction( 0.5 );
        bounds.adjust( this.p );
        bounds.adjust( this.arc.pointAlongPathFraction( 0 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.25 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.5 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.75 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 1 ) );
    }


    pointAlongPath( length )
    {
        return this.arc.pointAlongPath( length );
    }
    

    asShapeInfo()
    {
        return this.arc.asShapeInfo();
    }


    draw(g) {
        var d = this.data;
        var p = g.append("path")
              .attr("d", this.arc.svgPath() )
              .attr("fill", "none")
              .attr("stroke-width", 1 / scale)
              .attr("stroke", this.getColor() );

        this.drawLabel(g, this);
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: elliptical arc with center ' + this.data.center 
                + " radius-x " + this.data.radius1.html() 
                + " radius-y " + this.data.radius2.html() 
                + " from angle " + this.data.angle1.html() + " to " + this.data.angle2.html()
                + " rotation angle " + this.data.rotationAngle.html() ;
    }

    
    setDependencies( dependencies )
    {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle1 );
        dependencies.add( this, this.angle2 );
        dependencies.add( this, this.rotationAngle );
        dependencies.add( this, this.radius1 );
        dependencies.add( this, this.radius2 );
    }    
}

//define(function (require) {
//    require('./DrawingObject');
//    require('../geometry');
//});

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
        bounds.adjust( this.p );
        bounds.adjust( this.arc.pointAlongPathFraction( 0 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.25 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.5 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.75 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 1 ) );
    }


    pointAlongPath( length )
    {
        return this.arc.pointAlongPath( length );
    }
    

    asShapeInfo()
    {
        return this.arc.asShapeInfo();
    }


    draw(g) {
        var d = this.data;
        var arcPath = d3.path();
        var a2 = this.angle2.value();
        if ( a2 < this.angle1.value() )
            a2 += 360;
        arcPath.arc( this.center.p.x, this.center.p.y, 
                     this.radius.value(), 
                     -this.angle1.value() * Math.PI / 180, -a2 * Math.PI / 180, true );
        
        console.log( "ArcSimple d3 path ", arcPath );

        g.append("path")
              .attr("d", arcPath )
              .attr("fill", "none")
              .attr("stroke-width", 1 / scale)
              .attr("stroke", this.getColor() );

        this.drawLabel(g, this);
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: arc with center ' + this.data.center + " radius " + this.data.radius.html() + " from angle " + this.data.angle1.html() + " to " + this.data.angle2.html();
    }

    
    setDependencies( dependencies )
    {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle1 );
        dependencies.add( this, this.angle2 );
        dependencies.add( this, this.radius );
    }    
}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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

        this.p = this.curve.pointAlongPath( this.length.value() );
        
        bounds.adjust(this.p);
    }

    draw(g) {
        //this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.html() + " along curve " + this.curve.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.curve );
        dependencies.add( this, this.length );
    }    

}

//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 

//var Point2D = require('kld-affine/Point2D');
/*
define(function (require) {
    require('../expression');
    require('./DrawingObject');
    require('./ArcSimple');
    require('./Line');
    require('./PointAlongLine');
    require('./PointAlongPerpendicular');
    require('./PointAlongBisector');
    require('./PointIntersectLineAndAxis');    
    require('./PointIntersectArcAndAxis');
    require('./PointIntersectArcAndLine');
    require('./PointEndLine');
    require('./PointLineIntersect');
    require('./PointSingle');
    require('./PointFromXandYOfTwoOtherPoints');   
    require('./PerpendicularPointAlongLine');        
    require('./PointOfTriangle'); 
    require('./PointShoulder'); 
    require('./SplineSimple');    
    require('./SplineUsingControlPoints');    
    require('./SplinePathInteractive');        
    require('./SplinePathUsingPoints');            
    require('./CutSpline');    
    require('./PointCutSplinePath');    
    require('./PointCutArc');        
    require('./PointIntersectCurves');        
    require('./PointIntersectCurveAndAxis');        
    require('./PointIntersectArcs');            
    require('./PointIntersectCircles');            
});*/


var scale;



/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        this.drawLine( g, this );
        
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
    }


    draw(g) {
        //g is the svg group
        //this.drawLine( g, this ); //TODO put an arrow head on this!
        //this.drawDot( g, this );
        //this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: Flip operation: axis:' + this.axis + 
                        " around " + this.center.data.name +
                         //" angle:" + this.data.angle.value() +
                         " suffix:" + this.data.suffix;
    }


    applyOperationToPoint( source )
    {
        var result = new GeoPoint( source.p.x, source.p.y );

        if (    ( this.axis === "Vertical" ) 
             || ( this.axis === "vertical" )) //just in case.
            result.x = this.center.p.y - ( source.p.x - this.center.p.x );
        else
            result.y = this.center.p.y - ( source.p.y - this.center.p.y );

        console.log("Axis:" + this.axis );
        console.log( "Center y " + this.center.p.y );
        console.log( "Source y " + source.p.y );
        console.log( "Result y " + result.y );

        return result;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.center );
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
        //this.p = this.basePoint.p.pointAtDistanceAndAngle(this.length.value(), Math.PI * 2 * this.angle.value() / 360);
        //this.line = new GeoLine(this.basePoint.p, this.p);
        //bounds.adjustForLine(this.line);
    }


    draw(g) {
        //g is the svg group
        //this.drawLine( g, this ); //TODO put an arrow head on this!
        //this.drawDot( g, this );
        //this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: Move operation: ' + this.data.length.value() + 
                        //" from " + this.basePoint.data.name +
                         " angle:" + this.data.angle.value() +
                         " suffix:" + this.data.suffix;
    }


    applyOperationToPoint( source )
    {
        //Convert degrees to radians
        var result = source.p.pointAtDistanceAndAngle(this.length.value(), Math.PI * 2 * this.angle.value() / 360);
        //var line = new GeoLine( source.p, result.p );
        return result;
    }


    setDependencies( dependencies )
    {
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

        //Convert degrees to radians
        this.p = this.fromOperation.applyOperationToPoint( this.basePoint );
        this.line = new GeoLine(this.basePoint.p, this.p);
        bounds.adjust( this.p );
    }


    draw(g) {
        //g is the svg group
        this.drawLine( g, this ); //TODO put an arrow head on this!
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: Operation result: ';
         //+ this.data.length.value() + 
           //             " from " + this.basePoint.data.name +
             //            " angle:" + this.data.angle.value() +
               //          " suffix:" + this.data.suffix;
    }


    applyOperationToPoint( source )
    {
        //Convert degrees to radians
        var result = source.p.pointAtDistanceAndAngle(this.length.value(), Math.PI * 2 * this.angle.value() / 360);
        //var line = new GeoLine( source.p, result.p );
        return result;
    }


    setDependencies( dependencies )
    {
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
    }


    draw(g) {
        //g is the svg group
        //this.drawLine( g, this ); //TODO put an arrow head on this!
        //this.drawDot( g, this );
        //this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: Move rotate: ' +
                         " center: " + this.center.data.name +
                         " angle:" + this.data.angle.value() +
                         " suffix:" + this.data.suffix;
    }


    applyOperationToPoint( source )
    {
        //Convert degrees to radians
        
        var centerToSourceLine = new GeoLine( this.center.p, source.p );
        var distance = centerToSourceLine.getLength();
        var angle =  ( Math.PI * 2 * ( centerToSourceLine.angleDeg() + this.angle.value() ) / 360 );

        var result = this.center.p.pointAtDistanceAndAngle( distance, angle );
        //var line = new GeoLine( source.p, result.p );
        return result;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.center );
        dependencies.add( this, this.angle );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        
        var baseLine = new GeoLine( this.basePoint.p, this.basePoint.p.pointAtDistanceAndAngle( 1, (line.angleDeg() + 90 )/360*Math.PI*2 ) );

        this.p = line.intersect(baseLine);
        this.line = new GeoLine( this.basePoint.p, this.p );

        bounds.adjust(this.p);
    }


    draw(g) {
        //g is the svg group
        this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ';// + this.data.length.value() + " from " + this.firstPoint.data.name + " perpendicular to the line to " + this.secondPoint.data.name + " additional angle:" + this.data.angle.value();
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.basePoint );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        this.p = this.secondPoint.p.pointAtDistanceAndAngle( this.length.value(), Math.PI * 2 * bisectingAngle / 360 );
        this.line = new GeoLine(this.secondPoint.p, this.p);
        bounds.adjustForLine(this.line);
    }


    draw(g) {
        //g is the svg group
        this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.value() + " along line bisecting " 
             + this.secondPoint.data.name + "-" + this.firstPoint.data.name + " and " + this.secondPoint.data.name + "-" + this.thirdPoint.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.thirdPoint );
        dependencies.add( this, this.length );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        this.p = this.firstPoint.p.pointAtDistanceAndAngle(this.length.value(this.baseLine.length), this.baseLine.angle);
        this.line = new GeoLine(this.firstPoint.p, this.p);
        
        bounds.adjustForLine(this.line);
    }

    draw(g) {
        this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.html() + " along line from " + this.firstPoint.data.name + " to " + this.secondPoint.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.length );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        this.p = this.firstPoint.p.pointAtDistanceAndAngle( this.length.value(), Math.PI * 2 * totalAngle / 360 );
        this.line = new GeoLine(this.firstPoint.p, this.p);
        bounds.adjustForLine(this.line);
    }


    draw(g) {
        //g is the svg group
        this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.value() + " from " + this.firstPoint.data.name + " perpendicular to the line to " + this.secondPoint.data.name + " additional angle:" + this.data.angle.value();
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        
        bounds.adjust(this.p);
    }

    draw(g) {
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.html() + " along arc " + this.arc.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.arc );
        dependencies.add( this, this.length );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        
        bounds.adjust(this.p);
    }

    draw(g) {
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.html() + " along path " + this.splinePath.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.splinePath );
        dependencies.add( this, this.length );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
            
        //Convert degrees to radians
        this.p = this.basePoint.p.pointAtDistanceAndAngle(this.length.value(), Math.PI * 2 * this.angle.value() / 360);
        this.line = new GeoLine(this.basePoint.p, this.p);
        bounds.adjustForLine(this.line);
    }


    draw(g) {
        //g is the svg group
        this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + this.data.length.value() + " from " + this.basePoint.data.name + " angle:" + this.data.angle.value();
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.length );
        dependencies.add( this, this.angle );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        bounds.adjust(this.p);
    }


    draw(g) {
        //TODO check that there is no option to draw a line as part of this tool. 
        this.drawDot( g, this );
        this.drawLabel( g, this );
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

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/


class PointIntersectArcAndAxis extends DrawingObject {

    //arc (provided as "curve"), and may be an arc or a spline (ob observation)
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

            //TODO replace 1000 with a calculation of the longest line that may be needed
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngle( 1000/*infinite*/, Math.PI * this.angle.value() / 180 );

        var longLine = new GeoLine( this.basePoint.p, otherPoint );

        if ( this.arc.arc )
            this.p = longLine.intersectArc( this.arc.arc );
        else
            this.p = longLine.intersectArc( this.arc.curve );

        this.line = new GeoLine( this.basePoint.p, this.p );

        bounds.adjust(this.p);
    }

    draw(g) {
        //g is the svg group
        this.drawLine(g, this);
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        //TODO use a better name for this.curve, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: intersect arc ' + this.arc.data.derivedName + " with line from " + this.basePoint.data.name + " at angle " + this.angle.value();
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.arc );
        dependencies.add( this, this.angle );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/


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
        var arc  = new GeoArc( this.center.p, this.radius.value(), 0, 2*Math.PI );

        this.p = line.intersectArc( arc );

        bounds.adjust(this.p);
    }

    draw(g) {

        //TODO draw the line between basePoint and p

        //g is the svg group
        var d = this.data; //the original json data
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        //TODO use a better name for this.arc, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: intersect arc with center ' + this.center.data.name + ", radius " + this.radius.value() +  " with line " + this.firstPoint.data.name + "-" + this.secondPoint.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.center );
        dependencies.add( this, this.radius );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/


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

        //Also this.data.crossPoint    

        var arc1SI = this.firstArc.asShapeInfo();
        var arc2SI = this.secondArc.asShapeInfo();

        var intersections = Intersection.intersect(arc1SI, arc2SI);
        
        intersections.points.forEach(console.log);    
        
        if ( intersections.points.length === 1 )
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

        bounds.adjust(this.p);
    }

    draw(g) {
        //g is the svg group
        var d = this.data; //the original json data
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        //TODO use a better name for this.arc, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: intersect arcs ' + this.firstArc.data.name + " and " + this.secondArc.data.name
           + ( this.data.crossPoint === "One" ? "" : " - second point");
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstArc );
        dependencies.add( this, this.secondArc );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/


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
        var circle1 = new GeoArc( this.center1.p, this.radius1.value(), 0, 2*Math.PI );
        var circle2 = new GeoArc( this.center2.p, this.radius2.value(), 0, 2*Math.PI );

        var arc1SI = circle1.asShapeInfo();
        var arc2SI = circle2.asShapeInfo();

        var intersections = Intersection.intersect(arc1SI, arc2SI);
        
        intersections.points.forEach(console.log);    
        
        if ( intersections.points.length === 0 )
        {
            this.p = new GeoPoint(0,0);
        }
        else if ( intersections.points.length === 1 )
        {
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        }
        else
        {
            //NB: this is a subset of the logic that applies to PointIntersectArcs.
            //What is the angle in the first arc of the intersection point?
            //One = smallest angle in the first arc.
            //Two = largest angle in the first arc.
            var p1 = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
            var p2 = new GeoPoint( intersections.points[1].x, intersections.points[1].y );
            var angle1 = (new GeoLine( circle1.center, p1)).angle;
            var angle2 = (new GeoLine( circle1.center, p2)).angle;

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

        bounds.adjust(this.p);
    }

    draw(g) {
        //g is the svg group
        var d = this.data; //the original json data
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        //TODO use a better name for this.arc, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: intersect circles ' + this.center1.data.name + " radius " + this.radius1.html() 
                + " and " + this.center2.data.name + " radius " + this.radius2.html()
           + ( this.data.crossPoint === "One" ? "" : " - second point");
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.center1 );
        dependencies.add( this, this.center2 );
        dependencies.add( this, this.radius1 );
        dependencies.add( this, this.radius2 );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/


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

        let otherPoint = this.basePoint.p.pointAtDistanceAndAngle( 1000/*infinite TODO*/, Math.PI * this.angle.value() / 180 );

        var line = new GeoLine( this.basePoint.p, otherPoint );

        var lineSI = line.asShapeInfo();
        var curveSI = this.curve.asShapeInfo();

        var intersections = Intersection.intersect(lineSI, curveSI);        
        intersections.points.forEach(console.log);    
        this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
        this.line = new GeoLine( this.basePoint.p, this.p );
        bounds.adjust(this.p);
    }

    draw(g) {
        //g is the svg group
        this.drawLine(g, this); 
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        //TODO use a better name for this.curve, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: intersect curve ' + this.curve.data.name + " with line from " + this.basePoint.data.name + " at angle " + this.angle.value();
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.curve );
        dependencies.add( this, this.angle );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/


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
        
        intersections.points.forEach(console.log);    
        if ( intersections.points.length === 1 )
            this.p = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
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

        bounds.adjust(this.p);
    }

    draw(g) {

        //TODO draw the line between basePoint and p

        //g is the svg group
        var d = this.data; //the original json data
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        //TODO use a better name for this.curve, e.g. Arc_A_nn
        return '<span class="ps-name">' + this.data.name + '</span>: intersect curve ' + this.curve1.data.name + " with " + this.curve2.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.curve1 );
        dependencies.add( this, this.curve2 );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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

        var otherPoint = this.basePoint.p.pointAtDistanceAndAngle( 1, Math.PI * 2 * this.angle.value() / 360 );

        var line2 = new GeoLine(this.basePoint.p, otherPoint );

        this.p = line1.intersect(line2);
        this.line = new GeoLine( this.basePoint.p, this.p );
        bounds.adjust(this.p);
    }


    draw(g) {
        //g is the svg group
        this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: intersection of ' + this.p1Line1.data.name + "-" + this.p2Line1.data.name + " with line from " + this.basePoint.data.name + " at angle " + this.angle.html();
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
        dependencies.add( this, this.basePoint );
        dependencies.add( this, this.angle );
    }    


}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        bounds.adjust(this.p);
    }


    draw(g) {
        //g is the svg group
        var d = this.data; //the original json data
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: intersect ' + this.p1Line1.data.name + "-" + this.p2Line1.data.name + " with " + this.p1Line2.data.name + "-" + this.p2Line2.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p1Line2 );
        dependencies.add( this, this.p2Line1 );
        dependencies.add( this, this.p2Line2 );
    }    


}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        var midpoint = this.firstPoint.p.pointAtDistanceAndAngle( otherLine.length/2, otherLine.angle );
        var arc = new GeoArc( midpoint, otherLine.length/2, 0, 2*Math.PI  );    
        var extendedAxis = new GeoLine( intersectionPoint, intersectionPoint.pointAtDistanceAndAngle( otherLine.length*2, axisLine.angle ) );
        this.p = extendedAxis.intersectArc( arc );

        bounds.adjust(this.p);
    }


    draw(g) {
        //g is the svg group
        //this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + " Point along " + this.p1Line1.data.name + "-" + this.p2Line1.data.name + " that forms a right angle triangle with line  " + this.firstPoint.data.name + "-" + this.secondPoint.data.name ;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.firstPoint );
        dependencies.add( this, this.secondPoint );
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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
        var arc = new GeoArc( this.shoulderPoint.p, this.length.value(), 0, 2*Math.PI  );      
        var offset = new GeoLine( this.shoulderPoint.p, this.p1Line1.p );
        var extendedAxisLength = this.length.value() + offset.length;
        var extendedAxis = new GeoLine( this.p1Line1.p, this.p1Line1.p.pointAtDistanceAndAngle( 100, axisLine.angle ) );
        this.p = extendedAxis.intersectArc( arc );
        this.line = new GeoLine( this.p1Line1.p, this.p );
        bounds.adjust(this.p);
    }


    draw(g) {
        //g is the svg group
        this.drawLine( g, this );
        this.drawDot( g, this );
        this.drawLabel( g, this );
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: ' + " Point along " + this.p1Line1.data.name + "-" + this.p2Line1.data.name + " being " + this.length.html() + " from " + this.shoulderPoint.data.name;
    }


    setDependencies( dependencies )
    {
        dependencies.add( this, this.shoulderPoint );
        dependencies.add( this, this.p1Line1 );
        dependencies.add( this, this.p2Line1 );
    }    

}

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/


class PointSingle extends DrawingObject {

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;
        this.p = new GeoPoint(d.x, d.y);
        bounds.adjust(this.p);
    }


    draw(g) {
        //g is the svg group
        var d = this.data; //the original json data
        this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>:' + " point at x:" + this.data.x + ", y:" + this.data.y + " from origin";
    }


    setDependencies( dependencies )
    {
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
        bounds.adjust( this.p );

        //Bounds will already have been adjusted for each node
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw(g) {
        var d = this.data;
        var p = g.append("path")
              .attr("d", this.curve.svgPath() )
              .attr("fill", "none")
              .attr("stroke-width", 1 / scale)
              .attr("stroke", this.getColor() );

        //Where should we draw the label? half way along the curve? 
        this.drawLabel(g, this);
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html() {
        var html = '<span class="ps-name">' + this.data.name + '</span>: curved path:';// from ' + this.startPoint.data.name + " angle " + this.angle1.value() + " length " + this.length1.value()
            //+ " to " + this.endPoint.data.name + " angle " + this.angle2.value() + " length " + this.length2.html();

        var d = this.data;
        for( var i=0; i< d.pathNode.length; i++ )
        {
            if ( i>0 )
                html+= "; ";
         
            html += "<br />";    
            html += d.pathNode[i].point.data.name + " " + 
                    d.pathNode[i].angle1.html() + " " + 
                    d.pathNode[i].length1.html() + " " + 
                    d.pathNode[i].angle2.html() + " " + 
                    d.pathNode[i].length2.html();
        }

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
        bounds.adjust( this.p );

        //Bounds will already have been adjusted for each node
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw(g) {
        var d = this.data;
        var p = g.append("path")
              .attr("d", this.curve.svgPath() )
              .attr("fill", "none")
              .attr("stroke-width", 1 / scale)
              .attr("stroke", this.getColor() );

        //Where should we draw the label? half way along the curve? 
        this.drawLabel(g, this);
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html() {
        var html = '<span class="ps-name">' + this.data.name + '</span>: curved path: ';

        var d = this.data;

        for( var i=0; i< d.pathNode.length; i+=3 )
        {
            if ( (i-1)>0 )
                html += '<span class="control-point">' + this.data.pathNode[i-1].point.data.name + '</span> ';

            html += d.pathNode[i].point.data.name + " ";            

            if ( (i+1) < this.data.pathNode.length )
                html += '<span class="control-point">' + this.data.pathNode[i+1].point.data.name + '</span> ';
        }

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

        bounds.adjust( this.startPoint );
        bounds.adjust( this.endPoint );
        bounds.adjust( this.midPoint ); 
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw(g) {
        var d = this.data;
        var p = g.append("path")
              .attr("d", this.curve.svgPath() )
              .attr("fill", "none")
              .attr("stroke-width", 1 / scale)
              .attr("stroke", this.getColor() );

        //Where should we draw the label? half way along the curve?
        //this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: spline from ' + this.startPoint.data.name + " angle " + this.angle1.value() + " length " + this.length1.value()
            + " to " + this.endPoint.data.name + " angle " + this.angle2.value() + " length " + this.length2.html();
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

/*define(function (require) {
    require('./DrawingObject');
    require('../geometry');
});*/

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

        bounds.adjust( this.startPoint );
        bounds.adjust( this.endPoint );
        bounds.adjust( this.midPoint ); 
    }

    
    asShapeInfo()
    {
        return this.curve.asShapeInfo();
    }


    draw(g) {
        var d = this.data;
        var p = g.append("path")
              .attr("d", this.curve.svgPath() )
              .attr("fill", "none")
              .attr("stroke-width", 1 / scale)
              .attr("stroke", this.getColor() );

        //Where should we draw the label? half way along the curve?
        //this.drawDot(g, this);
        this.drawLabel(g, this);
    }


    pointAlongPath( length ) {
        return this.curve.pointAlongPath( length );
    }   


    html() {
        return '<span class="ps-name">' + this.data.name + '</span>: spline from ' + this.startPoint.data.name + " using control point " + this.startControlPoint.data.name
            + " to " + this.endPoint.data.name + " using control point " + this.endControlPoint.data.name;
    }

    
    setDependencies( dependencies )
    {
        dependencies.add( this, this.startPoint );
        dependencies.add( this, this.startControlPoint );
        dependencies.add( this, this.endPoint );
        dependencies.add( this, this.endControlPoint );
    }    
}

class Pattern {

    constructor (data, options ) {
        this.data = data;
        this.options = options;
        this.patternData = data.pattern;
        this.increment = {};
        this.measurement = {};

        if ( typeof this.patternData.measurement !== "undefined" )
        {
            for (var a = 0; a < this.patternData.measurement.length; a++) {
                var m = this.patternData.measurement[a];

                //TODO test this increment that is a simple value...            
                if (typeof m.value !== "undefined") 
                {
                    m.constant = m.value;
                    m.value = function () {
                        return this.constant;
                    };
                    m.html = function() {
                        return this.constant;
                    };
                }
                else
                {
                    m.expression = new Expression( m.expression, this, null );
                    m.value = function () {
                        return this.expression.value();
                    };
                    m.html = function() {
                        return this.expression.html();
                    };
                }
                this.measurement[ m.name ] = m;
            }
        }        
        
        if ( typeof this.patternData.increment !== "undefined" )
        {
            for (var a = 0; a < this.patternData.increment.length; a++) {
                var inc = this.patternData.increment[a];

                //TODO test this increment that is a simple value...            
                if (typeof inc.constant !== "undefined") 
                {
                    inc.value = function () {
                        return this.constant;
                    };
                    inc.html = function() {
                        return this.constant;
                    };
                }
                else
                {
                    inc.expression = new Expression( inc.expression, this, null );
                    inc.value = function () {
                        return this.expression.value();
                    };
                    inc.html = function() {
                        return this.expression.html();
                    };
                }
                this.increment[ inc.name ] = inc;
            }
        }        

        //TODO support multiple pattern pieces
        this.patternPiece1 = new PatternPiece( this.patternData.patternPiece[0], this );        
    }

    getIncrement(name) {
        if (typeof name === "object")
            return name;
        return this.increment[name];
    }

    getMeasurement(name) {
        if (typeof name === "object")
            return name;
        var m = this.measurement[name];

        if ( !m )
            throw "Measurment not found:" + name;

        return m;
    }


}
class PatternPiece {

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
        this.bounds = {
            minX: undefined,
            maxX: undefined,
            minY: undefined,
            maxY: undefined
        };
        this.init();
    }
    
    init() {
        this.bounds = {
            minX: undefined,
            maxX: undefined,
            minY: undefined,
            maxY: undefined,
            adjust: function (p) {
                var x = p.x;
                var y = p.y;
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
            },
            adjustForLine: function (line) {
                this.adjust(line.p1);
                this.adjust(line.p2);
            }
        };
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
            this.registerObj(dObj);
        }
        this.analyseDependencies();
    }

    analyseDependencies()
    {
        //Now build up dependency links
        this.dependencies = { 
            dependencies: [], 
            add: function ( source, target ) { 
                if ( typeof target.expression === "object" )
                    target.expression.addDependencies( source, this );
                else if ( target instanceof DrawingObject )
                    this.dependencies.push( { source: source, target: target } ); 
            }  
        };
        
        for (var a = 0; a < this.drawingObjects.length; a++) 
        {
            var dObj = this.drawingObjects[a];
            dObj.setDependencies( this.dependencies );
        }
        //TODO use a d3.map of a d3.set when we build up the data and then convert it to an array
        //so that we can remove duplicates.
    }

    getObject(name) {
        if (typeof name === "object")
            return name;
        return this.drawing[name];
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
        else if (dObj.objectType === "operationResult")
            return new OperationResult(dObj);                  
            

        throw( "Unsupported drawing object type:" + dObj.objectType );

        return null;
    }

    newFormula(formula) {

        //f.value()
        //f.html()

        var f = formula;
        if (typeof formula.constant !== "undefined") {
            f.value = function () {
                return this.constant;
            };
            f.html = function() {
                return this.constant;
            };
        }
        else if (typeof formula.expression === "object") {
            f.expression = new Expression( f.expression, this.pattern, this );
            f.value = function (currentLength) {
                return f.expression.value(currentLength);
            };
            f.html = function() {
                return f.expression.html();
            };
        }
        return f;
    }

    registerObj(dObj) {
        this.drawing[dObj.data.name] = dObj;
        dObj.patternPiece = this;
        if (typeof dObj.calculate !== "undefined") {
            //var getObject = this.getObject();
            dObj.calculate(this.bounds);
        }
    }

    pointSingle(data) {
        data.objectType = "pointSingle";
        var dObj = this.add( data );
        //var dObj = new PointSingle(data);
        //this.drawingObjects.push(dObj);
        //this.registerObj(dObj);
        return dObj;
    }

    add(data) {
        if (this.defaults) {
            for (var d in this.defaults) {
                if (typeof data[d] === "undefined")
                    data[d] = this.defaults[d];
            }
        }
        var dObj = this.newDrawingObj(data);
        this.drawingObjects.push(dObj);
        this.registerObj(dObj);
        return dObj;
    }

    setDefaults(defaults) {
        this.defaults = defaults;
    }
}


//(c) Copyright 2019 Jason Dore
//Inspired by the excellent seamly2D/Valentina (XXX ref) developed by Roman/Susan etc.
//this is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the seamly2D/Valentina pattern making systen in order to support community
//pattern sharing website. 




//var gInteractionPrefix; 
var selectedObject;
var linksGroup;

function drawPattern( dataAndConfig, ptarget, options ) 
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

    var pattern = new Pattern( dataAndConfig, options );
      
    pattern.gInteractionPrefix = options.interactionPrefix;    
    
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
    
    // show menu on right-click.
    var contextMenu = function(d) {
   		d3.event.preventDefault() ;
    	var v = newkvpSet(false) ;
    	v.add("x", d.x) ;   
    	v.add("y", d.y) ;    
    	goGraph( gInteractionPrefix + ':' + d.data.contextMenu ,
    			 d3.event, 
    			 v ) ;
    }      
    
    var targetdiv = d3.select( "#" + ptarget );
    
    doDrawing( targetdiv, pattern.patternPiece1, contextMenu );
    
    doTable( targetdiv, pattern.patternPiece1, contextMenu );
}


//Do the drawing... (we've added draw() to each drawing object.
function doDrawing( graphdiv, patternPiece1, contextMenu )
{
    var margin = 25; 
    var width = 400;
    var height = 600;

    var svg = graphdiv.append("svg")
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));

    var transformGroup = svg.append("g")
                            .attr("transform", "translate(" + ( margin ) + "," + ( margin ) + ")");

    var scaleX = width / ( patternPiece1.bounds.maxX - patternPiece1.bounds.minX );                   
    var scaleY = height / ( patternPiece1.bounds.maxY - patternPiece1.bounds.minY );           
    
    if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
        scale = scaleX > scaleY ? scaleY : scaleX;
    else if ( isFinite( scaleX ) )
        scale = scaleX;
    else
        scale = 1;

    var transformGroup = transformGroup.append("g")
                               .attr("transform", "scale(" + scale + "," + scale + ")");

    var transformGroup = transformGroup.append("g")
                               .attr("transform", "translate(" + ( ( -1.0 * patternPiece1.bounds.minX ) ) + "," + ( ( -1.0 * patternPiece1.bounds.minY ) ) + ")");

    //TODO also need to be able to click on a line / curve/ arc

    var onclick = function(d) {
        d3.event.preventDefault() ;
        console.log( "Click! " );
        $( ".j-active" ).removeClass("j-active");
        $( ".j-item.source" ).removeClass("source");
        $( ".j-item.target" ).removeClass("target");
        $(this).addClass("j-active");
        d.tableSvg.each( function(d,i) {
            $(this).addClass("j-active");
        });
        selectedObject = d;
        //drawLinks( patternPiece1 );

        linksGroup.selectAll("path.link") //rename .link to .dependency
            .attr("class", function( d ) {                         
                if ( d.source == selectedObject ) 
                {
                    d.target.tableSvg.each( function() { $(this).addClass("source"); } );
                    return "source link";
                }
                if ( d.target == selectedObject ) 
                {
                    d.source.tableSvg.each( function() { $(this).addClass("target"); } );
                    return "target link";
                }
                return "link"; 
            } );
    }

    var a = transformGroup.selectAll("g");    
    a = a.data( patternPiece1.drawingObjects );
    a.enter()
     .append("g")
     .each( function(d,i) {
        var g = d3.select( this );
        //d.calculate();

        d.drawingSvg = g;

        g.on("contextmenu", contextMenu);
        g.on("click", onclick);

        if ( typeof d.draw === "function" )
            d.draw( g );
    });

    //Enable Pan and Zoom
    //https://observablehq.com/@d3/zoom
    //TODO if a point is selected then zoom with it as the focus
    //SEE https://bl.ocks.org/mbostock/a980aba1197350ff2d5a5d0f5244d8d1
    /*
    function zoomed() {
        transformGroup.attr("transform", d3.event.transform);
    }; this doesn't quite work well enough
    svg.call(d3.zoom()
        .extent([[0, 0], [width, height]])
        .scaleExtent([1, 8])
        .on("zoom", zoomed));
    */
}


function doTable( graphdiv, patternPiece1, contextMenu )
{
    var margin = 25; 
    var width = 400;
    var height = 600;
    var minItemHeight = 30; //should not be required
    var itemMargin = 8;
    var itemWidth = 300;
    var ypos = 0;
    var seq = 1; //TODO get these in the XML as data?

    var svg = graphdiv.append("svg")
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));    

    var a = svg.selectAll("g");
    a = a.data( patternPiece1.drawingObjects );
    a.enter()        
     .append("g")
     .each( function(d,i) {

        var divHeight = function(that) {

            //this - the dom svg element
            //that - the data object

            //console.log( "divHeight() of this:" + this + " that:" + that );

            //var div = $(this).find( "div.nodedesc" );
            var h = $(this).find( "div.outer" ).height();
            
            if ( h < minItemHeight )
                return minItemHeight;
            return h;
            
        };

        var g = d3.select( this );

        g.attr( "class", "j-item") ;

        d.tableSvg = g;
        d.tableSvgX = itemWidth;
        d.tableSvgY = ypos + ( 0.5 * minItemHeight );

        var fo = g.append( "foreignObject" )
         .attr( "x", 0 )
         .attr( "y", function (d) { 
             return ypos;
         } )
         .attr( "width", itemWidth  );

         var div = fo.append( "xhtml:div" )
           .attr("class","outer")
           .append( "xhtml:div" )
           .attr("class","desc")
           .html( d.html() );

        fo.attr( "height", 1 ); //required by firefox otherwise bounding rects returns nonsense
        fo.attr( "height", divHeight );

        g.attr( "height", divHeight )
         .attr( "y", function (d) { 
                                    //Get the height of the foreignObject.
                                    var h = this.childNodes[0].getBoundingClientRect().height;
                                    ypos += h + itemMargin; 
                                    //console.log("y: " + ypos );
                                    return ypos } )

        g.on("contextmenu", contextMenu);
    });                   
    
    linksGroup = svg.append("g")
                    .attr("class", "links");

    drawLinks( patternPiece1 );
}


function drawLinks( patternPiece )
{
    var linkData = patternPiece.dependencies.dependencies;

    linksGroup.selectAll("path.link") //rename .link to .dependency
                    .data(linkData)
                    .enter().append("path")
                    .attr("class", "link" )
                    .attr("d", curve);
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


export{ PatternPiece, doDrawing, doTable, drawPattern  };
//# sourceMappingURL=patterneditor.js.map
