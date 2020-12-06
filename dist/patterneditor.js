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

import { Intersection, Point2D, ShapeInfo } from '../node_modules/kld-intersections/dist/index-esm.js';

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
}


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


    intersectArc( arc ) { //nb. arc can be GeoArc, GeoEllipticalArc, or GeoSpline
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
            var lineRotated = new GeoLine( p1rotated, p1rotated.pointAtDistanceAndAngleDeg( 1000, (this.angleDeg() - arc.rotationAngle) ) );

            arcSI = nrArc.asShapeInfo();
            
            var extendedLine = new GeoLine( lineRotated.p1.pointAtDistanceAndAngleRad( -1000/*infinite*/, lineRotated.angle ), lineRotated.p2 );
            lineSI = extendedLine.asShapeInfo();    
        }
        else
        {
            arcSI = arc.asShapeInfo();

            var extendedLine = new GeoLine( this.p1.pointAtDistanceAndAngleRad( -1000/*infinite*/, this.angle ), this.p2 );
            lineSI = extendedLine.asShapeInfo();    
        }

        //var path = ShapeInfo.path("M40,70 Q50,150 90,90 T135,130 L160,70 C180,180 280,55 280,140 S400,110 290,100");
    
        var intersections = Intersection.intersect(arcSI, lineSI);
        
        //console.log( "Intersections:" );
        //intersections.points.forEach(console.log);    

        if ( intersections.points.length === 0 )
            throw "No intersection with arc. ";

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


    applyOperation( pointTransformer ) {//apply a operationFlip or operationRotate to this GeoLine
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
        var angle1 = 360 - this.angle2;
        var angle2 = 360 - this.angle1;

        if ( angle2 > 360 ) //the original angle1 was negative. 
        {
            angle1 -= 360;
            angle2 -= 360;
        }

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


    svgPath() {
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
                                                                                             : nodeData[i-1].point.pointAtDistanceAndAngleDeg( nodeData[i-1].outLength, nodeData[i-1].outAngle );

                var controlPoint2 = ( typeof nodeData[i].inControlPoint !== "undefined" ) ? nodeData[i].inControlPoint
                                                                                          : nodeData[i].point.pointAtDistanceAndAngleDeg( nodeData[i].inLength, nodeData[i].inAngle );
                path += "C" + controlPoint1.x + " " + controlPoint1.y +
                        " " + controlPoint2.x + " " + controlPoint2.y +
                        " " + nodeData[i].point.x + " " + nodeData[i].point.y;
            }
        }
        //console.log( "GeoSpline: " + path );
        return path;
    }


    asShapeInfo() {
        return ShapeInfo.path( this.svgPath() );
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


        var g1 = 0.0,
            g2 = 1.0,
            iter = 0;
            

        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        var l = path.getTotalLength(),
            targetDistance = l / 100000;

        while( iter < 100 ) { //limit to 100 as a fallback
            iter++;

            var pg1 = path.getPointAtLength( l * g1 );
            var pg2 = path.getPointAtLength( l * g2 );

            //which of these points is closest?
            var pg1p = new GeoPoint( pg1.x, pg1.y );
            var pg2p = new GeoPoint( pg2.x, pg2.y );

            var distance1 = (new GeoLine(p, pg1p) ).getLength();
            var distance2 = (new GeoLine(p, pg2p) ).getLength();

            console.log("G1:" + g1 + " G2:" + g2 + "; Distance1: " + distance1 + " distance2:" + distance2 );

            if (( distance1 === 0 ) || ( distance1 < targetDistance )) //TODO this should be a proportion of length e.g. 0.01% i.e. 1:10000 
                return l*g1;
            if (( distance2 === 0 ) || ( distance1 < targetDistance ))
                return l*g2;

            if ( distance1 < distance2 )
                g2 = g1 + (g2-g1)/2;
            else
                g1 = g1 + (g2-g1)/2;
        }
        throw "Path length not found.";
    }


    pathLength( segment ) {

        if ( segment ) {
            //Create a shorter path
            var startNode = this.nodeData[ segment -1 ];
            var endNode = this.nodeData[ segment ];
            var shorterPath = new GeoSpline( [ startNode, endNode ] );
            return shorterPath.pathLength();
        }

        var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute( "d", this.svgPath() );
        return path.getTotalLength();
    }             
}


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


    svgPath() {
        // 90->180   -90 -> -180     -90,-90
        // 0->90   -0 +-90
        var d2 = this.centeredToSVG( this.center.x, this.center.y, this.radius1, this.radius2, 360-(this.angle1), -(this.angle2 - this.angle1), -this.rotationAngle );
        var path = "M" + d2.x + "," + d2.y;
        path += " A" + d2.rx + " " + d2.ry;
        path += " " + d2.xAxisAngle;
        path += " " + d2.largeArc + ",0";// + d2.sweep;
        path += " " + d2.x1 + "," + d2.y1 + " ";

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

        //This is an ellipse, so we also need to adjust the ellipse rotation. 
        var r = this.center.pointAtDistanceAndAngleDeg( this.radius1, this.rotationAngle );
        var r2 = pointTransformer( r );
        var r2line = new GeoLine( center2, r2 );
        var rotationAngle2 = r2line.angleDeg() +180;

        // + 180;
        if ( rotationAngle2 >= 360 )
            rotationAngle2 -= 360;

        //finally, start and finish point angles are defined with respect to the rotation angle
        startAngle2 -= rotationAngle2;
        finishAngle2 -= rotationAngle2;

        //Because we've flipped the start angle becomes the finish angle and vice verasa.
        return new GeoEllipticalArc( center2, this.radius1, this.radius2, finishAngle2 /*deg*/, startAngle2 /*deg*/, rotationAngle2 /*deg*/ )
    }
}


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
        if ( ( this.lineVisible() || isOutline ) && this.line ) //If there was an error, line may not be set. 
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
        if ( this.lineVisible() || isOutline )
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
        if ( ( this.lineVisible() || isOutline ) && this.curve )
            this.drawPath( g, this.curve.svgPath(), isOutline );
    }


    drawArc( g, isOutline ) {
        
        if ( ( this.lineVisible() || isOutline ) && this.arc )
        {
                if ( this.lineVisible() )
                    this.drawPath( g, this.arc.svgPath(), isOutline );    

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


    draw( g, isOutline ) {
        this.drawArc( g, isOutline );        
        this.drawLabel( g, isOutline );
    }


    html( asFormula ) {
        return '<span class="ps-name">' + this.data.name + '</span>: '
                + 'elliptical arc with center ' + this.refOf( this.center )
                + " radius-x " + this.data.radius1.htmlLength( asFormula ) 
                + " radius-y " + this.data.radius2.htmlLength( asFormula ) 
                + " from angle " + this.data.angle1.htmlAngle( asFormula ) 
                + " to " + this.data.angle2.htmlAngle( asFormula )
                + " rotation angle " + this.data.rotationAngle.htmlAngle( asFormula ) ;
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

        bounds.adjust( this.p );
        bounds.adjust( this.arc.pointAlongPathFraction( 0 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.25 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.5 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 0.75 ) );
        bounds.adjust( this.arc.pointAlongPathFraction( 1 ) );
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

        //else if this.basePoint.curve is a GeoSpline...
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
        //this.operationLine = new GeoLine(this.basePoint.p, this.p);

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

        //if( this.length.value && this.angle.value )    
        //try{    
        //Convert degrees to radians
        this.p = this.basePoint.p.pointAtDistanceAndAngleDeg( this.length.value(), this.angle.value() );
        this.line = new GeoLine(this.basePoint.p, this.p);
        bounds.adjustForLine(this.line);
        //} catch ( e ) {
        //    console.log("Calc failed.");
        //}
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

            //TODO replace 1000 with a calculation of the longest line that may be needed
        let otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( 1000/*infinite*/, angleDeg );

        var longLine = new GeoLine( this.basePoint.p, otherPoint );

        if ( this.arc.arc )
            this.p = longLine.intersectArc( this.arc.arc );
        else
            this.p = longLine.intersectArc( this.arc.curve );


        this.line = new GeoLine( this.basePoint.p, this.p );

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

        //Also this.data.crossPoint    

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

        let otherPoint = this.basePoint.p.pointAtDistanceAndAngleDeg( 1000/*infinite TODO*/, angleDeg );

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
        var extendedAxis = new GeoLine( this.p1Line1.p, this.p1Line1.p.pointAtDistanceAndAngleRad( 1000, axisLine.angle ) );
        this.p = extendedAxis.intersectArc( arc );
        this.line = new GeoLine( this.p1Line1.p, this.p );

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
    }    

}

class PointSingle extends DrawingObject {

    constructor(data) {
        super(data);
    }


    calculate(bounds) {
        var d = this.data;
        this.p = new GeoPoint(d.x, d.y);
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
        bounds.adjust( this.p );
    
        //Bounds will already have been adjusted for each node
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
        for( var i=0; i< d.pathNode.length; i++ )
        {
            if ( i>0 )
                html+= "; ";
         
            html += "<br />";    
            html += this.refOf( d.pathNode[i].point ) + " " + 
                    d.pathNode[i].angle1.htmlAngle( asFormula ) + " " + 
                    d.pathNode[i].length1.htmlLength( asFormula ) + " " + 
                    d.pathNode[i].angle2.htmlAngle( asFormula ) + " " + 
                    d.pathNode[i].length2.htmlLength( asFormula );
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

        for( var i=0; i< d.pathNode.length; i+=3 )
        {
            if ( (i-1)>0 )
                html += this.refOf( this.data.pathNode[i-1].point );

            html += d.pathNode[i].point.ref() + " ";            

            if ( (i+1) < this.data.pathNode.length )
                html += this.refOf(  this.data.pathNode[i+1].point );
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

        bounds.adjust( this.startPoint );
        bounds.adjust( this.endPoint );
        bounds.adjust( this.midPoint ); 
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
        this.increment = {};
        this.measurement = {};
        this.units = this.patternData.units ? this.patternData.units : "cm";
        this.wallpapers = data.wallpaper;
        this.bounds = new Bounds();

        if ( typeof this.patternData.measurement !== "undefined" )
        {
            for (var a = 0; a < this.patternData.measurement.length; a++) {
                var m = this.patternData.measurement[a];
                var measurementUnits = this.units;

                //TODO test this increment that is a simple value...            
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
                        return this.name + ": " + this.constant;
                    };
                }
                else
                {
                    inc.expression = new Expression( inc.expression, this, null );
                    inc.value = function () {
                        return this.expression.value();
                    };
                    inc.html = function(asFormula) {
                        return this.name + ": " + this.expression.html( asFormula );
                    };
                }
                this.increment[ inc.name ] = inc;
                inc.isIncrement = true;
            }
        }        

        this.patternPieces = [];
        for( var i=0; i<this.patternData.patternPiece.length; i++ )
        {
            this.patternPieces.push( new PatternPiece( this.patternData.patternPiece[i], this ) );
        }   
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

        if ( this.parent )
            this.parent.adjust(p);
    }

    adjustForLine(line) {

        if (!line)
            return;

        this.adjust(line.p1);
        this.adjust(line.p2);
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
        this.bounds = new Bounds();
        this.bounds.parent = pattern.bounds;
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

                if (( ! source ) || ( ! target ))
                    return;

                if (   ( target && typeof target.expression === "object" )
                    && ( ! target.isMeasurement )
                    && ( ! target.isIncrement ) )
                {
                    if ( target.expression.addDependencies )
                        target.expression.addDependencies( source, this );
                    else
                        console.log("Failed to add dependency for expression. Presumably due to earlier errors. "); //nb. the expression is likely the original data, not our expression object
                }
                else if (   ( target instanceof DrawingObject )
                         || ( target.isMeasurement )
                         || ( target.isIncrement ) )
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

    registerObj(dObj) {
        this.drawing[dObj.data.name] = dObj;
        dObj.patternPiece = this;
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

        var availableWidth = Math.round( window.innerWidth - 30);//targetdiv.style('width').slice(0, -2) -30 ); //30 for resize bar
        var availableHeight= Math.round( window.innerHeight - targetdiv.node().getBoundingClientRect().top -60/*controlpanel buttons height*/);
        if ( this.fullWindow )
        {
            availableWidth -= 32; //left & right padding 
            availableHeight -= 30;
        }

        //TODO availableHeight remove height of wallpapers descriptions

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

    options.updateServer = graphOptions.interactionPrefix ? function( k, x, y ) {
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
                }
                else 
                    console.log("No drawing object for " + a.data.name );
            }        

        var graphdiv = targetdiv;
        //Remove any existing highlighting in the table. 
        $(graphdiv.node()).find( ".j-active" ).removeClass("j-active").removeClass("j-active-2s");
        $(graphdiv.node()).find( ".source" ).removeClass("source");
        $(graphdiv.node()).find( ".target" ).removeClass("target");
        //$(graphdiv.node()).find( ".j-outline.j-outline-active" ).removeClass("j-outline-active");
        //$(this).addClass("j-active"); //highlight the object in the drawing

        //d, the drawing object we clicked on, has a direct reference to its representation in the table
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

        //Set the css class of all links to "link" "source link" or "target link" as appropriate.
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
        if ( scrollTable )
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

    doControls( targetdiv, options, pattern );

    var drawingAndTableDiv = targetdiv.append("div").attr("class", "pattern-main")

    doDrawingAndTable = function() {
                                    if ( options.layoutConfig.drawingWidth )
                                        doDrawing( drawingAndTableDiv, pattern, options, contextMenu, focusDrawingObject );
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
                                };

    doDrawingAndTable();                   
    
    var errorFound = false;
    var firstDrawingObject;
    for( var j=0; j< pattern.patternPieces.length; j++ )
    {
        for( var i=0; i< pattern.patternPieces[j].drawingObjects.length; i++ )
        {
            var a = pattern.patternPieces[j].drawingObjects[i];

            if ( firstDrawingObject === undefined )
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
    if ( ( ! errorFound ) && ( options.focus ) )
    {
        var a = pattern.getObject( options.focus );

        if ( ! a )
        try {
            a = pattern.getMeasurement( options.focus );
        } catch (e){
        }

        if ( ! a )
            a = pattern.getIncrement( options.focus );

        if ( a )
            focusDrawingObject(a, true);
    }
    else
    {
        focusDrawingObject(firstDrawingObject, true);
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
                                     .on("click", toggleFullScreen );
    }

    //if ( editorOptions.includeFullPageOption )
    {
        var toggleShowFormulas = function() {
            d3.event.preventDefault();
            editorOptions.showFormulas = ! editorOptions.showFormulas;
            d3.select(this).text( editorOptions.showFormulas ? "hide formulas" : "show formulas" );
            doDrawingAndTable();
        };

        var toggleShowFormulas = controls.append("button")
                                     .attr("class", "btn btn-default toggle-show_formulas")
                                     .text( editorOptions.showFormulas ? "hide formulas" : "show formulas" )
                                     .on("click", toggleShowFormulas );
    }    

    if ( pattern.wallpapers )
    {
        initialiseWallpapers( pattern, editorOptions.interactionPrefix );

        var wallpaperControlsGroups = controls.append("table").attr("class","wallpapers");
        wallpaperControlsGroups.selectAll("tr")
            .data( pattern.wallpapers )
            .enter()
            .append("tr")
            .attr( "class", function(w) { return w.hide ? 'wallpaper-hidden' : null; } )
            .each( function(wallpaper,i){                
                var wallpaperDiv = d3.select(this);
                wallpaperDiv.append( "td" ).html( function(w) { return w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      w.hide = ! w.hide; 
                                                                      d3.select(this).html( w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' );
                                                                      d3.select(this.parentNode).attr( "class", w.hide ? 'wallpaper-hidden' : null );
                                                                      w.updateServer();
                                                                      var wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                      doWallpapers( wallpaperGroups, pattern );                                                              
                                                                     } );
                wallpaperDiv.append( "td" ).html( function(w) { return w.editable ? '<i class="icon-unlock"/>' : w.allowEdit ? '<i class="icon-lock"/>' : '<i class="icon-lock disabled"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      if ( w.allowEdit )
                                                                      {
                                                                        w.editable = ! w.editable; 
                                                                        d3.select(this).html( w.editable ? '<i class="icon-unlock"/>' : '<i class="icon-lock"/>' );
                                                                        var wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                        doWallpapers( wallpaperGroups, pattern );                                                              
                                                                      }
                                                                     } );
                wallpaperDiv.append( "td" ).text( wallpaper.filename ? wallpaper.filename : wallpaper.imageurl );
                                                                     //icon-lock icon-unlock icon-move icon-eye-open icon-eye-close
            });
    }
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
function doDrawing( graphdiv, pattern, editorOptions, contextMenu, focusDrawingObject )
{
    var layoutConfig = editorOptions.layoutConfig;
    var margin = 0;//layoutConfig.drawingMargin;//25;    ///XXX why a margin at all?
    var width =  layoutConfig.drawingWidth;
    var height = layoutConfig.drawingHeight;

    graphdiv.select("svg.pattern-drawing").remove();

    var svg = graphdiv.append("svg")
                       .attr("class", "pattern-drawing" )
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));

    //var transformGroup1 = svg.append("g")
    //                        .attr("transform", "translate(" + ( margin ) + "," + ( margin ) + ")");
    var transformGroup1 = svg.append("g");
                            //.attr("transform", "translate(" + ( editorOptions.translateX ) + "," + ( editorOptions.translateY ) + ") scale(" + editorOptions.scale + ")");

    var patternWidth = ( pattern.bounds.maxX - pattern.bounds.minX );
    var patternHeight =( pattern.bounds.maxY - pattern.bounds.minY );

    var scaleX = width / patternWidth;                   
    var scaleY = height / patternHeight;           
    
    if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
        scale = scaleX > scaleY ? scaleY : scaleX;
    else if ( isFinite( scaleX ) )
        scale = scaleX;
    else
        scale = 1;

    //console.log( "scale:" + scale + " patternWidth:" + patternWidth + " width:" + width );

    //transformGroup2 scales from calculated positions in pattern-space (e.g. 10 representing 10cm) to
    //pixels available. So 10cm in a 500px drawing has a scale of 50. 
    var transformGroup2 = transformGroup1.append("g")
        .attr("transform", "scale(" + scale + "," + scale + ")");

    //centralise horizontally                            
    var boundsWidth = pattern.bounds.maxX - pattern.bounds.minX;
    var availableWidth = width / scale;
    var offSetX = ( availableWidth - boundsWidth ) /2;

    //transformGroup3 shifts the position of the pattern, so that it is centered in the available space. 
    var transformGroup3 = transformGroup2.append("g")
                               .attr("class","pattern")
                               .attr("transform", "translate(" + ( ( -1.0 * ( pattern.bounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.bounds.minY ) ) + ")");    

    if ( pattern.wallpapers )
    {
        var wallpaperGroups = transformGroup2.append("g")
                                             .attr("class","wallpapers")
                                             .attr("transform", "translate(" + ( ( -1.0 * ( pattern.bounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.bounds.minY ) ) + ")")   
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

        var outlineGroup = transformGroup3.append("g").attr("class","j-outline");
        var drawingGroup = transformGroup3.append("g").attr("class","j-drawing");

        var a = drawingGroup.selectAll("g");    
        a = a.data( patternPiece.drawingObjects );
        a.enter()
         .append("g")
         //.attr("class", "j-point")
         .on("contextmenu", contextMenu)
         .on("click", onclick)
         .each( function(d,i) {
            var g = d3.select( this );                        
            if (( typeof d.draw === "function" ) && ( ! d.error ))
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
         //.attr("class", "j-outline")
         .on("contextmenu", contextMenu)
         .on("click", onclick)
         .each( function(d,i) {
            var g = d3.select( this );
            if (( typeof d.draw === "function" ) && ( ! d.error ))
            {
                d.draw( g, true );
                d.outlineSvg = g;
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

                                g.selectAll( "circle" )
                                    .attr("r", Math.round( 1200 / scale / fontsSizedForScale )/100 );
                            }
                        }        
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
                    .scaleExtent([0.5, 8])
                    .on("zoom", zoomed);
        svg.call( zoom)
           .call(zoom.transform, transform);

        fontsSizedForScale = editorOptions.scale;
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

    //TODO ? a mode where we don't include measurements and increments in the table.
    if ( pattern.measurement )
    {
        for( var m in pattern.measurement )
            combinedObjects.push( pattern.measurement[m] );
    }

    if ( pattern.increment )
    {
        for( var i in pattern.increment )
            combinedObjects.push( pattern.increment[i] );
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

            //console.log( "divHeight() of this:" + this + " that:" + that );

            //var div = $(this).find( "div.nodedesc" );
            var h = $(this).find( "div.outer" ).height();
            
            if ( h < minItemHeight )
                return minItemHeight;
            return h;
            
        };

        var g = d3.select( this );

        var classes = "j-item";

        if ( d.error )
            classes += " error";

        if ( d.isMeasurement )
            classes += " j-measurement";

        if ( d.isIncrement )
            classes += " j-increment";

        g.attr( "class", classes ) ;    

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
        }

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
    drawLinks( patternPiece1, linkScale );
}


function drawLinks( patternPiece, linkScale )
{
    var linkData = patternPiece.dependencies.dependencies;

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
                    //.attr("d", curve);
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


export{ PatternPiece, doDrawing, doTable, drawPattern  };
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
            else if ( typeof data.increment !== "undefined")
            {
                this.variable = pattern.getIncrement( data.increment );
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
            else if (    ( data.variableType === "lengthOfSplinePath" )
                      || ( data.variableType === "lengthOfSpline" )
                      || ( data.variableType === "angle1OfSpline" )
                      || ( data.variableType === "angle2OfSpline" ) )
            {
                if ( data.drawingObject1 && data.drawingObject2 )
                {
                    //This shouldn't find an object, otherwise we'd have passed it as a single drawingObject.
                    this.drawingObject = patternPiece.getObject( "Spl_" + data.drawingObject1 + "_" + data.drawingObject2 );

                    //at least one of these will be an intersect on a curve, otherwise they are end points of the curve. 
                    if ( ! this.drawingObject )
                    {
                        this.drawingObject1 = patternPiece.getObject( data.drawingObject1 );
                        this.drawingObject2 = patternPiece.getObject( data.drawingObject2 );
                        //one of these will be a Spline, the other will be an intersection point on it. 

                        //We're not the whole spline, just a segment of it. 
                        if  ( this.drawingObject1.data.objectType === "pointIntersectArcAndAxis" ) //TODO or similar                
                            this.splineDrawingObject = this.drawingObject1.curve ? curve = this.drawingObject1.curve : curve = this.drawingObject1.arc;
                        else 
                            this.splineDrawingObject = this.drawingObject2.curve ? curve = this.drawingObject2.curve : curve = this.drawingObject2.arc;
        
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

    
    incrementValue() {
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
                //
                //https://stackoverflow.com/questions/18655135/divide-bezier-curve-into-two-equal-halves
                //https://pomax.github.io/bezierinfo/#splitting
                return    this.splineDrawingObject.curve.pathLengthAtPoint( this.drawingObject2.p )
                        - this.splineDrawingObject.curve.pathLengthAtPoint( this.drawingObject1.p );
            }

            if (    ( this.function === "lengthOfSplinePath" )
                 && ( this.segment ) )
                 return this.drawingObject.curve.pathLength( this.segment );

            return this.drawingObject.curve.pathLength();
        }
        else if (    ( this.function === "angle1OfSpline" )
                  || ( this.function === "angle2OfSpline" ) )
        {
            if ( this.function === "angle1OfSpline" )
                return this.drawingObject.curve.nodeData[0].outAngle;
            else
                return this.drawingObject.curve.nodeData[1].inAngle;
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


    html( asFormula, currentLength ) {

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
                {
                    return this.nameWithPopupValue( this.function + "( curve:" + this.splineDrawingObject.ref() + ", from:" + this.drawingObject1.ref() + ", to:" + this.drawingObject2.ref() + ")" );
                }
                
                return this.nameWithPopupValue( this.function + "(" + this.drawingObject.ref() + (this.segment?", segment:" + this.segment:"") + ")" );
            };

            if (    ( this.function === "angle1OfSpline" )
                 || ( this.function === "angle2OfSpline" ))
            {
                if ( ! this.drawingObject )
                    return this.function + "( ??? )";

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

            if ( this.function === "sqrt" )
            {
                return ( "sqrt(" + this.params[0].html( asFormula, currentLength ) + ")" ); 
            }

            if ( this.function === "-" )
            {
                return ( "-(" + this.params[0].html( asFormula, currentLength ) + ")" ); 
            }            

            //else
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

            if (this.operation === "+") 
                useOperatorNotation = " + ";

            else if (this.operation === "-") 
                useOperatorNotation = " - ";

            else if (this.operation === "/") 
                useOperatorNotation = " / ";

            else if (this.operation === "*") 
                useOperatorNotation = " * ";
                
            else if (this.operation === "==") 
                useOperatorNotation = " == ";

            var t = ( useOperatorNotation || this.operation === "()" ? "" : this.operation ) + "(";
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
                t += this.params[p].html( asFormula, currentLength );
                first = false;
            }
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

        if ( typeof this.drawingObject !== "undefined" ) //e.g. lengthOfArc
            dependencies.add( source, this.drawingObject );

        //increment or measurement
        if (    ( typeof this.variable !== "undefined")
             && (    ( this.variable.isMeasurement  )
                  || ( this.variable.isIncrement  ) ) )
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



//# sourceMappingURL=patterneditor.js.map
