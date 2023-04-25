//(c) Copyright 2023 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Piece {

    constructor (data, patternPiece) {
        this.data = data;
        this.patternPiece = patternPiece;
        this.name = data.name;
        this.detailNodes = data.detailNode;
        //this.update = data.update;
        //this.contextMenu = data.contextMenu;
        this.nodesByName = {};

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
                
        this.calculate();

        if ( this.name === this.patternPiece.pattern.data.options.targetPiece )
        {
            this.patternPiece.pattern.data.options.targetPiece = this;
            //this.highlight = true;
        }
    }

    
    drawSeamLine( g ) 
    {
        console.log("Time to draw seam line: ", this.name );

        var p = g.append("path")
                 .attr("d", this.svgPath( false ) )
                 .attr("fill", "none")
                 .attr("stroke", "red")
                 .attr("stroke-width", this.getStrokeWidth() ); //TODO this has to be set according to scale
    }


    drawSeamAllowance( g ) 
    {
        console.log("Time to draw seam allowance: ", this.name );

        var p = g.append("path")
                 .attr("d", this.svgPath( true ) )
                 .attr("fill", "none")
                 .attr("stroke", "green")
                 .attr("stroke-width", this.getStrokeWidth() ); //TODO this has to be set according to scale
    } 


    getStrokeWidth( isOutline, isSelected )
    {
        return Math.round( 1000 * ( isOutline ? 7.0 : ( isSelected ? 3.0 : 1.0 ) ) / scale / fontsSizedForScale ) /1000;
    }


    calculate()
    {
        console.log("*********");
        console.log("Prepare piece: " + this.name );
        var nObj;
        var previousP; //not adjusted for seam allowance
        var previousDirectionDeg; //same for SA and not SA
        var sa = 0.2;

        //Initial preparation, cut up any curves at notches, reverse curves if necessary, work out
        //which points don't lead to any progress around the curve. 
        for (var a = 0; a < this.detailNodes.length+1; a++) {  //+1 because we circle right around to the start

            var n = this.detailNodes[ ( a == this.detailNodes.length ) ? 0 : a ]; //circle back to the first object at the end. 
            var pn = this.detailNodes[ a-1 < 0 ? a-1+this.detailNodes.length : a-1 ]; 
            var nn = this.detailNodes[ a+1 >= this.detailNodes.length ? a+1-this.detailNodes.length : a+1 ];
            var dObj = n.dObj;
            var nObj = nn.dObj;
         
            if ( a == this.detailNodes.length )
                console.log("Closing path");

            if ( a === 0 ) //Note if first node is curve, then it could be done at the start. 
            {
                if ( dObj.curve instanceof GeoSpline )
                    previousP = dObj.curve.pointAlongPathFraction(100);
                else
                    previousP = dObj.p;

                console.log( "Start at " + n.obj + " delay drawing starting at " + previousP.toString() );
            }
            else 
            {                
                if (( dObj.curve instanceof GeoSpline ) || ( dObj.arc instanceof GeoArc ))
                {
                    console.log( "Curve " + n.obj + " previous:" + pn.obj + " next:" + nn.obj );

                    var nObjCurveOrArc = nObj.curve instanceof GeoSpline ? nObj.curve
                                                                         : nObj.arc instanceof GeoArc ? nObj.arc : undefined;

                    var nextP = nObjCurveOrArc ? nObjCurveOrArc.pointAlongPathFraction( nn.reverse?100:0 ) 
                                               : nObj.p;

                    var dObjCurve = dObj.curve instanceof GeoSpline ? dObj.curve
                                                                    : dObj.arc instanceof GeoArc ? dObj.arc.asGeoSpline() : undefined;
                 
                    //TODO what if previousP isn't on the spline?, cater for either or both not being on the curve segment
                    var curveSegment = dObjCurve.splineBetweenPoints( previousP, nextP );

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

                    //Note, don't skip a point just because it is co-incident with the start of a curve
                    //because the start of a curve has its own directionBeforeDeg, and yet the point in relation
                    //to the previous point may be a different angle. 
                    //if ( previousP && previousP.equals( curveSegment.pointAlongPathFraction(0) ) )
                    //{
                    //    if (( ! pn.dObj.curve ) || ( ! pn.dObj.curve instanceof GeoSpline ))
                    //        pn.skipPoint = true;
                    //}

                    previousP = curveSegment.pointAlongPathFraction(100);
                    n.directionBeforeDeg = curveSegment.entryAngleDeg();
                    n.directionAfterDeg = curveSegment.exitAngleDeg(); //or curveSegmentToDraw?
                    n.curveSegment = curveSegment;
                }
                else
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
                        if ( line.getLength() < 0.1 )
                            samePoint = true;
                    }

                    if ( ( samePoint ) && ( a == this.detailNodes.length ) ) //we've cycled back to the first node. 
                    {
                        //why?

                        n.point = thisP;
                        n.line = line;

                        if ( n.directionBeforeDeg === undefined )
                            n.directionBeforeDeg = n.directionAfterDeg;

                        if ( n.directionBeforeDeg === undefined )
                            n.directionBeforeDeg = pn.directionAfterDeg;     

                        n.skipPoint = false; 
                    }
                    else if ( ! samePoint ) //not the same point, or the last point
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
                    else
                    {
                        console.log("Same point, no progress");
                        n.directionBeforeDeg = pn.directionAfterDeg;
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
                  console.log("Index:" + a + " ends at " + previousP.toString() + ", direction " + Math.round(previousDirectionDeg) );
            }                    
        };

        console.log("**********************");
        console.log("Calculations complete");
        for (var a = 0; a < this.detailNodes.length; a++) {

            var n = this.detailNodes[ a ];

            n.tangentAfterDeg = n.directionAfterDeg + 90;
            if ( n.tangentAfterDeg > 360 )
                n.tangentAfterDeg -= 360;     

            n.tangentBeforeDeg = n.directionBeforeDeg + 90;
                if ( n.tangentBeforeDeg > 360 )
                    n.tangentBeforeDeg -= 360;     

            if ( n.skipPoint )
            {
                console.log( "Node:" + a + " " + n.obj + " skip");
                continue;
            }
    
            var debugSA = "";
    
            if ( n.curveSegment )
            {    
                var nodeData = [];
                var len = n.curveSegment.nodeData.length;                    
                for ( var i=0; i<len; i++ )
                {
                    var node = n.curveSegment.nodeData[i];

                    var newNode = {};
                    nodeData[i] = newNode;
                    n.tangentAfterDeg = n.curveSegment.angleLeavingNode(i); //TODO we could allow for pointy nodes by using angleArrivingNode for the inControlPoint
                    n.tangentAfterDeg += 90;
                    if ( n.tangentAfterDeg > 360 )
                        n.tangentAfterDeg -= 360;     

                    n.tangentBeforeDeg = n.tangentAfterDeg; //TODO determine this separately

                    newNode.point = node.point.pointAtDistanceAndAngleDeg( sa, n.tangentAfterDeg );
                    if ( node.inControlPoint )
                        newNode.inControlPoint = node.inControlPoint.pointAtDistanceAndAngleDeg( sa, n.tangentBeforeDeg );
                    if ( node.outControlPoint )
                        newNode.outControlPoint = node.outControlPoint.pointAtDistanceAndAngleDeg( sa, n.tangentAfterDeg );
                    //TODO
                    //We can do slightly better still, for each step/simplespline how much bigger is the new curve (distance between start/end nodes), and scale the length of the control points accordingly. 
                    //Now, for each step/simplespline chose points 0.1 0.5 and 0.9 along the old and new curve and measure the distance.  If the distance is
                    //not in tolerance, then split the spline by adding a new control point, and remember to cycle around. 
                    //https://raphlinus.github.io/curves/2022/09/09/parallel-beziers.html
                    //http://brunoimbrizi.com/unbox/2015/03/offset-curve/
                }
                n.curveSegmentSA  = new GeoSpline( nodeData );
                n.pointBeforeSA = n.curveSegmentSA.pointAlongPathFraction(0);
                n.pointAfterSA = n.curveSegmentSA.pointAlongPathFraction(100);

                debugSA = " A:" + n.pointBeforeSA.toString() + " B:" + n.pointBeforeSA.toString()                 
            }
            else
            {
                n.pointBeforeSA = n.line.p1.pointAtDistanceAndAngleDeg( sa, n.tangentBeforeDeg );

                if ( n.tangentAfterDeg )
                    n.pointAfterSA = n.line.p2.pointAtDistanceAndAngleDeg( sa, n.tangentAfterDeg );
                //Note if directionBeforeDeg==directionAfterDeg then there is effectively 1 point, and no intersection is necessary

                n.lineSA = new GeoLine( n.pointBeforeSA, n.pointAfterSA );

                debugSA = " A:" + n.pointBeforeSA.toString() + " B:" + n.pointAfterSA.toString() 
            }

            console.log( "Node:" + a + " " + n.obj + 
                         " directionBeforeDeg:" + ( n.directionBeforeDeg === undefined ? "undefined" : Math.round(n.directionBeforeDeg) ) + 
                         " directionAfterDeg:" + ( n.directionAfterDeg === undefined ? "undefined" : Math.round(n.directionAfterDeg) ) +
                         ( n.curveSegment ? " curvesegment" : n.line ? " line" : " UNKNOWN" ) + " " + debugSA);
            pn = n;
        }
        console.log("**********************");

        console.log("**********************");
        console.log("Calculating intersects");
        var pn = this.detailNodes[ this.detailNodes.length-1 ];
        if ( pn.skipPoint )
            pn = this.detailNodes[ this.detailNodes.length-2 ]; 
        for (var a = 0; a < this.detailNodes.length; a++) {

            var n = this.detailNodes[ a ];

            if ( n.skipPoint )
                continue;

            //Now extend or trim lines and curves so that they intersect at the required points. 

            //TODO we need to replace n.pointBeforeSA and pn.pointAfterSA with this intersection point? 
            //and if n.curveSegmentSA then cut the curve at each of those above. Though, if it doesn't cut the curve, then that's fine
            //it just means we didn't need to back track. 

            if (   ( ! pn.pointAfterSA.equals( n.pointBeforeSA ) ) 
                && ( Math.abs( pn.directionAfterDeg - n.directionBeforeDeg ) > 0.1 ) //must be at least 0.1 deg, though 1 deg would be fine too
                && ( pn.dObj != n.dObj ) )//if we are consecutive cut segments of the same curve then we don't need this. 
            try {
                console.log("Need to do an intersection, n.obj:" + n.obj + " withPrevious:" + pn.obj );

                //Our intersect could be external, in which case it will be a small, straight extension to each existing path, OR
                //our intersect could be internal, in which case each path needs to be shortened slightly.  It is this latter type
                //that requires us to care about where curves intersection. 

                var trailingPoint = pn.pointAfterSA.pointAtDistanceAndAngleDeg( 10, pn.directionAfterDeg )
                var leadingPoint = n.pointBeforeSA.pointAtDistanceAndAngleDeg( -10, n.directionBeforeDeg )
                var trailingPath = pn.lineSA ? pn.lineSA : pn.curveSegmentSA;
                var leadingPath = n.lineSA ? n.lineSA : n.curveSegmentSA;

                if ( trailingPath instanceof GeoSpline )
                {
                    trailingPath.nodeData.push( {inControlPoint:   trailingPoint,
                                                    point:            trailingPoint,
                                                    outControlPoint:  undefined } );
                    trailingPath.nodeData[ trailingPath.nodeData.length-2 ].outControlPoint = trailingPoint;
                }

                if ( leadingPath instanceof GeoSpline )
                {
                    leadingPath.nodeData.unshift( {inControlPoint:   undefined,
                                                    point:            leadingPoint,
                                                    outControlPoint:  leadingPoint } );
                    leadingPath.nodeData[1].inControlPoint = leadingPoint;
                }

                var trailingLine = new GeoLine( pn.pointAfterSA, trailingPoint );
                var leadingLine = new GeoLine( n.pointBeforeSA, leadingPoint );                    
                var intersect = trailingLine.intersect( leadingLine );

                var trailingPathSI = trailingPath.asShapeInfo();
                var leadingPathSI = leadingPath.asShapeInfo();        
                
                try {
                    var intersections = Intersection.intersect(trailingPathSI, leadingPathSI);
                    intersect = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
                    if ( intersections.length > 1 )
                        console.log( "Intersections found (A). " + intersections.length );
                } catch ( e ) {
                    console.log( "No intersections found (A). " + pn.obj + " and " + n.obj );
                    try { 
                        var intersections = Intersection.intersect(leadingPathSI, leadingPathSI );
                        intersect = new GeoPoint( intersections.points[0].x, intersections.points[0].y );
                        if ( intersections.length > 1 )
                            console.log( "Intersections found (B). " + intersections.length );
                    } catch ( e ) {
                        console.log( "No intersections found (B). " + pn.obj + " and " + n.obj );
                    }
                }
                
                //var distanceToIntersect = (new GeoLine( intersect, n.pointBeforeSA )).getLength();
                //if ( distanceToIntersect > 10 ) 
                //    throw "Bad intersect";

                pn.pointAfterSA = intersect;    
                n.pointBeforeSA = intersect;

                if ( trailingPath instanceof GeoSpline )
                {
                    //TODO if cutAtPoint doesn't work we could go back to our original non-extended curve and just extend that in a straight line to our intersect point
                    pn.curveSegmentSA = trailingPath.cutAtPoint( intersect ).beforePoint;
                    
                    console.log( "Node: " + (a-1) + " trail out adjusted. ");
                }
                else
                {
                    pn.lineSA = new GeoLine( pn.pointBeforeSA, pn.pointAfterSA );
                }

                if ( leadingPath instanceof GeoSpline )
                {
                    //TODO if cutAtPoint doesn't work we could go back to our original non-extended curve and just extend that in a straight line to our intersect point
                    var split = leadingPath.cutAtPoint( intersect );
                    n.curveSegmentSA = split.afterPoint ? split.afterPoint : split.beforePoint;
                    console.log( "Node: " + a + " lead in adjusted.");
                    //assert n.pointBeforeSA == n.curveSegmentSA.pointAlongPathFraction(0);
                }
                else
                {
                    n.lineSA = new GeoLine( n.pointBeforeSA, n.pointAfterSA );
                }

            } catch ( e ) {
                console.log("No intersect pn:" + pn.obj + " n:" + n.obj );
            } 
            pn = n;                     
        }
        console.log("**********************");

    }


    svgPath( withSeamAllowance )
    {
        console.log("*********");
        console.log("svgPath: " + this.name + " seamAllowance:" + withSeamAllowance );

        var path = undefined;
        var sa = 0.2;
        var pn = this.detailNodes[ this.detailNodes.length -1 ];

        for (var a = 0; a < this.detailNodes.length+1; a++) {  //+1 because we circle right around to the start

            var n = this.detailNodes[ ( a == this.detailNodes.length ) ? 0 : a ]; //circle back to the first object at the end. 
            //var pn = this.detailNodes[ a-1 < 0 ? a-1+this.detailNodes.length : a-1 ]; 
            //var nn = this.detailNodes[ a+1 >= this.detailNodes.length ? a+1-this.detailNodes.length : a+1 ];
         
            if ( a == this.detailNodes.length )
                console.log("Closing path");

            if ( n.skipPoint )
                continue;

            if ( n.curveSegment )
            {
                var curveSegmentToDraw = withSeamAllowance ? n.curveSegmentSA : n.curveSegment;

                path = curveSegmentToDraw.svgPath( path ) + " ";
            }
            else
            {
                var thisP = withSeamAllowance ? n.pointAfterSA : n.point;

                if ( ! path )
                {
                    path = "M " + thisP.x + " " + thisP.y + " ";
                    console.log( "Move to " + n.obj );
                }
                else
                {
                    path += "L " + thisP.x + " " + thisP.y + " ";
                    console.log( "Line to " + n.obj );
                }
            }

            pn = n;
        };

        //TODO actually close the SVG path? 

        //TODO expand the zoomed/scaled area to take into account the border thickness! and/or the seam allowance line

        console.log( "Path: " + path );

        return path;        
    }


    adjustBounds( bounds  )
    {
        for (var a = 0; a < this.detailNodes.length; a++) {

            var n = this.detailNodes[a];

            bounds.adjust( n.pointAfterSA );
            bounds.adjust( n.pointBeforeSA );
        }
    }
}