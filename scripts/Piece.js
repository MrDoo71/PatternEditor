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
                 .attr("stroke-width", 0.05 ); //TODO this has to be set according to scale
    }


    drawSeamAllowance( g ) 
    {
        console.log("Time to draw seam allowance: ", this.name );

        var p = g.append("path")
                 .attr("d", this.svgPath( true ) )
                 .attr("fill", "none")
                 .attr("stroke", "green")
                 .attr("stroke-width", 0.05 ); //TODO this has to be set according to scale
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

            if ( a === 0 )          
            {
                if ( dObj.curve instanceof GeoSpline )
                    previousP = dObj.curve.pointAlongPathFraction(100);
                else
                    previousP = dObj.p;

                console.log( "Start at " + n.obj + " delay drawing starting at " + previousP.toString() );
            }
            else 
            {                
                if ( dObj.curve instanceof GeoSpline )
                {
                    //TODO what if previousP isn't on the spline? Connect a line from previousP to the start of the spline

                    console.log( "Curve " + n.obj + " previous:" + pn.obj + " next:" + nn.obj );

                    var nextP = nObj.curve instanceof GeoSpline ? nObj.curve.pointAlongPathFraction( nn.reverse?100:0 ) : nObj.p;

                    var curveSegment = dObj.curve.splineBetweenPoints( previousP, nextP );

                    var correctDirection = curveSegment.nodeData[0].point.equals( previousP ); 

                    if ( ! correctDirection )
                    {
                        //maybe it doesn't match completely? 
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

                    if ( previousP && previousP.equals( curveSegment.pointAlongPathFraction(0) ) )
                    {
                        if (( ! pn.dObj.curve ) || ( ! pn.dObj.curve instanceof GeoSpline ))
                            pn.skipPoint = true;
                    }

                    previousP = curveSegment.pointAlongPathFraction(100);
                    n.directionBeforeDeg = curveSegment.entryAngleDeg();
                    n.directionAfterDeg = curveSegment.exitAngleDeg(); //or curveSegmentToDraw?
                    n.curveSegment = curveSegment;
                }
                //TODO else if an ARC
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

                    if (( ! samePoint ) || ( a == this.detailNodes.length )) //not the same point, or the last point
                    {
                        console.log( "Line to " + n.obj );//+ " startAt:" + pn.obj + " endAt:" + nn.obj );
                        n.point = thisP;
                        previousP = thisP;
                        var anglePreviousPThisP = (new GeoLine( previousP, thisP )).angleDeg();

                        if ( ! pn.directionAfterDeg )
                            pn.directionAfterDeg = anglePreviousPThisP;

                        n.directionBeforeDeg = anglePreviousPThisP;
                        n.skipPoint = false; 
                    }
                    else
                    {
                        console.log("Same point, no progress");
                        n.skipPoint = true; 
                    }
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
                    var angle = n.curveSegment.angleLeavingNode(i); //TODO we could allow for pointy nodes by using angleArrivingNode for the inControlPoint
                    angle = angle + 90;
                    if ( angle > 360 )
                        angle -= 360;     

                    newNode.point = node.point.pointAtDistanceAndAngleDeg( sa, angle );
                    if ( node.inControlPoint )
                        newNode.inControlPoint = node.inControlPoint.pointAtDistanceAndAngleDeg( sa, angle );
                    if ( node.outControlPoint )
                        newNode.outControlPoint = node.outControlPoint.pointAtDistanceAndAngleDeg( sa, angle );
                    //TODO
                    //We can do slightly better still, for each step/simplespline how much bigger is the new curve (distance between start/end nodes), and scale the length of the control points accordingly. 
                    //Now, for each step/simplespline chose points 0.1 0.5 and 0.9 along the old and new curve and measure the distance.  If the distance is
                    //not in tolerance, then split the spline by adding a new control point, and remember to cycle around. 
                }
                n.curveSegmentSA  = new GeoSpline( nodeData );
                n.pointBeforeSA = n.curveSegmentSA.pointAlongPathFraction(0);
                n.pointAfterSA = n.curveSegmentSA.pointAlongPathFraction(100);

                debugSA = " A:" + n.pointBeforeSA.toString() + " B:" + n.pointBeforeSA.toString()                 
            }
            else
            {
                n.pointBeforeSA = n.point.pointAtDistanceAndAngleDeg( sa, n.directionBeforeDeg );
                n.pointAfterSA = n.point.pointAtDistanceAndAngleDeg( sa, n.directionAfterDeg );
                //Note if directionBeforeDeg==directionAfterDeg then there is effectively 1 point, and no intersection is necessary

                debugSA = " A:" + n.pointBeforeSA.toString() + " B:" + n.pointBeforeSA.toString() 
            }

            console.log( "Node:" + a + " " + n.obj + " directionBeforeDeg:" + Math.round(n.directionBeforeDeg) + " directionAfterDeg:" + Math.round(n.directionAfterDeg) +  ( n.curveSegment ? " curvesegment" : "" ) + " " + debugSA);

        }
        console.log("**********************");
    }


    svgPath( withSeamAllowance )
    {
        console.log("*********");
        console.log("svgPath: " + this.name + " seamAllowance:" + withSeamAllowance );

        var path = "";
        var first = true; 
        var previousP; //not adjusted for seam allowance
        var sa = 0.2;

        for (var a = 0; a < this.detailNodes.length+1; a++) {  //+1 because we circle right around to the start

            var n = this.detailNodes[ ( a == this.detailNodes.length ) ? 0 : a ]; //circle back to the first object at the end. 
            var pn = this.detailNodes[ a-1 < 0 ? a-1+this.detailNodes.length : a-1 ]; 
            var nn = this.detailNodes[ a+1 >= this.detailNodes.length ? a+1-this.detailNodes.length : a+1 ];
         
            if ( a == this.detailNodes.length )
                console.log("Closing path");

            var dObj = n.dObj;

            if ( a === 0 )          
            {
                if ( dObj.curve instanceof GeoSpline )
                    previousP = dObj.curve.pointAlongPathFraction(100);
                else
                    previousP = dObj.p;

                console.log( "Start at " + n.obj + " delay drawing starting at " + previousP.toString() );
            }
            else 
            {                
                if ( n.curveSegment )
                {
                    console.log( "Curve " + n.obj + " previous:" + pn.obj + " next:" + nn.obj );

                    var curveSegmentToDraw = withSeamAllowance ? n.curveSegmentSA : n.curveSegment;

                    path = curveSegmentToDraw.svgPath( path ) + " ";
                    previousP = curveSegmentToDraw.pointAlongPathFraction(100);
                }
                //TODO else if an ARC
                else if ( ! n.skipPoint )
                {
                    console.log( "Other node " + n.obj + " previous:" + pn.obj + " next:" + nn.obj );

                    var prevP = previousP;
                    var thisP = withSeamAllowance ? n.pointAfterSA : dObj.p;

                    if ( first )
                    {
                        path += "M " + prevP.x + " " + prevP.y + " ";
                        first = false;
                    }

                    path += "L " + thisP.x + " " + thisP.y + " ";
                    console.log( "Line to " + n.obj );//+ " startAt:" + pn.obj + " endAt:" + nn.obj );
                    previousP = thisP;
                }
                console.log("Index:" + a + " ends at " + previousP.toString() + ", direction " + Math.round(n.directionAfterDeg) );
            }
        };

        //TODO actually close the SVG path? 

        //TODO expand the zoomed/scaled area to take into account the border thickness! and/or the seam allowance line

        console.log( "Path: " + path );

        return path;        
    }
}