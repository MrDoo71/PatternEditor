class Expression {

    constructor(data) {
        this.dataDebug = data;
        this.operation = data.operationType;

        //divide, multiply etc.
        if (typeof data.parameter !== "undefined") 
        {
            this.params = data.parameter;
            for (var a = 0; a < this.params.length; a++) {
                var p = this.params[a];
                this.params[a] = new Expression(p);
            }
            this.value = this.operationValue;
        }
        //integer constant
        else if (typeof data.integerValue !== "undefined") 
        {
            this.constant = data.integerValue;
            this.value = this.constantValue; //eh?
        }
        else if (data.operationType === "Variable") 
        {
            if (data.variableType === "Keyword")
                this.variable = data.keyword;
            this.value = this.keywordValue;
        }
    }
    
    constantValue() {
        return this.constant;
    }

    operationValue(currentLength) {
        if (typeof this.params[0].value !== "function")
            alert("param1 not known");
        if (typeof this.params[1].value !== "function")
            alert("param2 not known");
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
}
