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


    svgPath( withSeamAllowance )
    {
        var path = "";
        var first = true; 

        var d3Path = d3.path();

        //d3Path.move();

        var pObj;
        var nObj;
        var previousP; //not adjusted for seam allowance
        var previousP_SA; //adjusted for seam allowance
        var previousDirectionDeg; //same for SA and not SA
        var sa = 0.2;

        for (var a = 0; a < this.detailNodes.length+1; a++) {  //+1 because we circle right around to the start

            var n = this.detailNodes[ ( a == this.detailNodes.length ) ? 0 : a ]; //circle back to the first object at the end. 
            var pn = this.detailNodes[ a-1 < 0 ? a-1+this.detailNodes.length : a-1 ]; 
            var nn = this.detailNodes[ a+1 >= this.detailNodes.length ? a+1-this.detailNodes.length : a+1 ];
         
            if ( a == this.detailNodes.length )
                console.log("Closing path");

            var dObj = n.dObj;
            var pObj = pn.dObj;
            var nObj = nn.dObj;

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

                    //TODO it might be that we need to see whether node 0, or n-1 is closer
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

                    var curveSegmentToDraw = curveSegment;
                    if ( withSeamAllowance ) 
                    {    
                        var nodeData = [];
                        var len = curveSegment.nodeData.length;                    
                        for ( var i=0; i<len; i++ )
                        {
                            var node = curveSegment.nodeData[i];

                            var newNode = {};
                            nodeData[i] = newNode;
                            //var line = ( node.outControlPoint ) ? new GeoLine( node.point, node.outControlPoint ) : new GeoLine( node.inControlPoint, node.point );
                            //var angle = line.angleDeg();
                            var angle = curveSegment.angleLeavingNode(i);
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
                        curveSegmentToDraw = new GeoSpline( nodeData );
                    }

                    path = curveSegmentToDraw.svgPath( path ) + " ";

                    previousP = curveSegment.pointAlongPathFraction(100);
                    previousDirectionDeg = curveSegment.exitAngleDeg(); //or curveSegmentToDraw?
                }
                //TODO else if an ARC
                else
                {
                    console.log( "Other node " + n.obj + " previous:" + pn.obj + " next:" + nn.obj );

                    //Imagine the line from pObj to dObj
                    //if 0 deg, then create new points at 90deg. 
                    //90deg then 180deg
                    //180deg then 270deg
                    //270deg then 360deg (aka 0deg)
                    var prevP = previousP; //pObj.p;
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

                    if (( ! samePoint ) || ( a == this.detailNodes.length ))
                    {
                        if ( withSeamAllowance )
                        {       
                            var angle = line.angleDeg();
                            angle = angle + 90;
                            if ( angle > 360 )
                                angle -= 360;     

                            prevP = prevP.pointAtDistanceAndAngleDeg( sa, angle );
                            thisP = thisP.pointAtDistanceAndAngleDeg( sa, angle );
                        }

                        if ( first )
                        {
                            path += "M " + prevP.x + " " + prevP.y + " ";
                            first = false;
                        }

                        path += "L " + thisP.x + " " + thisP.y + " ";
                        console.log( "Line to " + n.obj );//+ " startAt:" + pn.obj + " endAt:" + nn.obj );
                        previousP = dObj.p;
                        previousDirectionDeg = (new GeoLine( previousP, thisP )).angleDeg();
                    }
                    else
                        console.log("Same point, no progress");
                }
                console.log("Index:" + a + " ends at " + previousP.toString() + ", direction " + Math.round(previousDirectionDeg) );
            }

                    
        };

        //TODO actually close the SVG path? 

        //TODO expand the zoomed/scaled area to take into account the border thickness! and/or the seam allowance line

        console.log( "Path: " + path );

        return path;        
    }
}