class Expression {

    constructor(data, pattern, patternPiece) {
        this.dataDebug = data;
        this.operation = data.operationType;
        this.pattern = pattern;
        this.patternPiece = patternPiece;

        //divide, multiply etc.
        if (typeof data.parameter !== "undefined") 
        {
            this.params = data.parameter;
            for (var a = 0; a < this.params.length; a++) {
                var p = this.params[a];
                this.params[a] = new Expression(p, pattern, patternPiece);
            }
            this.value = this.operationValue;
        }
        //integer constant
        else if (typeof data.integerValue !== "undefined") 
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
            else if ( data.variableType === "angleOfLine" )
            {
                this.drawingObject1 = patternPiece.getObject( data.drawingObject1 );
                this.drawingObject2 = patternPiece.getObject( data.drawingObject2 );
                this.function = data.variableType;
                this.value = this.functionValue;
            }
        }
    }

    incrementValue() {
        return this.variable.value();
    }    

    functionValue() {
        if ( this.function === "angleOfLine" )
        {
            var point1 = new GeoPoint( this.drawingObject1.p.x, this.drawingObject1.p.y );
            var point2 = new GeoPoint( this.drawingObject2.p.x, this.drawingObject2.p.y );
            var line = new GeoLine( point1, point2 );
            return line.angleDeg();
        }
        throw ("Unknown function: " + this.data.variableType );
    }
    
    constantValue() {
        return this.constant;
    }

    operationValue(currentLength) {

        if (typeof this.params[0].value !== "function")
            alert("param1 not known");
        if (typeof this.params[1].value !== "function")
            alert("param2 not known");

        if (this.operation === "add")
            return this.params[0].value(currentLength) + this.params[1].value(currentLength);
        if (this.operation === "subtract")
            return this.params[0].value(currentLength) - this.params[1].value(currentLength);
        if (this.operation === "multiply")
            return this.params[0].value(currentLength) * this.params[1].value(currentLength);
        if (this.operation === "divide")
            return this.params[0].value(currentLength) / this.params[1].value(currentLength);

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


