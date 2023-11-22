//(c) Copyright 2019 Jason Dore
//https://github.com/MrDoo71/PatternEditor



class PatternDrawing {

    constructor (data, pattern) {
        this.data = data;
        this.drawing = {};
        this.pattern = pattern;
        this.textPathSeq = 0;

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
        for ( const a in this.drawingObjects ) {
            let dObj = this.drawingObjects[a];
            dObj = this.newDrawingObj(dObj);
            
            if (dObj === null)
                continue;
            
            this.drawingObjects[a] = dObj; //these are now the objects with methods
            this.drawing[dObj.data.name] = dObj;
            dObj.drawing = this;    
            this.calculateObj(dObj);
        }

        //Take each group in the JSON and convert to an object. 
        //After this the isVisible() method on the drawingObject will work. 
        if ( this.data.group )
            for ( let a=0; a<this.data.group.length; a++ ) {
                this.groups[a] = new Group( this.data.group[a], this );
            }
        
        if ( this.data.piece )
            for ( let a=0; a<this.data.piece.length; a++ ) {
                this.pieces[a] = new Piece( this.data.piece[a], this );
            }

        const options = this.pattern.data.options; 
        if ( options && ( typeof options.targetPiece === "object" ) )
        {
            options.targetPiece.adjustBounds( this.visibleBounds );
        }
        else if ( options && ( options.targetPiece === "all" ) ) //TODO also an array with specific multiple pieces specified
        {
            for ( const p of this.pieces ) {
                p.adjustBounds( this.visibleBounds, true );
            }
        }
        else
        {
            //This ensures the seam allowance is included in the bounds
            if (( this.data.piece ) && ( ! options.skipPieces ))
                for ( const p of this.data.piece ) {
                    p.adjustBounds( this.visibleBounds  );
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

        const objOnThisPiece = this.drawing[name];
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
        switch( dObj.objectType )
        {
            case "pointSingle":               return new PointSingle(dObj);
            case "pointEndLine":              return new PointEndLine(dObj);
            case "pointAlongLine":            return new PointAlongLine(dObj);
            case "pointAlongPerpendicular":   return new PointAlongPerpendicular(dObj);
            case "pointAlongBisector":        return new PointAlongBisector(dObj);            
            case "pointFromXandYOfTwoOtherPoints": return new PointFromXandYOfTwoOtherPoints(dObj);
            case "pointIntersectLineAndAxis": return new PointIntersectLineAndAxis(dObj);
            case "line":                      return new Line(dObj);
            case "pointLineIntersect":        return new PointLineIntersect(dObj);
            case "pointIntersectArcAndAxis":  return new PointIntersectArcAndAxis(dObj);
            case "pointIntersectArcAndLine":  return new PointIntersectArcAndLine(dObj);
            case "perpendicularPointAlongLine": return new PerpendicularPointAlongLine(dObj);
            case "pointOfTriangle":           return new PointOfTriangle(dObj);            
            case "pointShoulder":             return new PointShoulder(dObj);            
            case "arcSimple":                 return new ArcSimple(dObj);
            case "arcElliptical":             return new ArcElliptical(dObj);
            case "splineSimple":              return new SplineSimple(dObj);
            case "splineUsingPoints":         return new SplineUsingControlPoints(dObj);
            case "splinePathInteractive":     return new SplinePathInteractive(dObj);
            case "splinePathUsingPoints":     return new SplinePathUsingPoints(dObj);
            case "cutSpline":                 return new CutSpline(dObj);
            case "pointCutSplinePath":        return new PointCutSplinePath(dObj);      
            case "pointCutArc":               return new PointCutArc(dObj);                              
            case "pointIntersectCurves":      return new PointIntersectCurves(dObj);      
            case "pointIntersectCurveAndAxis":return new PointIntersectCurveAndAxis(dObj);      
            case "pointIntersectArcs":        return new PointIntersectArcs(dObj);      
            case "pointIntersectCircles":     return new PointIntersectCircles(dObj);                  
            case "operationMove":             return new OperationMove(dObj);                  
            case "operationRotate":           return new OperationRotate(dObj);                  
            case "operationFlipByAxis":       return new OperationFlipByAxis(dObj);                  
            case "operationFlipByLine":       return new OperationFlipByLine(dObj);                  
            case "operationResult":           return new OperationResult(dObj);                  
            case "pointFromArcAndTangent":    return new PointFromArcAndTangent(dObj);                  
            case "pointFromCircleAndTangent": return new PointFromCircleAndTangent(dObj);                  
            case "trueDart":                  return new TrueDart(dObj);                              
            case "trueDartResult":            return new TrueDartResult(dObj);                              
            case "arcWithLength":             return new ArcWithLength(dObj);                              
        default:
            const fail = new PointSingle( {x:0, y:0, contextMenu:dObj.contextMenu } );
            fail.error =  "Unsupported drawing object type:" + dObj.objectType;
            return fail;
        }
    }

    newFormula(formula) {

        const patternUnits = this.pattern.units;
        const f = formula;
        if (typeof formula.constant !== "undefined") {
            f.value = function () {
                return this.constant;
            };
            f.html = function() {
                return this.constant;
            };
            f.htmlLength = function() {
                const precision = patternUnits === "mm" ? 10.0 : 100.0;
                const s = Math.round( precision * this.constant ) / precision;
                return '<span class="const">' + s + " " + patternUnits + '</span>';
            };
            f.htmlAngle = function() {
                const s = Math.round( 10.0 * this.constant ) / 10.0;
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
                let s = f.expression.html( asFormula, currentLength );
                if ( ! asFormula )
                {
                    const precision = patternUnits === "mm" ? 10.0 : 100.0;
                    s = Math.round( precision * s ) / precision;
                    s += " " + patternUnits;
                }
                return s;
            };
            f.htmlAngle = function( asFormula, currentLength ) {
                let s = f.expression.html( asFormula, currentLength );
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
        const dObj = this.add( data );
        return dObj;
    }

    add(data) {
        console.log("Add() is this used anywhere?");

        if (this.defaults) {
            for (const d in this.defaults) {
                if (typeof data[d] === "undefined")
                    data[d] = this.defaults[d];
            }
        }
        const dObj = this.newDrawingObj(data);
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
        fontSize = fontSize ? fontSize 
                            : Math.round( 1300 / scale / fontsSizedForScale )/100; //if both scale == 1 then 13.0 underlying units

        if ( followPathDirection )
        {   
            //Use a parallel path inset from the one provided
            if ( path instanceof GeoSpline )
                path = path.parallelCurve( -fontSize ).offsetCurve;
            else if ( path instanceof GeoLine )
                path = new GeoLine( path.p1.pointAtDistanceAndAngleDeg( -fontSize, path.angleDeg() + 90 ),
                                    path.p2.pointAtDistanceAndAngleDeg( -fontSize, path.angleDeg() + 90 ) );

            const pathSVG = path.svgPath();
            const pathID = "tp" + CryptoJS.MD5( pathSVG ).toString();
            g.append("path")
                .attr( "id", pathID )
                .attr( "visibility", "hidden" )
                .attr( "fill", "none" )
                .attr( "d", pathSVG ); 

            g.append("text")
                .attr("class","alongPath")
                .attr("font-size", fontSize )
                .append( "textPath" )
                .attr( "xlink:href", "#" + pathID )
                .attr( "startOffset", "50%" )
                .attr( "text-anchor", "middle" )
                .attr( "side", "left" )
                .text( label ); 
            return;
        }
        
        try {
            const p = path.pointAlongPathFraction(0.5);
            let a = 0; //horizontal, unless we get an angle. 
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
                let baseline = "middle";
                let align = "middle";
                let ta = 0;
                let dy = 0;
                //const patternUnits = this.drawing.pattern.units;
                // /const spacing = (fontSize * 0.2);
                const spacing = this.pattern.getPatternEquivalentOfMM(1);
    
                if ( followPathDirection )
                {
                    baseline = "hanging"; //For Safari, handing doesn't work once rotated
                    ta = -a;
                    dy = spacing;
                }
                else
                {
                    // East(ish)
                    if ((( a >= 0 ) && ( a <45 )) || (( a > 270 ) && ( a <= 360 )))
                    {
                        baseline = "hanging"; //For Safari, handing doesn't work once rotated
                        ta = - a;
                        dy = spacing;
                    }
                    // West(ish)
                    else if (  (( a >= 135 ) && ( a <225 )) 
                    )//|| (( a > 270 ) && ( a <315 ))  )
                    {
                        baseline = "hanging";
                        ta = - (a-180);
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
                .attr("class","alongPath")
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

