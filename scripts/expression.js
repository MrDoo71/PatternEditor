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
        else if ( this.function === "lengthOfSplinePath" )
        {
            return this.drawingObject.curve.pathLength();
        }        
        else if  ( this.function === "sqrt" )
        {
            var p1 = this.params[0].value(currentLength);
            return Math.sqrt( p1 ); 
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


    addDependencies( source, dependencies ) {
        if ( typeof this.drawingObject1 !== "undefined" )
            dependencies.add( source, this.drawingObject1 );
        if ( typeof this.drawingObject2 !== "undefined" )
            dependencies.add( source, this.drawingObject2 );

        if ( this.params )
        {       
            for (var a = 0; a < this.params.length; a++) {
                var p = this.params[a];
                p.addDependencies( source, dependencies );
            }
        }
    }
}


