//(c) Copyright 2019 Jason Dore
//https://github.com/MrDoo71/PatternEditor

class Pattern {

    constructor (data, options ) {
        this.data = data;
        this.options = options;
        this.patternData = data.pattern;
        this.variable = {};
        this.measurement = {};
        this.units = this.patternData.units ? this.patternData.units : "cm";
        this.wallpapers = data.wallpaper;
        this.patternNumberAndName = ( this.patternData.patternNumber ? this.patternData.patternNumber + " ": "" ) + this.patternData.name;
        this.bounds = new Bounds();
        this.visibleBounds = new Bounds();

        if ( typeof this.patternData.measurement !== "undefined" )
        {
            for (var a = 0; a < this.patternData.measurement.length; a++) {
                var m = this.patternData.measurement[a];
                var measurementUnits = this.units;

                //TODO test this variable that is a simple value...            
                if (typeof m.value !== "undefined") 
                {
                    m.constant = m.value;
                    m.value = function () {
                        return this.constant; 
                    };
                    m.html = function() {
                        return this.name + ": " + this.constant + " " + this.units;
                    };                    
                }
                else
                {
                    m.expression = new Expression( m.expression, this, null );
                    m.value = function () {
                        return this.expression.value(); 
                    };
                    m.html = function(asFormula) {
                        return this.name + ": " + this.expression.html( asFormula );
                    };
                }
                this.measurement[ m.name ] = m;
                m.isMeasurement = true;
            }
        }        
        
        if ( typeof this.patternData.variable !== "undefined" )
        {
            //Register all variable before calculating their values in to deal with dependencies.
            for (var a = 0; a < this.patternData.variable.length; a++) {
                var v = this.patternData.variable[a];
                this.variable[ v.name ] = v;
                v.isVariable = true;
            }

            //Now the variable are all registered, calculate their values.
            for (var a = 0; a < this.patternData.variable.length; a++) { 
                var inc = this.patternData.variable[a];   
                //TODO test this variable that is a simple value...            
                if (typeof inc.constant !== "undefined") 
                {
                    inc.value = function () {
                        return this.constant;
                    };
                    inc.html = function() {
                        return this.name + ": " + this.constant + ( this.isOverridden ? " (custom)" : "" ) 
                    };
                }
                else
                {
                    inc.expression = new Expression( inc.expression, this, null );
                    inc.value = function () {
                        return this.expression.value();
                    };
                    inc.html = function(asFormula) {
                        return this.name + ": " + this.expression.html( asFormula ) + " = " + Number.parseFloat( this.value() ).toPrecision(4) ;
                    };
                }
            }
        }        

        this.patternPieces = [];
        for( var i=0; i<this.patternData.patternPiece.length; i++ )
        {
            this.patternPieces.push( new PatternDrawing( this.patternData.patternPiece[i], this ) );
        }   

        this.analyseDependencies();
    }


    //Return the pattern local equivalent of this number of mm
    getPatternEquivalentOfMM( mm )
    {
        return this.units === "mm" ? mm 
                                   : this.units === "cm" ? mm/10 
                                                         : mm/25.4;
    }


    analyseDependencies() {
        //Now build up dependency links
        this.dependencies = { 
            dependencies: [], 
            add: function ( source, target ) { 

                if (( ! source ) || ( ! target ))
                    return;

                if (   ( target && typeof target.expression === "object" )
                    && ( ! target.isMeasurement )
                    && ( ! target.isVariable ) )
                {
                    if ( target.expression.addDependencies )
                        target.expression.addDependencies( source, this );
                    else
                        console.log("Failed to add dependency for expression. Presumably due to earlier errors. "); //nb. the expression is likely the original data, not our expression object
                }
                else if (   ( target instanceof DrawingObject )
                         || ( target.isMeasurement )
                         || ( target.isIncrement ) 
                         || ( target.isVariable ) 
                         )
                    this.dependencies.push( { source: source, target: target } ); 
            }  
        };
        
        if ( this.variable )
        {
            for( var i in this.variable )
            {
                var v = this.variable[i];
                if ( v.expression ) 
                    v.expression.addDependencies( v, this.dependencies );
            }
        }    
    
        for( var j=0; j< this.patternPieces.length; j++ )
        {
            var piece = this.patternPieces[j];
            for (var a = 0; a < piece.drawingObjects.length; a++) 
            {
                var dObj = piece.drawingObjects[a];
                dObj.setDependencies( this.dependencies );
            }
        }
        //TODO use a d3.map of a d3.set when we build up the data and then convert it to an array
        //so that we can remove duplicates.
    }


    getVariable(name) {
        if (typeof name === "object")
            return name;
        return this.variable[name];
    }

    getMeasurement(name) {
        if (typeof name === "object")
            return name;
        var m = this.measurement[name];

        if ( !m )
            throw "Measurment not found:" + name;

        return m;
    }

    getObject( name )
    {
        for( var j=0; j< this.patternPieces.length; j++ )
        {
            var piece = this.patternPieces[j];
            var obj = piece.getObject( name, true /*restrict search to this piece*/ );
            if ( obj )
                return obj;
        }
        return null;
    }


    getDate() {
        const t = new Date();
        const date = ('0' + t.getDate()).slice(-2);
        const month = ('0' + (t.getMonth() + 1)).slice(-2);
        const year = t.getFullYear();
        return `${year}-${month}-${date}`;
    }
}