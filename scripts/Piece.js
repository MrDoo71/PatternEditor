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
                const pinsToResolve = ["center", "topLeft", "bottomRight", "top", "bottom"];
                for ( const s of pinsToResolve )
                    if ( panel[s] ) 
                        panel[s] = resolve( panel[s], true );

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

                //type===Grainline doesn't have height or width
                if ( panel.type === "Grainline" )
                {
                    panel.length = panel.length ? drawing.newFormula( panel.length ) : undefined;
                }
                else
                {                
                    panel.height = panel.height ? drawing.newFormula( panel.height ) : 0;
                    panel.width = panel.width ? drawing.newFormula( panel.width ) : 0;
                }
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
                 .attr("stroke-width", ( this.getStrokeWidth()/2) ); //TODO this has to be set according to scale;
        
        if ( p.seamAllowance )
            p.attr("stroke-dasharray", "2,0.2" );

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


    drawMarkings( g, editorOptions )
    {
        const useExportStyles = editorOptions.downloadOption;

        if ( this.ignore )
            return;
        

        if ( this.dataPanels )
        {
            for( const panel of this.dataPanels )
            {
                if ( panel.type === "Grainline" )
                    this.drawGrainLine( g, editorOptions, panel );
                else
                    this.drawDataPanel( g, useExportStyles, panel );
            }
        }
    }


    drawGrainLine( g, editorOptions, grainline )
    {
        //Rotation
        //CenterPin
        //Length
        //TopLeft / BottomRight ?????
        //Arrows Front Both ????
        //Visible TODO
        //MX/MY not needed
        const useExportStyles = editorOptions.downloadOption;
        let end1, end2;

        if (( typeof grainline.top === "object" ) && ( typeof grainline.bottom === "object" ))
        {
            end1 = grainline.bottom.p;
            end2 = grainline.top.p; //Front
        }
        else
        {
            const length = ( typeof grainline.length === "object" ) ? grainline.length.value() : undefined;    
            if ( ! length )
                return;

            let x,y;
            if ( typeof grainline.center === "object" )
            {   
                x = grainline.center.p.x;
                y = grainline.center.p.y;
            }
        
            //If nothing useful, then center the panel in the piece's bounds
            if ( x === undefined ) 
            {
                const bounds = new Bounds();
                this.adjustBounds( bounds );
                x = ( bounds.minX + bounds.maxX ) / 2;
                y = ( bounds.minY + bounds.maxY ) / 2;
            }

            const center = new GeoPoint( x, y );
            end1 = center.pointAtDistanceAndAngleDeg( length/2, grainline.rotation + 180 );
            end2 = center.pointAtDistanceAndAngleDeg( length/2, grainline.rotation );
        }

        const l = g.append("line")
                    .attr("class","grainline")
                    .attr("x1", end1.x)
                    .attr("y1", end1.y)
                    .attr("x2", end2.x)
                    .attr("y2", end2.y)
                    .attr("stroke-width", this.getStrokeWidth() );
        
        const arrowurl = "url(#" + editorOptions.arrowId + ")";
        const arrows = grainline.arrows ? grainline.arrows : "Both";
        if (    ( arrows === "Rear" ) 
             || ( arrows === "Both" ) )
            l.attr( "marker-start", arrowurl );

        if (    ( arrows === "Front" ) 
             || ( arrows === "Both" ) )
             l.attr( "marker-end", arrowurl );

        if ( useExportStyles )
            l.attr("stroke", "black");
    }


    drawDataPanel( g, useExportStyles, panel )
    {
        const lineSpacing = 1.2;
        const dataItems = panel.type === "Info" ? this.drawing.pattern.patternData.labelline : panel.dataItem;        

        if (    ( ! dataItems )
             || ( dataItems.length === 0 ) )
            return; 

        //Note: the fontSize specified by the pattern will act as a max
        //font size if the available width is greater than the text needs.
        //But if there is too much text for the width and size then the 
        //text will be shrunk. 
        const baseFontSizePts = panel.fontSize == 0 ? 16 : panel.fontSize;

        //in pattern units
        let fontSize = this.drawing.pattern.getPatternEquivalentOfPT( baseFontSizePts ); 

        let width = ( typeof panel.width === "object" ) ? panel.width.value() : undefined;        
        let height = ( typeof panel.height === "object" ) ? panel.height.value() : undefined;        
    
        let align = "start";                

        let x;
        let y;

        //Specify two corners, overrides specified height/width
        if (( typeof panel.topLeft === "object" ) && ( typeof panel.bottomRight === "object" ))
        {
            x = panel.topLeft.p.x;
            y = panel.topLeft.p.y;

            width = panel.bottomRight.p.x - x;
            height = panel.bottomRight.p.y - y;
        }
        else if ( typeof panel.topLeft === "object" ) 
        {   
            x = panel.topLeft.p.x;
            y = panel.topLeft.p.y;
            //nb we'll use the specified width/height if populated
        }        
        else if ( typeof panel.center === "object" )
        {   
            x = panel.center.p.x;
            y = panel.center.p.y;
            //nb we'll use the specified width/height if populated
            align = "middle"; //We'll center align text
        }
        else if ( typeof panel.bottomRight === "object" )
        {
            x = panel.bottomRight.p.x;
            y = panel.bottomRight.p.y;
            //nb we'll use the specified width/height if populated
            align = "end"; 
        }

        //If nothing useful, then center the panel in the piece's bounds
        if ( x === undefined ) 
        {
            const bounds = new Bounds();
            this.adjustBounds( bounds );
            x = ( bounds.minX + bounds.maxX ) / 2;
            y = ( bounds.minY + bounds.maxY ) / 2;
            align = "middle";
            y = y + (dataItems.length * fontSize * lineSpacing / 2)
        }

        //Panel has a fontsize specfieid in points.  This is the em for the font, and we'll 
        //approximate this as the width of an m, even though thats not quite what it means. 

        const dataLines = [];
        let minFontSize = panel.fontSize;
        let maxFontSize = panel.fontSize; 
        let maxLineLengthPts = 0;
        let labelHeightPts = 0;
        
        for( const dataItem of dataItems )
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

            if ( text.includes( "%pFileName%" ) )
            {
                //We don't have the concept of a filename 
                text=text.replace( "%pFileName%", "" );
                if ( text.length === 0 )
                    continue; //omit line if it would now be empty
            }

            if ( text.includes( "%mFileName%" ) )
                text=text.replace( "%mFileName%", this.drawing.pattern.patternData.measurementsName ); 

            if ( text.includes( "%author%" ) )
            {
                const author = this.drawing.pattern.patternData.author;
                text=text.replace( "%author%", author ? author : "" );
                if ( text.length === 0 )
                    continue; //omit line if it would now be empty 
            }
    
            if ( text.includes( "%patternNumber%" ) )
            {
                let patternNumber = this.drawing.pattern.patternData.patternNumber;
                if ( patternNumber === undefined )
                    patternNumber = "";
                text=text.replace( "%patternNumber%", patternNumber );
            }

            if ( text.includes( "%patternName%" ) )
                text=text.replace( "%patternName%", this.drawing.pattern.patternData.name );

            dataItem.processedText = text;
            dataItem.fontSizePts = baseFontSizePts + ( dataItem.fontSizeIncrement ? dataItem.fontSizeIncrement : 0 );
            dataItem.lineHeightPts = dataItem.fontSizePts * lineSpacing;

            const lineLengthPts = text?.length * dataItem.fontSizePts * 0.5; //TODO + sfIncrement
            if ( lineLengthPts > maxLineLengthPts )
                maxLineLengthPts = lineLengthPts;

            labelHeightPts += dataItem.lineHeightPts;
        }

        //panel with pts
        const maxLineWidthPatternUnits = this.drawing.pattern.getPatternEquivalentOfPT( maxLineLengthPts );
        //console.log( "Max line length (local): " + maxLineWidthPatternUnits );

        //So if we have a data panel with of 4inch, but long text in a large font size, then something
        //has to give. So scale the fontsize. 
        let panelScaleX = 1;
        let panelScaleY = 1;
        if (    width > 0
             && maxLineWidthPatternUnits > 0 )
            panelScaleX = width / maxLineWidthPatternUnits;

        //TODO update this with sfIncrement
        const heightInPatternUnits = this.drawing.pattern.getPatternEquivalentOfPT( labelHeightPts );
        if (   height > 0
            && heightInPatternUnits > 0 )
           panelScaleY = height / heightInPatternUnits;

        const fontSizeScaling = Math.min( 1, panelScaleX, panelScaleY );
        fontSize *= fontSizeScaling;

        if ( align === "middle" )
        {
            y -= dataItems.length * fontSize * lineSpacing / 2;
            x -= fontSizeScaling * maxLineWidthPatternUnits / 2;
        }

        let transform = "translate(" + x + "," + y + ")";

        //for better compatibility we should rotate around the centre point
        //at least if "middle"
        if ( panel.rotation )
            transform += " rotate(" + ( -1 * panel.rotation ) + ")";

        const dataPanelGroup = g.append("text")
                                .attr("id","data panel:" + panel.letter )
                                .attr("class","patternlabel")
                                .attr("transform", transform )
                                .attr("font-size", fontSize );

        for( const dataItem of dataItems )
        {
            let text = dataItem.processedText;

            const tspan = dataPanelGroup.append("tspan")
                            .attr("x", "0" )
                            .attr("dy", this.drawing.pattern.getPatternEquivalentOfPT( dataItem.lineHeightPts * fontSizeScaling ) )
                          //TODO  dataItem.alignmentType left/right/center/default
                          //  .attr("text-anchor", align )
                            .text( text );

            if ( dataItem.bold )
                tspan.attr( "font-weight", "bold" );

            if ( dataItem.italic )
                tspan.attr( "font-style", "italic" );

            if ( dataItem.fontSizeIncrement )
                tspan.attr( "font-size", this.drawing.pattern.getPatternEquivalentOfPT( dataItem.fontSizePts * fontSizeScaling ) );
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
            this.drawMarkings( g, editorOptions ); //label, grainline
            this.drawLabelsAlongSeamLine( g, useExportStyles );
        }
    }
}