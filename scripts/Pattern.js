class Pattern {

    constructor (data, options ) {
        this.data = data;
        this.options = options;
        this.patternData = data.pattern;
        this.increment = {};//patternData.increment;

        if ( typeof this.patternData.increment !== "undefined" )
        {
            for (var a = 0; a < this.patternData.increment.length; a++) {
                var inc = this.patternData.increment[a];

                //TODO test this increment that is a simple value...            
                if (typeof inc.constant !== "undefined") 
                {
                    inc.value = function () {
                        return this.constant;
                    };
                    inc.html = function() {
                        return this.constant;
                    };
                }
                else
                {
                    inc.expression = new Expression( inc.expression, this, null );
                    inc.value = function () {
                        return this.expression.value();
                    };
                    inc.html = function() {
                        return this.expression.html();
                    };
                }
                this.increment[ inc.name ] = inc;
            }
        }

        //TODO support multiple pattern pieces
        this.patternPiece1 = new PatternPiece( this.patternData.patternPiece[0], this );        
    }

    getIncrement(name) {
        if (typeof name === "object")
            return name;
        return this.increment[name];
    }

}