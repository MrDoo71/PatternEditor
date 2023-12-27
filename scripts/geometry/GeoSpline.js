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
        const t1 = this.findTForPoint(p1);

        if ( t1 === undefined )
            throw "p1 is not on spline;";

        const t2 = this.findTForPoint(p2);

        if ( t2 === undefined )
            throw "p2 is not on spline;";

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
            throw "p1 is not on spline;"

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


    adjustBounds( bounds ) {

        //It won't be a perfectly tight bounding box, but 
        //it should be ample to encompass the spline loosely. 
        
        for ( const node of this.nodeData )
        {
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
            throw "Unexpected type of addition. ";
            
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