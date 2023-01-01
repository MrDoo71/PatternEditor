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
}

