//(c) Copyright 2023 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Piece {

    constructor (data, patternPiece) {
        this.data = data;
        this.patternPiece = patternPiece;
        this.name = data.name;
        this.detailNodes = data.detailNode;
        this.internalPaths = data.internalPath;
        this.dataPanels = data.dataPanel;
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
                
        if ( this.dataPanels )
            for( var i in this.dataPanels )
            {
                var panel = this.dataPanels[i];
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

            //TODO if a curve or arc then we need to look at previous/next like we do for the seam line. 


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


    drawMarkings( g )
    {
        var lineSpacing = 1.2;
        var fontSize = this.convertMMtoPatternUnits( 8 ); //8mm equiv
        var align = "start";

        if ( this.dataPanels )
        for( var i in this.dataPanels )
        {
            var panel = this.dataPanels[i];

            if ( ! panel.dataItem )
                continue;

            var x = undefined;
            var y = undefined;
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
                var bounds = new Bounds();
                this.adjustBounds( bounds );
                x = ( bounds.minX + bounds.maxX ) / 2;
                y = ( bounds.minY + bounds.maxY ) / 2;
                align = "middle";
            }


            var dataPanelGroup = g.append("g")
                                  .attr("id","data panel:" + panel.letter )
                                  .attr("transform", "translate(" + x + "," + y + ")" );

            for( var j in panel.dataItem )
            {
                var dataItem = panel.dataItem[ j ];
                var text = dataItem.text;

                if ( text.includes( "%date%" ) )
                {
                    const t = new Date();
                    const date = ('0' + t.getDate()).slice(-2);
                    const month = ('0' + (t.getMonth() + 1)).slice(-2);
                    const year = t.getFullYear();
                    text = text.replace("%date%", `${year}-${month}-${date}` );
                }

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
                    var patternNumber = this.patternPiece.pattern.patternData.patternNumber;
                    if ( patternNumber === undefined )
                        patternNumber = "";
                    text=text.replace( "%patternNumber%", patternNumber );
                }

                if ( text.includes( "%patternName%" ) )
                    text=text.replace( "%patternName%", this.patternPiece.pattern.patternData.name );

                dataPanelGroup.append("text")
                              .attr("x", 0 )
                              .attr("y", j*lineSpacing*fontSize )
                              .attr("text-anchor", align ) //dominant-baseline="middle"
                              .attr("font-size", fontSize )
                              .text( text );
                ;
            }
        }
    }


    convertMMtoPatternUnits( mm )
    {
        if ( this.patternPiece.pattern.units = "cm" )
            return mm/10;
        else if ( this.patternPiece.pattern.units = "mm" )
            return mm;
        else //inches
            return mm/25.4;
    }


    getStrokeWidth( isOutline, isSelected )
    {
        if ( this.patternPiece.pattern.data.options.lifeSize ) 
            return this.convertMMtoPatternUnits(0.7); //0.7mm equiv
            
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