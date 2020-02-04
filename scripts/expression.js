class Expression {

    constructor(data, pattern, patternPiece) {
        this.dataDebug = data;
        this.operation = data.operationType;
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

        //integer constant
        if (typeof data.integerValue !== "undefined") 
        {
            this.constant = data.integerValue;
            this.value = this.constantValue; //eh?
        }
        else if (typeof data.decimalValue !== "undefined") 
        {
            this.constant = data.decimalValue;
            this.value = this.constantValue; //eh?
        }
        else if (data.operationType === "Variable") 
        {
            if (data.variableType === "Keyword")
            {
                this.variable = data.keyword;
                this.value = this.keywordValue;
            }
            else if (data.variableType === "Increment")
            {
                this.variable = pattern.getIncrement( data.incrementVar );
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
            else if ( data.variableType === "lengthOfSplinePath" )
            {
                this.drawingObject = patternPiece.getObject( "Spl_" + data.drawingObject1 + "_" + data.drawingObject2 );
                this.function = data.variableType;
                this.value = this.functionValue;
            }            
            else if ( data.variableType === "lengthOfSpline" )
            {
                //TODO TEST! if this works, combine with the one above as this is an exact copy
                this.drawingObject = patternPiece.getObject( "Spl_" + data.drawingObject1 + "_" + data.drawingObject2 );
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
            else 
                throw "Unsupported variableType:" + data.variableType;
        }
        else if ( typeof data.functionName !== "undefined" )
        {
            this.function = data.functionName;
            this.value = this.functionValue;
            //having done the parameters earlier. 
        }
        else if ( this.operationType !== "undefined" )
        {
            //add, multiply etc.
            this.value = this.operationValue;
        }
        else throw "Unsupported expression." ;
    }

    incrementValue() {
        return this.variable.value();
    }    

    measurementValue() {
        return this.variable.value();
    }    

    functionValue(currentLength) {
        if ( this.function === "angleOfLine" )
        {
            var point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
            var point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
            var line = new GeoLine( point1, point2 );
            return line.angleDeg();
        }
        else if ( this.function === "lengthOfLine" )
        {
            var point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
            var point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
            var line = new GeoLine( point1, point2 );
            return line.getLength();
        }
        else if (    ( this.function === "lengthOfSplinePath" )
                  || ( this.function === "lengthOfSpline" ) )
        {
            return this.drawingObject.curve.pathLength();
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
        else throw ("Unknown function: " + this.function );
    }
    
    constantValue() {
        return this.constant;
    }

    operationValue(currentLength) {

        if (typeof this.params[0].value !== "function")
            alert("param1 not known");

        if ( this.operation !== "parenthesis" )    
        {
            if (typeof this.params[1].value !== "function")
                alert("param2 not known");
        }

        if (this.operation === "add")
            return this.params[0].value(currentLength) + this.params[1].value(currentLength);

        else if (this.operation === "subtract")
            return this.params[0].value(currentLength) - this.params[1].value(currentLength);

        else if (this.operation === "multiply")
            return this.params[0].value(currentLength) * this.params[1].value(currentLength);

        else if (this.operation === "divide")
            return this.params[0].value(currentLength) / this.params[1].value(currentLength);
            
        else if (this.operation === "equalTo")
            return this.params[0].value(currentLength) == this.params[1].value(currentLength);

        else if (this.operation === "notEqualTo")
            return this.params[0].value(currentLength) != this.params[1].value(currentLength);

        else if (this.operation === "lessThan")
            return this.params[0].value(currentLength) < this.params[1].value(currentLength);

        else if (this.operation === "lessThanOrEqualTo")
            return this.params[0].value(currentLength) <= this.params[1].value(currentLength);
            
        else if (this.operation === "greaterThan")
            return this.params[0].value(currentLength) > this.params[1].value(currentLength);

        else if (this.operation === "greaterThanOrEqualTo")
            return this.params[0].value(currentLength) >= this.params[1].value(currentLength);

        else if (this.operation === "parenthesis")
            return this.params[0].value(currentLength);

        else if  ( this.operation === "power" )
        {
            var p1 = this.params[0].value(currentLength);
            var p2 = this.params[1].value(currentLength);
            return Math.pow( p1, p2 );
        }    
        else if (this.operation === "ternary")
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

    html() {

        if ( this.variable )
            return this.variable;

        if ( this.constant )
            return this.constant;

        if ( this.operation )
        {
            var t = this.operation + "(";
            var first = true;
            for ( var p in this.params )
            {
                if ( ! first )
                    t += ",";
                t += this.params[p].html();
                first = false;
            }
            t += ")";
            return t;
        }

        return "EXPRESSION";
    }


    //The dependencies of this expression need adding to the source drawingObject that uses this expression
    addDependencies( source, dependencies ) 
    {
        if ( typeof this.drawingObject1 !== "undefined" )
            dependencies.add( source, this.drawingObject1 );

        if ( typeof this.drawingObject2 !== "undefined" )
            dependencies.add( source, this.drawingObject2 );

        if ( typeof this.drawingObject !== "undefined" ) //e.g. lengthOfArc
            dependencies.add( source, this.drawingObject );

        //recurse into the expression parameters.
        if ( this.params )
        {       
            for (var a = 0; a < this.params.length; a++) {
                var p = this.params[a];
                p.addDependencies( source, dependencies );
            }
        }

        //TODO also add dependencies on measurements and increments and (optionally) show these in the list too. 
    }
}


