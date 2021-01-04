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


    equals( p )
    {
        return this.x === p.x && this.y === p.y;
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
}


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
                    return t;
                }

            }
            minT = closestT - interval; //So at the end of iteration 1 we'll be setting up a span next time that is 0.5 wide, which we'll cut into five slots 
            maxT = closestT + interval;
            //console.log( "i:" + iter + " minT:" + minT + " maxT:" + maxT + " closestT:" + closestT + " threshold:" + threshold + " closestDistance: " + closestDistance  );
        }
        console.log("Point not on curve." );
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

        var d1 = c1.beforePoint == null ? 0 : c1.beforePoint.pathLength();
        var d2 = c2.beforePoint == null ? 0 : c2.beforePoint.pathLength();
        if ( d2 < d1 ){
            var t = p2;
            p2 = p1;
            p1 = t;
            c1 = c2;
        }

        var cut1 = c1;
        var splineAfterPoint = cut1.afterPoint;
        var cut2 = splineAfterPoint.cutAtPoint( p2 ).beforePoint;
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
                const struts = this.getStrutPoints( t );

                function createNodeData( inControlPoint, point, outControlPoint ) {
                    const c = {inControlPoint:  inControlPoint,
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

                const c1n1 = createNodeData( undefined, struts[0], struts[4] );
                const c1n2 = createNodeData( struts[7], struts[9], undefined );
                const c2n1 = createNodeData( undefined, struts[9], struts[8] );
                const c2n2 = createNodeData( struts[6], struts[3], undefined );
                            
                return { beforePoint: new GeoSpline( [c1n1,c1n2] ),
                         afterPoint : new GeoSpline( [c2n1,c2n2] ) };            
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
                var pointLiesInThisSegment = segment.findTForPoint(p) !== undefined;

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

        return { beforePoint: nodesBeforeCut.length < 2 ? null : new GeoSpline(nodesBeforeCut),
                 afterPoint : nodesAfterCut.length < 2 ? null : new GeoSpline(nodesAfterCut) };
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
}

