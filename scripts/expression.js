//(c) Copyright 2019 Jason Dore
//
//Inspired by the excellent Seamly2D/Valentina pattern drawing software.
//This library is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the Seamly2D/Valentina pattern making systen in order to support the community
//pattern sharing website https://my-pattern.cloud/ . 
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

class Expression {

    constructor(data, pattern, drawing) {
        this.dataDebug = data;
        this.pattern = pattern;
        this.drawing = drawing;

        //divide, multiply etc. and functions too
        if (typeof data.parameter !== "undefined") 
        {
            this.params = data.parameter;
            for ( const a in this.params ) {
                this.params[a] = new Expression( this.params[a], pattern, drawing);
            }            
        }

        if (typeof data.integerValue !== "undefined") 
        {
            this.constant = data.integerValue;
            this.value = this.constantValue; //the method constantValue()
        }
        else if (typeof data.decimalValue !== "undefined") 
        {
            this.constant = data.decimalValue;
            this.value = this.constantValue; //the method constantValue()
        }
        //else 
        //if (this.operation === "Variable") 
        //{
            else if (  typeof data.keyword !== "undefined" )
            {
                this.variable = data.keyword;
                this.value = this.keywordValue;
            }
            else if ( typeof data.variable !== "undefined")
            {
                this.variable = pattern.getVariable( data.variable );
                this.value = this.variableValue;
            }
            else if ( data.measurement )
            {
                this.variable = pattern.getMeasurement( data.measurement );
                this.value = this.measurementValue;
            }
            else if (    ( data.variableType === "angleOfLine" )
                      || ( data.variableType === "lengthOfLine" ) )
            {
                this.drawingObject1 = drawing.getObject( data.drawingObject1 );
                this.drawingObject2 = drawing.getObject( data.drawingObject2 );
                this.function = data.variableType;
                this.value = this.functionValue;
            }
            else if (    ( data.variableType === "lengthOfSplinePath" )
                      || ( data.variableType === "lengthOfSpline" )
                      || ( data.variableType === "angle1OfSpline" )
                      || ( data.variableType === "angle2OfSpline" ) 
                      || ( data.variableType === "lengthOfSplineControl1" ) 
                      || ( data.variableType === "lengthOfSplineControl2" ) 
                      )
            {
                if ( data.drawingObject1 && data.drawingObject2 )
                {
                    //This shouldn't find an object, otherwise we'd have passed it as a single drawingObject.
                    this.drawingObject = drawing.getObject( "Spl_" + data.drawingObject1 + "_" + data.drawingObject2 );

                    //at least one of these will be an intersect on a curve, or position along a curve, otherwise they are end points of the curve. 
                    if ( ! this.drawingObject )
                    {
                        this.drawingObject1 = drawing.getObject( data.drawingObject1 );
                        this.drawingObject2 = drawing.getObject( data.drawingObject2 );
                        //one of these will be a Spline, the other will be an intersection point on it, or distance along it. 

                        //We're not the whole spline, just a segment of it. We need to find a curve that both drawing objects are on.

                        const curveBeingCut = function( d ) {
                            if ( d.arc )                             
                                return d.arc;
                            else if ( d.curve )                             
                                return d.curve;
                            else
                                throw "Path not found.";                
                        };

                        //Return true if 'other' is the start or end of this curve. 
                        const checkRelevant = function( curve, other ) {
                            return    ( ( curve.startPoint ) && ( curve.startPoint === other ) )
                                   || ( ( curve.endPoint ) && ( curve.endPoint === other ) )
                                   || ( ( curve.data.pathNode ) && ( curve.data.pathNode[0].point === other ) )
                                   || ( ( curve.data.pathNode ) && ( curve.data.pathNode[curve.data.pathNode.length-1].point === other ) );
                        };

                        var drawingObjectCuttingSpline;

                        if (    (    ( this.drawingObject1.data.objectType === "pointIntersectArcAndAxis" )               
                                  || ( this.drawingObject1.data.objectType === "pointCutSplinePath" ) 
                                  || ( this.drawingObject1.data.objectType === "cutSpline" ) )
                             && checkRelevant( curveBeingCut( this.drawingObject1 ), this.drawingObject2 ) )
                            drawingObjectCuttingSpline = this.drawingObject1;

                        else if (    (    ( this.drawingObject2.data.objectType === "pointIntersectArcAndAxis" )               
                                       || ( this.drawingObject2.data.objectType === "pointCutSplinePath" ) 
                                       || ( this.drawingObject2.data.objectType === "cutSpline" ) )
                                 && checkRelevant( curveBeingCut( this.drawingObject2 ), this.drawingObject1 ) )
                                 drawingObjectCuttingSpline = this.drawingObject2;

                        this.splineDrawingObject = curveBeingCut( drawingObjectCuttingSpline );

                        //The other drawing object will either be the start or end of this curve, OR another intersect on the same curve. 
                    }
                }
                else
                    //this is the spline drawing object itself, the curve comes directly from it. 
                    this.drawingObject = drawing.getObject( data.drawingObject1 );

                if (( data.segment ) && ( parseInt(data.segment) !== 0 ))
                    this.segment = parseInt(data.segment);

                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( data.variableType === "lengthOfArc" )
            {
                this.drawingObject = drawing.getObject( data.drawingObject1 );
                this.arcSelection = data.arcSelection;
                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( data.variableType === "radiusOfArc" )
            {
                this.drawingObject = drawing.getObject( data.drawingObject1 );

                if ( data.radiusSelection === "ellipticalArcRadius1" )
                    this.radiusSelection = 1;
                else if ( data.radiusSelection === "ellipticalArcRadius2" )
                    this.radiusSelection = 2;
                else
                    this.radiusSelection = null;

                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( typeof data.variableType !== "undefined" )
                throw "Unsupported variableType:" + data.variableType;
        //}
        else if ( typeof data.functionName !== "undefined" )
        {
            this.function = data.functionName;
            this.value = this.functionValue;
            //having done the parameters earlier. 
        }
        else if ( typeof data.operation !== "undefined" )
        {
            //add, multiply etc.
            this.operation = data.operation;
            this.value = this.operationValue;
        }
        //Don't throw, we still need to continue with setting up the expression so we can describe what is wrong. 
        //else throw "Unsupported expression." ;
    }

    
    variableValue() {
        return this.variable.value();
    }    


    measurementValue() {
        //console.log("Measurement units " + this.variable.units );
        //console.log("Pattern units " + this.pattern.units );
        var measurementUnits = this.variable.units;
        var patternUnits = this.pattern.units;
        if ( measurementUnits === patternUnits )
            return this.variable.value();

        var mm = 1;
        if ( measurementUnits === "cm" )
            mm = 10;
        else if ( measurementUnits === "inch" )
            mm = 25.4;

        var pp = mm;

        if ( patternUnits === "cm" )
            pp = mm / 10;
        else if ( patternUnits === "inch" )
            pp = mm / 25.4;

        return pp * this.variable.value();
    }    


    functionValue(currentLength) {

        let r; 

        switch( this.function )
        {
            case "angleOfLine":
            {
                const point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
                const point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
                const line = new GeoLine( point1, point2 );
                let deg = line.angleDeg();
                if ( deg < 0 )
                    deg += 360; 
                r = deg;
                break;
            }
            case "lengthOfLine":
            {
                const point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
                const point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
                const line = new GeoLine( point1, point2 );
                r = line.getLength();
                break;
            }
            case "lengthOfSplinePath":
            case "lengthOfSpline":
            {
                if ( ! this.drawingObject ) 
                {
                    //how far along the spline is each drawingObject (one is likely at the start or end)
                    //create a copy of the spline with the intersection point added (where along the line if it has multiple nodes? the place where the line length doesn't grow).
                    //https://pomax.github.io/bezierinfo/#splitting
                    return    this.splineDrawingObject.curve.pathLengthAtPoint( this.drawingObject2.p )
                            - this.splineDrawingObject.curve.pathLengthAtPoint( this.drawingObject1.p );
                    //TODO. or we could use, though they amound to a similar thing. 
                //     return this.splineDrawingObject.curve.splineBetweenPoints( this.drawingObject1.p, this.drawingObject2.p ).pathLength();
                }

                if (    ( this.function === "lengthOfSplinePath" )
                    && ( this.segment ) )
                    r = this.drawingObject.curve.pathLength( this.segment );
                else 
                    r = this.drawingObject.curve.pathLength();

                break;
            }
            case "angle1OfSpline":
            case "angle2OfSpline":
            case "lengthOfSplineControl1":
            case "lengthOfSplineControl2":    
            {
                let spline;
                if ( this.drawingObject ) //the simple case, we are looking at the start/end of a path (not a point along the line, but could be a segment)
                {
                    spline = this.drawingObject.curve;
                    if ( this.segment )
                        spline = spline.pathSegment( this.segment );
                }
                else
                {
                    //this.splineDrawingObject is our spl or splpath, and drawingObject1 and drawingObject2 are either its ends, or intersection/pointalong
                    //and we may also have a segment?
                    spline = this.splineDrawingObject.curve;
                    spline = spline.splineBetweenPoints( this.drawingObject1.p, this.drawingObject2.p );
                }

                switch( this.function )
                {
                    case "angle1OfSpline":
                        r = spline.nodeData[0].outAngle;
                        break;
                    case "angle2OfSpline":
                        r = spline.nodeData[ spline.nodeData.length-1 ].inAngle;
                        break;
                    case "lengthOfSplineControl1":
                        r = spline.nodeData[0].outLength;
                        break;
                    case "lengthOfSplineControl2":
                        r = spline.nodeData[ spline.nodeData.length-1 ].inLength;
                        break;
                }

                break;
            }
            case "lengthOfArc":
            {
                if ( this.arcSelection === "wholeArc")
                    r = this.drawingObject.arc.pathLength();
                else
                {
                    //this.drawingObject is a cut object
                    const arcDrawingObject = this.drawingObject.curve ? this.drawingObject.curve : this.drawingObject.arc;

                    //where in the arc is this.drawingObject.curve?
                    const radiusToIntersectLine = new GeoLine( arcDrawingObject.center.p, this.drawingObject.p );
                    const angleToIntersectRad = radiusToIntersectLine.angle;
                    if ( this.arcSelection === "beforeArcCut")
                    {
                        if ( arcDrawingObject.arc instanceof GeoEllipticalArc )
                        {
                            //else elliptical arc: from the arc's start angle to this cut angle. 
                            const cutArc = arcDrawingObject.arc.clone();
                            cutArc.angle2 = radiusToIntersectLine.angleDeg() - cutArc.rotationAngle;
                            if ( cutArc.angle2 < 0 )
                                cutArc.angle2 += 360;
                            r = cutArc.pathLength();
                        }
                        else //if arc
                        {
                            const arcStartAngleRad = arcDrawingObject.angle1.value() / 360 * 2 * Math.PI;
                            const segmentRad = angleToIntersectRad-arcStartAngleRad;                    
                            const length = radiusToIntersectLine.length * segmentRad; //because circumference of a arc is radius * angle (if angle is expressed in radians, where a full circle would be Math.PI*2 )
                            r = length;
                        }                    
                    }
                    else //afterArcCut
                    {
                        if ( arcDrawingObject.arc instanceof GeoEllipticalArc )
                        {
                            const cutArc = arcDrawingObject.arc.clone();
                            cutArc.angle1 = radiusToIntersectLine.angleDeg()  - cutArc.rotationAngle;
                            if ( cutArc.angle1 < 0 )
                                cutArc.angle1 += 360;
                            r = cutArc.pathLength();
                        }
                        else //if arc
                        {
                            const arcEndAngleRad = arcDrawingObject.angle2.value() / 360 * 2 * Math.PI;
                            const segmentRad = arcEndAngleRad - angleToIntersectRad;
                            const length = radiusToIntersectLine.length * segmentRad;
                            r = length;
                        }
                    }
                }
                break;
            }    
            case "radiusOfArc":
            {
                if ( this.radiusSelection === 1 )
                    r = this.drawingObject.radius1.value();
                else if ( this.radiusSelection === 2 )
                    r = this.drawingObject.radius2.value();
                else
                    r = this.drawingObject.radius.value();

                break;
            }
            case "sqrt":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.sqrt( p1 ); 
                break;
            }
            case "-":
            {
                const p1 = this.params[0].value(currentLength);
                r = -p1; 
                break;
            }
            case "min":
            {
                const p1 = this.params[0].value(currentLength);
                const p2 = this.params[1].value(currentLength);
                r = Math.min( p1, p2 );
                break;
            }
            case "max":
            {
                const p1 = this.params[0].value(currentLength);
                const p2 = this.params[1].value(currentLength);
                r = Math.max( p1, p2 );
                break;
            }
            case "sin":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.sin( p1 * Math.PI / 180 );
                break;
            }
            case "cos":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.cos( p1 * Math.PI / 180 );
                break;
            }
            case "tan":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.tan( p1 * Math.PI / 180 );
                break;
            }
            case "sinD":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.sin( p1 );
                break;
            }
            case "cosD":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.cos( p1 );
                break;
            }
            case "tanD":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.tan( p1 );
                break;
            }
            case "asin":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.asin( p1 ) * 180 / Math.PI;
                break;
            }
            case "acos":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.acos( p1 ) * 180 / Math.PI;
                break;
            }
            case "atan":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.atan( p1 ) * 180 / Math.PI;
                break;
            }        
            case "abs":
            {
                const p1 = this.params[0].value(currentLength);
                r = Math.abs( p1 );
                break;
            }        
            default:
                throw ("Unknown function: " + this.function );
        }

        if ( r === undefined || Number.isNaN( r ) )
            throw this.function + " - result not a number. ";

        return r;
    }
    

    constantValue() {
        return this.constant;
    }


    operationValue(currentLength) {

        if (typeof this.params[0].value !== "function")
            throw "expression p1 not valid";

        if ( this.operation !== "()" )    
        {
            if (typeof this.params[1].value !== "function")
                throw "expression p2 not valid";
        }

        if (this.operation === "+")
            return this.params[0].value(currentLength) + this.params[1].value(currentLength);

        else if (this.operation === "-")
            return this.params[0].value(currentLength) - this.params[1].value(currentLength);

        else if (this.operation === "*")
            return this.params[0].value(currentLength) * this.params[1].value(currentLength);

        else if (this.operation === "/")
            return this.params[0].value(currentLength) / this.params[1].value(currentLength);
            
        else if (this.operation === "==")
            return this.params[0].value(currentLength) == this.params[1].value(currentLength);

        else if (this.operation === "!=")
            return this.params[0].value(currentLength) != this.params[1].value(currentLength);

        else if (this.operation === "<")
            return this.params[0].value(currentLength) < this.params[1].value(currentLength);

        else if (this.operation === "<=")
            return this.params[0].value(currentLength) <= this.params[1].value(currentLength);
            
        else if (this.operation === ">")
            return this.params[0].value(currentLength) > this.params[1].value(currentLength);

        else if (this.operation === ">=")
            return this.params[0].value(currentLength) >= this.params[1].value(currentLength);

        else if (this.operation === "()")
            return this.params[0].value(currentLength);

        else if  ( this.operation === "^" )
        {
            var p1 = this.params[0].value(currentLength);
            var p2 = this.params[1].value(currentLength);
            return Math.pow( p1, p2 );
        }    
        else if (this.operation === "?")
        {
            var conditionTestResult = this.params[0].value(currentLength);
            if ( conditionTestResult )
                return this.params[1].value(currentLength);
            else
                return this.params[2].value(currentLength);
        }


        throw ("Unknown operation: " + this.operation);
    }


    keywordValue(currentLength) {
        if (this.variable === "CurrentLength")
            return currentLength;
        throw ("Unknown keyword: " + this.variable);
    }


    nameWithPopupValue( name ) {
        try {
            return '<span title="' + ( Math.round( this.value() * 1000 ) / 1000 ) + ' ' + this.pattern.units + '">' + name + '</span>';
        } catch ( e ) {
            return "ERROR1:" + name;
        }
    }


    html( asFormula, currentLength, parentPrecedence ) {

        if ( ! asFormula )
        {
            try { 
                return this.value( currentLength );
                //return Number.parseFloat( this.value( currentLength ) ).toPrecision(4); 
            } catch ( e ) {
                return "???"
            }
        }

        if ( this.variable )
        {
            if (this.variable === "CurrentLength")
                return this.nameWithPopupValue( "CurrentLength" );

            return this.nameWithPopupValue( this.variable.name );
        }

        if ( this.constant !== undefined )
            return this.constant;

        if ( this.function )
        {
            switch ( this.function ) {

            case "lengthOfLine":
                return this.nameWithPopupValue( "lengthOfLine(" + this.drawingObject1.ref() + ", " + this.drawingObject2.ref() + ")" );

            case "angleOfLine":
                return this.nameWithPopupValue( "angleOfLine(" + this.drawingObject1.ref() + ", " + this.drawingObject2.ref() + ")" );

            case "lengthOfSpline":
            case "lengthOfSplinePath":
            
                if ( ! this.drawingObject )
                    return this.nameWithPopupValue( this.function + "( curve:" + this.splineDrawingObject.ref() + ", from:" + this.drawingObject1.ref() + ", to:" + this.drawingObject2.ref() + ")" );
                
                return this.nameWithPopupValue( this.function + "(" + this.drawingObject.ref() + (this.segment?", segment:" + this.segment:"") + ")" );

            case "angle1OfSpline":
            case "angle2OfSpline":
            case "lengthOfSplineControl1":
            case "lengthOfSplineControl2":
            
                if ( ! this.drawingObject )
                    return this.nameWithPopupValue( this.function + "( curve:" + this.splineDrawingObject.ref() + ", at:" +
                                            ((( this.splineDrawingObject.startPoint == this.drawingObject1 ) || ( this.splineDrawingObject.endPoint == this.drawingObject1 ))
                                            ? this.drawingObject2.ref() : this.drawingObject1.ref() ) + ")" );

                return this.nameWithPopupValue( this.function + "(" + this.drawingObject.ref() + ")" );

            case "lengthOfArc":
            
                if ( ! this.drawingObject )
                    return "lengthOfArc( ??? )";
                
                return this.nameWithPopupValue( "lengthOfArc(" + this.arcSelection + " " + this.drawingObject.ref() + ")" );

            case "radiusOfArc":

                if ( ! this.drawingObject )
                    return "radiusOfArc( ??? )";
                
                return this.nameWithPopupValue( "radiusOfArc(" + this.drawingObject.ref() + ( this.radiusSelection ? ", radius-" + this.radiusSelection : "" ) + ")" );
            
            case "-":
            
                return ( "-(" + this.params[0].html( asFormula, currentLength ) + ")" ); 
            
            case "sqrt":
            case "sin":
            case "cos":
            case "tan": 
            case "sinD":
            case "cosD":
            case "tanD": 
            case "asin":
            case "acos":
            case "atan": 
            case "abs":
                return ( this.function + "(" + this.params[0].html( asFormula, currentLength ) + ")" ); 

            default:
                return "UNKNOWN FUNCTION TYPE" + this.function;
            }
        }

        if ( this.operation === "?" )
        {
            return this.params[0].html( asFormula, currentLength ) + " ? " +
                   this.params[1].html( asFormula, currentLength ) + " : " +
                   this.params[2].html( asFormula, currentLength );
        }
        else if ( this.operation ) 
        {
            var useOperatorNotation = false;
            var precedence = 0;

            if (    (this.operation === "+") 
                 || (this.operation === "-") )
            {
                useOperatorNotation = " " + this.operation + " ";
                precedence = 3;
            }
            else if (    (this.operation === "/") 
                      || (this.operation === "*") ) 
            {
                useOperatorNotation = " " + this.operation + " ";
                precedence = 4;
            }
            else if (    (this.operation === "==") 
                      || (this.operation === "!=") 
                      || (this.operation === ">=") 
                      || (this.operation === "<=") 
                      || (this.operation === ">") 
                      || (this.operation === "<") )
            {
                useOperatorNotation = " " + this.operation + " ";
                precedence = 2;
            }
            //power = 5
            //ternary = 2

            var t = ( useOperatorNotation || this.operation === "()" ? "" : this.operation );
            
            var useParenthesis = ( ( this.operation === "()" ) || ( precedence < parentPrecedence ) || (!useOperatorNotation) );

            if ( useParenthesis )
                t += "(";

            var first = true;
            for ( const p of this.params )
            {
                if ( ! first )
                {
                    if ( useOperatorNotation )
                        t += useOperatorNotation;
                    else
                        t += ",";
                }
                t += p.html( asFormula, currentLength, precedence );
                first = false;
            }

            if ( useParenthesis )
                t += ")";

            return t;
        }

        return "???";
    };


    //The dependencies of this expression need adding to the source drawingObject that uses this expression
    addDependencies( source, dependencies ) 
    {
        if ( typeof this.drawingObject1 !== "undefined" )
            dependencies.add( source, this.drawingObject1 );

        if ( typeof this.drawingObject2 !== "undefined" )
            dependencies.add( source, this.drawingObject2 );

        if ( typeof this.splineDrawingObject !== "undefined" )
            dependencies.add( source, this.splineDrawingObject );

        if ( typeof this.drawingObject !== "undefined" ) //e.g. lengthOfArc
            dependencies.add( source, this.drawingObject );

        //variable or measurement
        if (    ( typeof this.variable !== "undefined")
             && (    ( this.variable.isMeasurement  )
                  || ( this.variable.isVariable  ) ) )
            dependencies.add( source, this.variable );

        //recurse into the expression parameters.
        if ( this.params )
        {       
            for ( const p of this.params ) {
                p.addDependencies( source, dependencies );
            }
        }
    }
}


