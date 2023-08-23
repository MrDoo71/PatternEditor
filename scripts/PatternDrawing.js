//(c) Copyright 2019 Jason Dore
//https://github.com/MrDoo71/PatternEditor



class PatternDrawing {

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
        this.visibleBounds = new Bounds();
        this.groups = [];
        this.pieces = []; //aka details

        if ( pattern ) //always true, except in some test harnesses
        {
            this.bounds.parent = pattern.bounds;
            this.visibleBounds.parent = pattern.visibleBounds;
        }

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


            this.drawing[dObj.data.name] = dObj;
            dObj.drawing = this;    
            this.calculateObj(dObj);
        }

        //Take each group in the JSON and convert to an object. 
        //After this the isVisible() method on the drawingObject will work. 
        if ( this.data.group )
            for (var a = 0; a < this.data.group.length; a++) {
                this.groups[a] = new Group( this.data.group[a], this );
            }
        
        if ( this.data.piece )
            for (var a = 0; a < this.data.piece.length; a++) {
                this.pieces[a] = new Piece( this.data.piece[a], this );
            }

        var options = this.pattern.data.options; 
        if ( options && ( typeof options.targetPiece === "object" ) )
        {
            options.targetPiece.adjustBounds( this.visibleBounds );
        }
        else if ( options && ( options.targetPiece === "all" ) ) //TODO also an array with specific multiple pieces specified
        {
            for (var a = 0; a < this.pieces.length; a++) {
                this.pieces[a].adjustBounds( this.visibleBounds, true );
            }
        }
        else
        {
            //This ensures the seam allowance is included in the bounds
            if (( this.data.piece ) && ( ! options.skipPieces ))
                for (var a = 0; a < this.data.piece.length; a++) {
                    this.pieces[a].adjustBounds( this.visibleBounds  );
                }

            //Calculate the visible bounds            
            this.drawingObjects.forEach( function(dObj){
                if (   ( dObj.isVisible( options ) )
                    && ( dObj.data.lineStyle !== "none" ) )         
                    try {
                        dObj.adjustBounds( this.visibleBounds );
                    } catch ( e ) {
                        console.log("Error adjusting bounds for " + dObj.name + " ", e );
                    }
            }, this) ;
        }

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
        else if (dObj.objectType === "arcWithLength")
            return new ArcWithLength(dObj);                              
        else 
        {
            var fail = new PointSingle( {x:0, y:0, contextMenu:dObj.contextMenu } );
            fail.error =  "Unsupported drawing object type:" + dObj.objectType;
            return fail;
        }

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
                const v = f.expression.value(currentLength);
                if ( Number.isNaN( v ) )
                    throw "Formula result is not a number. ";
                return v;
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

    calculateObj(dObj) {

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
        return dObj;
    }

    add(data) {
        console.log("Add() is this used anywhere?");

        if (this.defaults) {
            for (var d in this.defaults) {
                if (typeof data[d] === "undefined")
                    data[d] = this.defaults[d];
            }
        }
        var dObj = this.newDrawingObj(data);
        this.drawingObjects.push(dObj);
        this.drawing[dObj.data.name] = dObj;
        dObj.drawing = this;
        this.calculateObj(dObj);
        return dObj;
    }


    setDefaults(defaults) {
        this.defaults = defaults;
    }


    //Add a label (to svg group g) positioned midway along path
    drawLabelAlongPath( g, path, label, fontSize, followPathDirection )
    {
        //const d = this.data; //the original json data
        fontSize = fontSize !== undefined ? fontSize : Math.round( 1300 / scale / fontsSizedForScale )/100;
        
        try {
            const p = path.pointAlongPathFraction(0.5);
            var a = 0; //horizontal, unless we get an angle. 
            if ( path instanceof GeoLine  )
            {
                a = path.angleDeg();
            }
            else if ( path instanceof GeoSpline )
            {
                const p2 = path.pointAlongPathFraction(0.5001);
                const lineSegment = new GeoLine(p, p2);
                a = lineSegment.angleDeg();
            }

            if ( ! p )
                throw "Failed to determine position for label";

            {
                var baseline = "middle";
                var align = "middle";
                var ta = 0;
                var dy = 0;
                //const patternUnits = this.drawing.pattern.units;
                // /const spacing = (fontSize * 0.2);
                const spacing = this.pattern.getPatternEquivalentOfMM(1);
    
                if ( followPathDirection )
                {
                    baseline = "hanging"; //For Safari, handing doesn't work once rotated
                    ta = -a;
                    //p.y += spacing;
                    dy = spacing;
                }
                else
                {
                    // East(ish)
                    if ((( a >= 0 ) && ( a <45 )) || (( a > 270 ) && ( a <= 360 )))
                    {
                        baseline = "hanging"; //For Safari, handing doesn't work once rotated
                        ta = - a;
                        //p.y += spacing;
                        dy = spacing;
                    }
                    // West(ish)
                    else if (  (( a >= 135 ) && ( a <225 )) 
                    )//|| (( a > 270 ) && ( a <315 ))  )
                    {
                        baseline = "hanging";
                        ta = - (a-180);
                        //p.y += spacing;
                        dy = spacing;
                    }
                    //North(ish)
                    else if (( a > 45 ) && ( a < 135 )) 
                    {
                        baseline = "middle";//"auto"
                        align = "middle";
                        ta = -a;
                        p.x -= spacing;
                    }
                    //South(ish)
                    else if (( a > 225 ) && ( a <= 270 )) 
                    {
                        baseline = "auto"
                        align = "middle";
                        ta = - ( a-180 );
                        p.x -= spacing;
                    }
                }

                g.append("text")
                .attr("class","length")
                .attr( "transform", "translate(" + p.x + "," + p.y +  ") rotate("+ta+")" )
                .attr( "dominant-baseline", baseline ) //if we're drawing below the line. 
                .attr( "text-anchor", align ) //if we're drawing to the left of the line
                .attr( "dy", dy + "px" ) //need to also scale this
                .attr("font-size", fontSize + "px")
                .text( label ); //TODO make this more generic to cater for different types.
    
            }
        } catch ( e ) {
            console.log( "Failed to show length. ", e );            
        }
    }    
}

