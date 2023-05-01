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
                
        this.defaultSeamAllowance = this.patternPiece.newFormula( data.seamAllowanceWidth ).value();
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
                 .attr("id","seam line - " + this.name )
                 .attr("d", this.svgPath( false ) )
                 .attr("fill", "none")
                 .attr("stroke", "red")
                 .attr("stroke-width", this.getStrokeWidth() ); //TODO this has to be set according to scale
    }


    drawSeamAllowance( g ) 
    {
        console.log("Time to draw seam allowance: ", this.name );

        var p = g.append("path")
                 .attr("id","seam allowance - " + this.name )
                 .attr("d", this.svgPath( true ) )
                 .attr("fill", "none")
                 .attr("stroke", "green")
                 .attr("stroke-width", this.getStrokeWidth() ); //TODO this has to be set according to scale
    } 


    getStrokeWidth( isOutline, isSelected )
    {
        if ( this.patternPiece.pattern.data.options.lifeSize ) 
        {
            if ( this.patternPiece.pattern.units = "cm" )
                return 0.05; //0.5mm
            else if ( this.patternPiece.pattern.units = "mm" )
                return 0.5; //0.5mm
            else //inches
                return 0.02; //approx 0.5mm
        }
            
        return Math.round( 1000 * ( isOutline ? 7.0 : ( isSelected ? 3.0 : 1.0 ) ) / scale / fontsSizedForScale ) /1000;
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

            if ( typeof n.before !== "undefined" )
            {
                n.sa1 = 1.0 * n.before; //TODO what about beforeSA? what about formulas.
                if ( typeof pn.sa2 === "undefined"  )
                    pn.sa2 = n.sa1;
            }

            if ( typeof n.after !== "undefined" ) //string
            {
                n.sa2 = 1.0 * n.after; //TODO what about beforeSA? what about formulas.
                if ( typeof nn.sa1 === "undefined"  )
                    nn.sa1 = n.sa2; 
            }
         
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
                        n.point = thisP; //even if skipping, we may need this for notches
                        n.skipPoint = true; 
                    }
                }
                else if ( dObj.line instanceof GeoLine )
                {
                    //TODO! this needs testing, is this even allowed? 
                    console.log("Line! " + n.obj );
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
        for (var a = 0; a < this.detailNodes.length; a++) {

            var n = this.detailNodes[ a ];

            var sa1 = ( typeof n.sa1 !== "undefined" ) ? n.sa1 : this.defaultSeamAllowance;
            var sa2 = ( typeof n.sa2 !== "undefined" ) ? n.sa2 : this.defaultSeamAllowance;

            n.tangentAfterDeg = n.directionAfterDeg + 90;
            if ( n.tangentAfterDeg > 360 )
                n.tangentAfterDeg -= 360;     

            n.tangentBeforeDeg = n.directionBeforeDeg + 90;
                if ( n.tangentBeforeDeg > 360 )
                    n.tangentBeforeDeg -= 360;     

            if ( n.skipPoint )
            {
                console.log( "Node:" + a + " " + n.obj + " skip");
                n.pointBeforeSA = n.point.pointAtDistanceAndAngleDeg( sa1, n.tangentBeforeDeg );
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

                    var sa = sa1 + ( ( sa2-sa1 ) * i/len); //TODO check compatibility

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
                n.pointAfterSA = n.curveSegmentSA.pointAlongPathFraction(1);

                debugSA = " A:" + n.pointBeforeSA.toString() + " B:" + n.pointBeforeSA.toString()                 
            }
            else
            {
                n.pointBeforeSA = n.line.p1.pointAtDistanceAndAngleDeg( sa1, n.tangentBeforeDeg );

                if ( n.tangentAfterDeg )
                    n.pointAfterSA = n.line.p2.pointAtDistanceAndAngleDeg( sa1, n.tangentAfterDeg ); //SA1 seems more compatible? 
                //Note if directionBeforeDeg==directionAfterDeg then there is effectively 1 point, and no intersection is necessary

                n.lineSA = new GeoLine( n.pointBeforeSA, n.pointAfterSA );

                debugSA = " A:" + n.pointBeforeSA.toString() + " B:" + n.pointAfterSA.toString() 
            }

            console.log( "Node:" + a + " " + n.obj + 
                         " directionBeforeDeg:" + ( n.directionBeforeDeg === undefined ? "undefined" : Math.round(n.directionBeforeDeg) ) + 
                         " directionAfterDeg:" + ( n.directionAfterDeg === undefined ? "undefined" : Math.round(n.directionAfterDeg) ) +
                         " sa1:" + ( sa1 ) + " sa2:" + ( sa2 ) +
                         ( n.curveSegment ? " curvesegment" : n.line ? " line" : " UNKNOWN" ) + " " + debugSA);
            pn = n;
        }
        console.log("**********************");
        console.log("**********************");
        console.log("Pass 3 - intersects");

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

            var sa1 = n.sa1;
            var sa2 = n.sa2;

            var angleChange = n.directionBeforeDeg - pn.directionAfterDeg;
            if ( angleChange < -180 )
                angleChange += 360;
            else if ( angleChange > 180 )
                angleChange -= 360;

            if ( Math.abs( angleChange ) > 179.99 )
            {
                console.log("Complete change of direction? n.obj:" + n.obj + " withPrevious:" + pn.obj  );
            }

            if (    ( ( Math.abs( angleChange ) > 0.1 ) || ( sa2 != sa1 ) ) //must be at an angle change, or an sa change
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
                    pn.pointAfterSA = intersect;    
                    n.pointBeforeSA = intersect;            
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
                            var reducedSAPoint = pn.pointAfterSA.pointAtDistanceAndAngleDeg( (sa1-sa2), pn.directionAfterDeg-90 );
                            var saChangeLine = new GeoLine( pn.pointAfterSA, reducedSAPoint );
                            var intersect = this.intersect( saChangeLine, leadingPath );
                            leadingPath = this.clipStart( leadingPath, intersect );
                            pn.reducedSAPoint = intersect;
                            n.pointBeforeSA = intersect;
                        }
                        else //right-hand
                        {
                            //add the bend, with a calculated length and then just join to the leading piece. 
                            //a = acos( sa2/sa1 )
                            var sa1Overlap = sa2 / Math.cos( angleChange / 360 * 2 * Math.PI );
                            var reducedSAPoint = pn.pointAfterSA.pointAtDistanceAndAngleDeg( sa1-sa1Overlap, pn.directionAfterDeg-90 );
                            pn.reducedSAPoint = reducedSAPoint;
                            //leadingPath - nothing to do, we'll just join with a line from reducedSAPoint to its start.
                            //pn.pointAfterSA unchanged;    
                            //n.pointBeforeSA unchanged
                        }
                        
                    }
                    else if ( sa2 > sa1 )
                    {
                        //add the bend to the leading piece, at least (sa2-sa1)
                        if ( angleChange > 0 ) //left hand
                        {
                            //use sa2-sa1 and intersect with the trailing line
                            var increasingSAPoint = n.pointBeforeSA.pointAtDistanceAndAngleDeg( (sa2-sa1), n.directionBeforeDeg-90 );
                            var saChangeLine = new GeoLine( n.pointBeforeSA, increasingSAPoint );
                            var intersect = this.intersect( saChangeLine, trailingPath );
                            trailingPath = this.clipEnd( trailingPath, intersect );
                            pn.pointAfterSA = intersect;
                            n.increasingSAPoint = intersect;
                            //n.pointBeforeSA = intersect;
                        }
                        else //right hand
                        {
                            //add a calculated length bend to the leading piece and just join the path to it. 
                            var sa2overlap = sa1 / Math.cos( angleChange / 360 * 2 * Math.PI );
                            var increasingSAPoint = n.pointBeforeSA.pointAtDistanceAndAngleDeg( sa2-sa2overlap, n.directionBeforeDeg-90 );
                            //trailingPath - nothing to do
                            //pn.pointAfterSA no change
                            //n.pointBeforeSA no change
                            n.increasingSAPoint = increasingSAPoint;
                        }
                    }
                }
                else
                {
                    console.log( "Angle change less than " + matingAngle2 + " need to intersect extensions" );

                    //we extend both lines and intersect
                    var trailExtensionLine = new GeoLine( pn.pointAfterSA, pn.pointAfterSA.pointAtDistanceAndAngleDeg( 10, pn.directionAfterDeg ) );
                    var leadingExtensionLine = new GeoLine( n.pointBeforeSA.pointAtDistanceAndAngleDeg( -10, n.directionBeforeDeg ), n.pointBeforeSA );
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
                        trailingPath = new GeoLine( pn.pointBeforeSA, intersect ); //this is still just a straight line as we extended it straight
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
                        leadingPath = new GeoLine( intersect, n.pointAfterSA );                    
                    }

                    pn.pointAfterSA = intersect;
                    n.pointBeforeSA = intersect;
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


    svgPath( withSeamAllowance )
    {
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
                    path = ( ! path  ?  "M" : path + "L" ) + this.roundForSVG( pn.reducedSAPoint.x ) + " " + this.roundForSVG( pn.reducedSAPoint.y ) + " ";

                if ( n.increasingSAPoint ) //nb if !path then M rather than L as below? 
                    path = ( ! path ? "M" : path + "L" ) + this.roundForSVG( n.increasingSAPoint.x ) + " " + this.roundForSVG( n.increasingSAPoint.y ) + " ";
            }

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
                    path = "M" + this.roundForSVG( thisP.x ) + " " + this.roundForSVG( thisP.y ) + " ";
                    console.log( "Move to " + n.obj );
                }
                else
                {
                    path += "L" + this.roundForSVG( thisP.x ) + " " + this.roundForSVG( thisP.y ) + " ";
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


    roundForSVG( n )
    {
        return Math.round( n * 1000 ) / 1000;
    }


    drawNotches( g )
    {
        var notches = g.append("g").attr("id","notches");
        console.log("*********");
        console.log("notches: " + this.name );

        var pn = this.detailNodes[ this.detailNodes.length -1 ];

        for (var a = 0; a < this.detailNodes.length; a++) 
        {
            var n = this.detailNodes[ a ];

            if ( typeof n.notch === "undefined" )
                continue;
         
            //TODO if no SA, then create a point at an internal tangent
            var path = "M" + this.roundForSVG( n.point.x ) + " " + this.roundForSVG( n.point.y ) + "L" + this.roundForSVG( n.pointBeforeSA.x ) + " " + this.roundForSVG( n.pointBeforeSA.y );

            //TODO should we connect these D3 data-wise to the notches
            var p = notches.append("path")
                .attr("d", path )
                .attr("fill", "none")
                .attr("stroke", "purple")
                .attr("stroke-width", this.getStrokeWidth() ); //TODO this has to be set according to scale

        };
    }    
}