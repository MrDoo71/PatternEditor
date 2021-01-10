//(c) Copyright 2019 Jason Dore
//
//Inspired by the excellent Seamly2D/Valentina pattern drawing software.
//This library is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the Seamly2D/Valentina pattern making systen in order to support the community
//pattern sharing website https://my-pattern.cloud/ . 
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

class Expression {

    constructor(data, pattern, patternPiece) {
        this.dataDebug = data;
        //this.operation = data.operation;// ? data.operation : data.operationType ;
        this.pattern = pattern;
        this.patternPiece = patternPiece;

        //divide, multiply etc. and functions too
        if (typeof data.parameter !== "undefined") 
        {
            this.params = data.parameter;
            for (var a = 0; a < this.params.length; a++) {
                var p = this.params[a];
                this.params[a] = new Expression(p, pattern, patternPiece);
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
            else if ( typeof data.increment !== "undefined")
            {
                this.variable = pattern.getIncrement( data.increment );
                this.value = this.incrementValue;
            }
            else if ( data.measurement )
            {
                this.variable = pattern.getMeasurement( data.measurement );
                this.value = this.measurementValue;
            }
            else if ( data.variableType === "angleOfLine" )
            {
                this.drawingObject1 = patternPiece.getObject( data.drawingObject1 );
                this.drawingObject2 = patternPiece.getObject( data.drawingObject2 );
                this.function = data.variableType;
                this.value = this.functionValue;
            }
            else if ( data.variableType === "lengthOfLine" )
            {
                this.drawingObject1 = patternPiece.getObject( data.drawingObject1 );
                this.drawingObject2 = patternPiece.getObject( data.drawingObject2 );
                this.function = data.variableType;
                this.value = this.functionValue;
            }
            else if (    ( data.variableType === "lengthOfSplinePath" )
                      || ( data.variableType === "lengthOfSpline" )
                      || ( data.variableType === "angle1OfSpline" )
                      || ( data.variableType === "angle2OfSpline" ) )
            {
                if ( data.drawingObject1 && data.drawingObject2 )
                {
                    //This shouldn't find an object, otherwise we'd have passed it as a single drawingObject.
                    this.drawingObject = patternPiece.getObject( "Spl_" + data.drawingObject1 + "_" + data.drawingObject2 );

                    //at least one of these will be an intersect on a curve, or position along a curve, otherwise they are end points of the curve. 
                    if ( ! this.drawingObject )
                    {
                        this.drawingObject1 = patternPiece.getObject( data.drawingObject1 );
                        this.drawingObject2 = patternPiece.getObject( data.drawingObject2 );
                        //one of these will be a Spline, the other will be an intersection point on it, or distance along it. 

                        //We're not the whole spline, just a segment of it. 

                        var drawingObjectDefiningSpline = (    ( this.drawingObject1.data.objectType === "pointIntersectArcAndAxis" )               
                                                            || ( this.drawingObject1.data.objectType === "pointCutSplinePath" ) 
                                                            || ( this.drawingObject1.data.objectType === "cutSpline" ) ) 
                                                          ? this.drawingObject1
                                                          : this.drawingObject2;

                        if ( drawingObjectDefiningSpline.arc )                             
                            this.splineDrawingObject = drawingObjectDefiningSpline.arc;
                        else if ( drawingObjectDefiningSpline.splinePath )                             
                            this.splineDrawingObject = drawingObjectDefiningSpline.splinePath;
                        else if ( drawingObjectDefiningSpline.curve )                             
                            this.splineDrawingObject = drawingObjectDefiningSpline.curve;
                        else
                            throw "Path not found.";

                        //console.log("Function " + data.variableType + " this.drawingObject1.data.objectType:" + this.drawingObject1.data.objectType + " this.drawingObject2.data.objectType:" + this.drawingObject2.data.objectType + " splineDrawingObject:" + this.splineDrawingObject );

                        //The other drawing object will either be the start or end of this curve, OR another intersect on the same curve. 
                    }
                }
                else
                    //this is the spline drawing object itself, the curve comes directly from it. 
                    this.drawingObject = patternPiece.getObject( data.drawingObject1 );

                if (( data.segment ) && ( parseInt(data.segment) !== 0 ))
                    this.segment = parseInt(data.segment);

                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( data.variableType === "lengthOfArc" )
            {
                this.drawingObject = patternPiece.getObject( data.drawingObject1 );
                this.arcSelection = data.arcSelection;
                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( data.variableType === "radiusOfArc" )
            {
                this.drawingObject = patternPiece.getObject( data.drawingObject1 );

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

    
    incrementValue() {
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
        if ( this.function === "angleOfLine" )
        {
            var point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
            var point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
            var line = new GeoLine( point1, point2 );
            var deg = line.angleDeg();
            if ( deg < 0 )
                deg += 360; 
            return deg;
        }
        else if ( this.function === "lengthOfLine" )
        {
            var point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
            var point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
            var line = new GeoLine( point1, point2 );
            //console.log( "lengthOfLine " + this.drawingObject1.data.name + this.drawingObject2.data.name + " = " + line.getLength() );
            return line.getLength();
        }
        else if (    ( this.function === "lengthOfSplinePath" )
                  || ( this.function === "lengthOfSpline" ) )
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
                 return this.drawingObject.curve.pathLength( this.segment );

            return this.drawingObject.curve.pathLength();
        }
        else if (    ( this.function === "angle1OfSpline" )
                  || ( this.function === "angle2OfSpline" ) )
        {
            var spline;
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

            if ( this.function === "angle1OfSpline" )
                return spline.nodeData[0].outAngle;
            else //angle2OfSpline
                return spline.nodeData[ spline.nodeData.length-1 ].inAngle;
        }
        else if ( this.function === "lengthOfArc" )
        {
            if ( this.arcSelection === "wholeArc")
                return this.drawingObject.arc.pathLength();
            else
            {
                //this.drawingObject is a cut object
                var arcDrawingObject = this.drawingObject.curve ? this.drawingObject.curve : this.drawingObject.arc;

                //where in the arc is this.drawingObject.curve?
                var radiusToIntersectLine = new GeoLine( arcDrawingObject.center.p, this.drawingObject.p );
                var angleToIntersectRad = radiusToIntersectLine.angle;
                if ( this.arcSelection === "beforeArcCut")
                {
                    if ( arcDrawingObject.arc instanceof GeoEllipticalArc )
                    {
                        //else elliptical arc: from the arc's start angle to this cut angle. 
                        const cutArc = arcDrawingObject.arc.clone();
                        cutArc.angle2 = radiusToIntersectLine.angleDeg() - cutArc.rotationAngle;
                        if ( cutArc.angle2 < 0 )
                            cutArc.angle2 += 360;
                        return cutArc.pathLength();
                    }
                    else //if arc
                    {
                        var arcStartAngleRad = arcDrawingObject.angle1.value() / 360 * 2 * Math.PI;
                        var segmentRad = angleToIntersectRad-arcStartAngleRad;                    
                        var length = radiusToIntersectLine.length * segmentRad; //because circumference of a arc is radius * angle (if angle is expressed in radians, where a full circle would be Math.PI*2 )

                        //console.log( "beforeArcCut " + this.drawingObject.data.name + " = " + length );
                        return length;
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
                        return cutArc.pathLength();
                    }
                    else //if arc
                    {
                        var arcEndAngleRad = arcDrawingObject.angle2.value() / 360 * 2 * Math.PI;
                        var segmentRad = arcEndAngleRad - angleToIntersectRad;
                        var length = radiusToIntersectLine.length * segmentRad;
                        return length;
                    }
                }
            }
        }    
        else if ( this.function === "radiusOfArc" )
        {
            if ( this.radiusSelection === 1 )
                return this.drawingObject.radius1.value();
            else if ( this.radiusSelection === 2 )
                return this.drawingObject.radius2.value();
            else
                return this.drawingObject.radius.value();
        }
        else if  ( this.function === "sqrt" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.sqrt( p1 ); 
        }
        else if  ( this.function === "-" )
        {
            var p1 = this.params[0].value(currentLength);
            return -p1; 
        }
        else if ( this.function === "min" )
        {
            var p1 = this.params[0].value(currentLength);
            var p2 = this.params[1].value(currentLength);
            return Math.min( p1, p2 );
        }
        else if ( this.function === "max" )
        {
            var p1 = this.params[0].value(currentLength);
            var p2 = this.params[1].value(currentLength);
            return Math.max( p1, p2 );
        }
        else if ( this.function === "sin" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.sin( p1 * Math.PI / 180 );
        }
        else if ( this.function === "cos" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.cos( p1 * Math.PI / 180 );
        }
        else if ( this.function === "tan" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.tan( p1 * Math.PI / 180 );
        }
        else if ( this.function === "asin" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.asin( p1 ) * 180 / Math.PI;
        }
        else if ( this.function === "acos" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.acos( p1 ) * 180 / Math.PI;
        }
        else if ( this.function === "atan" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.atan( p1 ) * 180 / Math.PI;
        }        
        else throw ("Unknown function: " + this.function );
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
            if ( this.function === "lengthOfLine" )
                return this.nameWithPopupValue( "lengthOfLine(" + this.drawingObject1.ref() + ", " + this.drawingObject2.ref() + ")" );

            if ( this.function === "angleOfLine" )
                return this.nameWithPopupValue( "angleOfLine(" + this.drawingObject1.ref() + ", " + this.drawingObject2.ref() + ")" );

            if (   ( this.function === "lengthOfSpline" )
                || ( this.function === "lengthOfSplinePath" ) )
            {
                if ( ! this.drawingObject )
                    return this.nameWithPopupValue( this.function + "( curve:" + this.splineDrawingObject.ref() + ", from:" + this.drawingObject1.ref() + ", to:" + this.drawingObject2.ref() + ")" );
                
                return this.nameWithPopupValue( this.function + "(" + this.drawingObject.ref() + (this.segment?", segment:" + this.segment:"") + ")" );
            };

            if (    ( this.function === "angle1OfSpline" )
                 || ( this.function === "angle2OfSpline" ))
            {
                if ( ! this.drawingObject )
                    return this.nameWithPopupValue( this.function + "( curve:" + this.splineDrawingObject.ref() + ", at:" + ( this.function === "angle1OfSpline"  ? this.drawingObject1.ref() : this.drawingObject2.ref() ) + ")" );

                return this.nameWithPopupValue( this.function + "(" + this.drawingObject.ref() + ")" );
            };            

            if ( this.function === "lengthOfArc" )
            {
                if ( ! this.drawingObject )
                    return "lengthOfArc( ??? )";
                
                return this.nameWithPopupValue( "lengthOfArc(" + this.arcSelection + " " + this.drawingObject.ref() + ")" );
            };

            if ( this.function === "radiusOfArc" )
            {
                if ( ! this.drawingObject )
                    return "radiusOfArc( ??? )";
                
                return this.nameWithPopupValue( "radiusOfArc(" + this.drawingObject.ref() + ( this.radiusSelection ? ", radius-" + this.radiusSelection : "" ) + ")" );
            };            

            if ( this.function === "-" )
            {
                return ( "-(" + this.params[0].html( asFormula, currentLength ) + ")" ); 
            }       
            
            if (    ( this.function === "sqrt" )
                 || ( this.function === "sin" )
                 || ( this.function === "cos" )
                 || ( this.function === "tan" ) 
                 || ( this.function === "asin" )
                 || ( this.function === "acos" )
                 || ( this.function === "atan" ) )
            {
                return ( this.function + "(" + this.params[0].html( asFormula, currentLength ) + ")" ); 
            }

            return "UNKNOWN FUNCTION TYPE" + this.function;
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
            for ( var p in this.params )
            {
                if ( ! first )
                {
                    if ( useOperatorNotation )
                        t += useOperatorNotation;
                    else
                        t += ",";
                }
                t += this.params[p].html( asFormula, currentLength, precedence );
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

        //increment or measurement
        if (    ( typeof this.variable !== "undefined")
             && (    ( this.variable.isMeasurement  )
                  || ( this.variable.isIncrement  ) ) )
            dependencies.add( source, this.variable );

        //recurse into the expression parameters.
        if ( this.params )
        {       
            for (var a = 0; a < this.params.length; a++) {
                var p = this.params[a];
                p.addDependencies( source, dependencies );
            }
        }
    }
}


